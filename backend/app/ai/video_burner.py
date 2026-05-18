# app/ai/video_burner.py
import ffmpeg
import os

def burn_subtitles_hardsub(video_path: str, srt_path: str, pos_y: int, opacity: float) -> str:
    output_video_path = video_path.rsplit('.', 1)[0] + '_hardsub.mp4'
    print(f"6. Đang ép phụ đề cứng (Hardsub style) vào video: {output_video_path}...")

    # Chuyển đổi opacity sang định dạng Hex Alpha cho FFmpeg (00 là opaque, FF là transparent)
    alpha_hex = format(int((1 - opacity) * 255), '02x')
    bg_color_hex = f"&H{alpha_hex}000000" # &HAARRGGBB

    style_command = (
        f"subtitles={srt_path}:force_style='"
        f"BorderStyle=3,"
        f"OutlineColour={bg_color_hex},"
        f"Outline=1,"
        f"Shadow=0,"
        f"MarginV={pos_y}'"
    )

    try:
        (
            ffmpeg
            .input(video_path)
            .output(output_video_path, vf=style_command, acodec='copy')
            .overwrite_output()
            .run(quiet=True)
        )
        return output_video_path
    except ffmpeg.Error as e:
        print(f"Lỗi FFmpeg burn-in: {e.stderr.decode('utf-8') if e.stderr else str(e)}")
        raise e