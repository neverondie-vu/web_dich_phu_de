# app/ai/subtitle_pipeline.py
import whisper
import ffmpeg
import os
import re
from threading import Lock

import torch

from .nllb_handler import translate_batch_to_vietnamese
from .srt_generator import generate_srt
from .llm_refiner import refine_subtitle_with_gemini
from .video_burner import burn_subtitles_hardsub

_whisper_models = {}
_whisper_lock = Lock()


def get_whisper_model(model_name: str):
    """Load each Whisper model once and reuse it for later jobs."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    cache_key = (model_name, device)
    with _whisper_lock:
        if cache_key not in _whisper_models:
            print(f"Loading Whisper {model_name} on {device}...")
            _whisper_models[cache_key] = whisper.load_model(model_name, device=device)
        return _whisper_models[cache_key], device


def parse_srt_to_list(srt_string: str) -> list:
    """
    Hàm phụ trợ: Phân tích chuỗi SRT do Gemini trả về thành danh sách mảng JSON cho Frontend.
    Đồng thời tự động loại bỏ các câu giao tiếp thừa của AI (nếu có).
    """
    results = []
    # Tách các khối bằng dấu xuống dòng kép
    blocks = re.split(r'\n\s*\n', srt_string.strip())
    
    for block in blocks:
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        # Một khối SRT hợp lệ phải có ít nhất 3 dòng: Số thứ tự, Timecode, Nội dung
        if len(lines) >= 3 and re.match(r'^\d+$', lines[0]) and ' --> ' in lines[1]:
            timecodes = lines[1].split(' --> ')
            if len(timecodes) == 2:
                # Đổi dấu phẩy SRT thành dấu chấm để đồng bộ với định dạng Frontend
                start_time = timecodes[0].replace(',', '.')
                end_time = timecodes[1].replace(',', '.')
                text = '\n'.join(lines[2:])
                
                results.append({
                    "start": start_time,
                    "end": end_time,
                    "text": text
                })
    return results

# ====================================================
# GIAI ĐOẠN 1: TÁCH CHỮ TỪ VIDEO (KHÔNG ÉP HARD SUB)
# ====================================================
def extract_subtitles_from_video(input_path: str, src_language: str, whisper_model: str = "small") -> list:
    """Pipeline Giai đoạn 1: Video/Audio -> Dịch NLLB -> Làm mượt bằng Gemini -> Trả về mảng JSON"""
    print(f"Bắt đầu trích xuất phụ đề từ file: {input_path}")
    
    # 1. Trích xuất audio
    audio_path = input_path.rsplit('.', 1)[0] + '_whisper.wav'
    print("1. Đang trích xuất âm thanh...")
    (
        ffmpeg
        .input(input_path)
        .output(audio_path, vn=None, acodec='pcm_s16le', ar=16000, ac=1)
        .overwrite_output()
        .run(quiet=True)
    )

    # 2. Nhận diện giọng nói
    print("2. Đang nhận diện giọng nói (Whisper)...")
    model, whisper_device = get_whisper_model(whisper_model)
    result = model.transcribe(
        audio_path,
        language=src_language,
        verbose=False,
        fp16=whisper_device == "cuda",
    )

    # 3. Dịch thuật thô bằng NLLB
    print("3. Đang dịch thô sang tiếng Việt...")
    lang_map = {
        'en': 'eng_Latn', 'zh': 'zho_Hans',
        'ko': 'kor_Hang', 'ja': 'jpn_Jpan',
        'vi': 'vie_Latn' # Nếu video tiếng Việt sẵn
    }
    nllb_src = lang_map.get(src_language, 'eng_Latn')

    segments = result["segments"]
    batch_size = max(1, int(os.getenv("NLLB_BATCH_SIZE", "8")))
    translated_segments = []
    for start in range(0, len(segments), batch_size):
        batch = segments[start:start + batch_size]
        translated_texts = translate_batch_to_vietnamese(
            [seg["text"] for seg in batch],
            nllb_src,
        )
        translated_segments.extend(
            {
                "start": seg["start"],
                "end": seg["end"],
                "text": translated_text,
            }
            for seg, translated_text in zip(batch, translated_texts)
        )

    # 4. Tạo SRT thô
    print("4. Đang tạo định dạng SRT thô...")
    raw_srt_content = generate_srt(translated_segments)
    
    # 5. Đưa qua Gemini để làm mượt (Refinement)
    print("5. Đang xử lý ngôn ngữ tự nhiên (Gemini AI)...")
    refined_srt_content = refine_subtitle_with_gemini(raw_srt_content)
    
    # 6. Chuyển chuỗi SRT thành mảng Dict cho Web nhận diện
    final_json_list = parse_srt_to_list(refined_srt_content)
    
    # === DỌN DẸP FILE RÁC ÂM THANH ===
    if os.path.exists(audio_path):
        os.remove(audio_path)
        
    print("Giai đoạn 1 hoàn tất! Đã sẵn sàng hiển thị lên Editor.")
    
    # Trả về danh sách mảng cho Frontend hiển thị
    return final_json_list

# ====================================================
# GIAI ĐOẠN 2: ÉP PHỤ ĐỀ (ĐÃ QUA CHỈNH SỬA) VÀO VIDEO
# ====================================================
def burn_subtitles_to_video(
    input_path: str,
    subtitles_list: list,
    pos_y: int,
    opacity: float,
    background_color: str,
    text_color: str,
    font_size: int,
    font_family: str,
) -> str:
    """Pipeline Giai đoạn 2: Nhận list phụ đề (từ Frontend) -> Tạo file SRT tạm -> Gọi FFmpeg ép vào Video"""
    print(f"Bắt đầu ép phụ đề (Hardsub) cho file: {input_path}")
    
    job_id = os.path.basename(input_path).split('.')[0]
    temp_srt_path = f"uploads/subtitle/{job_id}_temp.srt"
    
    # 1. Chuyển đổi List (từ Frontend) sang định dạng file .SRT chuẩn cho FFmpeg
    with open(temp_srt_path, "w", encoding="utf-8") as f:
        for i, sub in enumerate(subtitles_list):
            # FFmpeg SRT bắt buộc phải dùng dấu phẩy (,) phân cách mili-giây
            start_srt = sub['start'].replace('.', ',')
            end_srt = sub['end'].replace('.', ',')
            
            f.write(f"{i+1}\n")
            f.write(f"{start_srt} --> {end_srt}\n")
            f.write(f"{sub['text']}\n\n")

    # 2. Gọi FFmpeg "đốt" phụ đề vào video (gọi class video_burner của bạn)
    print("Đang chạy tiến trình FFmpeg Render...")
    final_video_path = burn_subtitles_hardsub(
        input_path,
        temp_srt_path,
        pos_y,
        opacity,
        background_color,
        text_color,
        font_size,
        font_family,
    )
    
    # 3. Dọn dẹp file SRT tạm sau khi ép xong
    if os.path.exists(temp_srt_path):
        os.remove(temp_srt_path)
        
    print("Hoàn thành toàn bộ quy trình! Video đã sẵn sàng để tải xuống.")
    
    # Trả về đường dẫn của file video đã có phụ đề cứng
    return final_video_path
