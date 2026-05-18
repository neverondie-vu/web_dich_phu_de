# app/ai/srt_generator.py

def format_timestamp(seconds: float) -> str:
    """Chuyển đổi giây sang định dạng HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f'{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}'

def generate_srt(segments: list) -> str:
    """Tạo nội dung file SRT từ danh sách segment"""
    srt_lines = []
    for i, seg in enumerate(segments, 1):
        start = format_timestamp(seg['start'])
        end = format_timestamp(seg['end'])
        text = seg['text'].strip()
        
        srt_lines.append(f'{i}')
        srt_lines.append(f'{start} --> {end}')
        srt_lines.append(text)
        srt_lines.append('')  # Dòng trống để cách các đoạn
        
    return '\n'.join(srt_lines)