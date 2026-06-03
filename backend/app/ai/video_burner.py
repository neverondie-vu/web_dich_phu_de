import os

import ffmpeg


def _render_video(video_path: str, output_video_path: str, style_command: str, encoder: str):
    output_args = {
        "vf": style_command,
        "acodec": "copy",
        "vcodec": encoder,
    }
    if encoder == "h264_nvenc":
        output_args.update({"preset": "p4", "cq": 23})

    (
        ffmpeg
        .input(video_path)
        .output(output_video_path, **output_args)
        .overwrite_output()
        .run(quiet=True)
    )


def _ass_color(hex_color: str, alpha_hex: str = "00") -> str:
    value = hex_color.lstrip("#")
    red, green, blue = value[0:2], value[2:4], value[4:6]
    return f"&H{alpha_hex}{blue}{green}{red}"


def burn_subtitles_hardsub(
    video_path: str,
    srt_path: str,
    pos_y: int,
    opacity: float,
    background_color: str = "#000000",
    text_color: str = "#ffffff",
    font_size: int = 24,
    font_family: str = "Arial",
) -> str:
    output_video_path = video_path.rsplit(".", 1)[0] + "_hardsub.mp4"
    print(f"Rendering hard subtitles to: {output_video_path}...")

    alpha_hex = format(int((1 - opacity) * 255), "02x")
    bg_color_hex = _ass_color(background_color, alpha_hex)
    text_color_hex = _ass_color(text_color)
    style_command = (
        f"subtitles={srt_path}:force_style='"
        f"BorderStyle=3,"
        f"PrimaryColour={text_color_hex},"
        f"OutlineColour={bg_color_hex},"
        f"FontName={font_family},"
        f"FontSize={font_size},"
        f"Outline=1,"
        f"Shadow=0,"
        f"MarginV={pos_y}'"
    )

    if os.getenv("USE_NVENC", "1") == "1":
        try:
            print("Rendering with NVIDIA NVENC...")
            _render_video(video_path, output_video_path, style_command, "h264_nvenc")
            return output_video_path
        except ffmpeg.Error:
            print("NVENC unavailable. Falling back to CPU rendering.")

    try:
        _render_video(video_path, output_video_path, style_command, "libx264")
        return output_video_path
    except ffmpeg.Error as e:
        message = e.stderr.decode("utf-8") if e.stderr else str(e)
        print(f"FFmpeg burn-in error: {message}")
        raise
