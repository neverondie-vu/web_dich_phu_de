import os
import re
import subprocess

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


def _video_size(video_path: str) -> tuple[int | None, int | None]:
    try:
        probe = ffmpeg.probe(video_path)
    except ffmpeg.Error:
        return None, None

    for stream in probe.get("streams", []):
        if stream.get("codec_type") == "video":
            try:
                width = int(stream.get("width") or 0) or None
                height = int(stream.get("height") or 0) or None
                return width, height
            except (TypeError, ValueError):
                return None, None
    return None, None


def _subtitle_margin_v(video_path: str, pos_y: int, position_percent: float | None) -> int:
    if position_percent is None:
        return max(5, int(pos_y))

    _, height = _video_size(video_path)
    if not height:
        return max(5, int(pos_y))

    percent = max(2.0, min(45.0, float(position_percent)))
    return max(5, round(height * percent / 100))


def _format_ass_time(srt_time: str) -> str:
    match = re.match(r"(\d+):(\d{2}):(\d{2})[,.](\d{1,3})", srt_time.strip())
    if not match:
        return "0:00:00.00"

    hours, minutes, seconds, millis = match.groups()
    centiseconds = round(int(millis.ljust(3, "0")[:3]) / 10)
    seconds_int = int(seconds)
    minutes_int = int(minutes)
    hours_int = int(hours)
    if centiseconds >= 100:
        centiseconds = 0
        seconds_int += 1
    if seconds_int >= 60:
        seconds_int = 0
        minutes_int += 1
    if minutes_int >= 60:
        minutes_int = 0
        hours_int += 1

    return f"{hours_int}:{minutes_int:02d}:{seconds_int:02d}.{centiseconds:02d}"


def _escape_ass_text(text: str) -> str:
    return (
        text.replace("\\", r"\\")
        .replace("{", r"\{")
        .replace("}", r"\}")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .replace("\n", r"\N")
    )


def _read_srt_events(srt_path: str) -> list[tuple[str, str, str]]:
    with open(srt_path, "r", encoding="utf-8-sig") as source:
        content = source.read().replace("\r\n", "\n").replace("\r", "\n").strip()

    events: list[tuple[str, str, str]] = []
    for block in re.split(r"\n\s*\n", content):
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        if not lines:
            continue
        if lines[0].isdigit():
            lines = lines[1:]
        if not lines or "-->" not in lines[0]:
            continue

        timing = lines[0].split("-->", 1)
        start = _format_ass_time(timing[0])
        end = _format_ass_time(timing[1].split()[0])
        text = _escape_ass_text("\n".join(lines[1:]))
        if text:
            events.append((start, end, text))

    return events


def _write_ass_subtitles(
    video_path: str,
    srt_path: str,
    ass_path: str,
    margin_v: int,
    opacity: float,
    background_color: str,
    text_color: str,
    font_size: int,
    font_family: str,
) -> None:
    width, height = _video_size(video_path)
    play_res_x = width or 1280
    play_res_y = height or 720
    alpha_hex = format(int((1 - opacity) * 255), "02x")
    bg_color_hex = _ass_color(background_color, alpha_hex)
    text_color_hex = _ass_color(text_color)
    events = _read_srt_events(srt_path)

    with open(ass_path, "w", encoding="utf-8") as target:
        target.write(
            "[Script Info]\n"
            "ScriptType: v4.00+\n"
            f"PlayResX: {play_res_x}\n"
            f"PlayResY: {play_res_y}\n"
            "ScaledBorderAndShadow: yes\n\n"
            "[V4+ Styles]\n"
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
            "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, "
            "Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
            f"Style: Default,{font_family},{font_size},{text_color_hex},&H000000FF,{bg_color_hex},{bg_color_hex},"
            f"0,0,0,0,100,100,0,0,3,1,0,2,24,24,{margin_v},1\n\n"
            "[Events]\n"
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
        )
        for start, end, text in events:
            target.write(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}\n")


def burn_subtitles_hardsub(
    video_path: str,
    srt_path: str,
    pos_y: int,
    opacity: float,
    background_color: str = "#000000",
    text_color: str = "#ffffff",
    font_size: int = 24,
    font_family: str = "Arial",
    subtitle_position_percent: float | None = None,
) -> str:
    output_video_path = video_path.rsplit(".", 1)[0] + "_hardsub.mp4"
    print(f"Rendering hard subtitles to: {output_video_path}...")

    margin_v = _subtitle_margin_v(video_path, pos_y, subtitle_position_percent)
    ass_path = srt_path.rsplit(".", 1)[0] + "_render.ass"
    _write_ass_subtitles(
        video_path,
        srt_path,
        ass_path,
        margin_v,
        opacity,
        background_color,
        text_color,
        font_size,
        font_family,
    )
    style_command = f"subtitles={ass_path}"

    try:
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
    finally:
        if os.path.exists(ass_path):
            os.remove(ass_path)


def mux_voiceover_to_video(
    video_path: str,
    voiceover_path: str,
    output_video_path: str,
    keep_original_audio: bool = True,
    reduce_original_voice: bool = False,
    original_volume: float = 0.28,
    voice_volume: float = 1.0,
) -> str:
    command = ["ffmpeg", "-y", "-i", video_path, "-i", voiceover_path]
    if keep_original_audio:
        if reduce_original_voice:
            original_filter = (
                f"[0:a]pan=stereo|c0=0.5*c0-0.5*c1|c1=0.5*c1-0.5*c0,"
                f"volume={original_volume:.3f}[a0]"
            )
        else:
            original_filter = f"[0:a]volume={original_volume:.3f}[a0]"
        filter_complex = (
            f"{original_filter};"
            f"[1:a]volume={voice_volume:.3f}[a1];"
            "[a0][a1]amix=inputs=2:normalize=0:duration=longest[aout]"
        )
        command.extend([
            "-filter_complex",
            filter_complex,
            "-map",
            "0:v:0",
            "-map",
            "[aout]",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-shortest",
            output_video_path,
        ])
    else:
        command.extend([
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-shortest",
            output_video_path,
        ])

    subprocess.run(command, check=True, capture_output=True, text=True, encoding="utf-8")
    return output_video_path
