import os
import platform
import re
import asyncio
import subprocess
import threading
import time
import uuid

import requests


TTS_DIR = "uploads/tts"
DEFAULT_VOICES_BY_LANGUAGE = {
    "vi": "edge:vi-VN-NamMinhNeural",
    "en": "edge:en-US-GuyNeural",
    "zh": "edge:zh-CN-YunxiNeural",
    "ko": "edge:ko-KR-InJoonNeural",
    "ja": "edge:ja-JP-KeitaNeural",
}
EDGE_VOICE_FALLBACKS = {
    "vi-VN-NamMinhNeural": "vi-VN-HoaiMyNeural",
    "vi-VN-HoaiMyNeural": "vi-VN-NamMinhNeural",
    "zh-CN-YunxiNeural": "zh-CN-YunjianNeural",
    "zh-CN-YunjianNeural": "zh-CN-YunxiNeural",
}
ELEVENLABS_ADAM_VOICE_ID = "pNInz6obpgDQGcFmaJgB"


class TTSConfigurationError(RuntimeError):
    pass


def subtitle_time_to_seconds(value: str) -> float:
    parts = str(value or "0").replace(",", ".").split(":")
    try:
        if len(parts) == 3:
            hours, minutes, seconds = parts
            return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
        if len(parts) == 2:
            minutes, seconds = parts
            return int(minutes) * 60 + float(seconds)
        return float(parts[0])
    except (TypeError, ValueError):
        return 0.0


def safe_audio_basename(value: str | None = None) -> str:
    raw = value or str(uuid.uuid4())
    return re.sub(r"[^a-zA-Z0-9_-]", "_", raw).strip("_") or str(uuid.uuid4())


def rate_from_speed(speed: float) -> int:
    speed_value = float(speed)
    return max(-10, min(10, round((speed_value - 1) * 10)))


def resolve_voice_name(language: str, voice: str) -> str:
    return voice or DEFAULT_VOICES_BY_LANGUAGE.get(str(language or "").lower(), "")


def speed_to_edge_rate(speed: float) -> str:
    speed_value = float(speed)
    percent = max(-50, min(80, round((speed_value - 1) * 100)))
    return f"{percent:+d}%"


def clamp_number(value, default: float, minimum: float, maximum: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = default
    return max(minimum, min(maximum, number))


def parse_voice_provider(language: str, voice: str) -> tuple[str, str]:
    voice_name = resolve_voice_name(language, voice)
    if ":" not in voice_name:
        return "windows", voice_name
    provider, provider_voice = voice_name.split(":", 1)
    return provider.lower(), provider_voice


async def synthesize_text_to_edge_mp3_async(text: str, output_path: str, voice: str, speed: float) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text.strip(), voice=voice, rate=speed_to_edge_rate(speed))
    await communicate.save(output_path)


def synthesize_text_to_edge_mp3(text: str, output_path: str, voice: str, speed: float) -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    last_error = None
    candidate_voices = [voice]
    fallback_voice = EDGE_VOICE_FALLBACKS.get(voice)
    if fallback_voice:
        candidate_voices.append(fallback_voice)

    for candidate_voice in candidate_voices:
        for attempt in range(3):
            try:
                run_coroutine_blocking(synthesize_text_to_edge_mp3_async(text, output_path, candidate_voice, speed))
                return
            except Exception as exc:
                last_error = exc
                time.sleep(0.8 * (attempt + 1))
    raise last_error


def run_coroutine_blocking(coroutine) -> None:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(coroutine)
        return

    result = {"error": None}

    def runner():
        try:
            asyncio.run(coroutine)
        except Exception as exc:
            result["error"] = exc

    thread = threading.Thread(target=runner)
    thread.start()
    thread.join()
    if result["error"]:
        raise result["error"]


def synthesize_text_to_elevenlabs_mp3(text: str, output_path: str, voice: str, speed: float) -> None:
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        raise TTSConfigurationError("Giong Adam can ELEVENLABS_API_KEY trong backend/.env")

    voice_id = voice or ELEVENLABS_ADAM_VOICE_ID
    response = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={
            "xi-api-key": api_key,
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
        },
        json={
            "text": text.strip(),
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.75,
                "style": 0.35,
                "use_speaker_boost": True,
                "speed": max(0.7, min(1.2, float(speed))),
            },
        },
        timeout=90,
    )
    response.raise_for_status()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as audio_file:
        audio_file.write(response.content)


def synthesize_text_to_wav(text: str, output_path: str, voice: str = "", speed: float = 1.0) -> None:
    if platform.system().lower() != "windows":
        raise RuntimeError("Text-to-Speech mac dinh can Windows Speech API.")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    text_path = f"{output_path}.txt"
    script_path = f"{output_path}.ps1"
    with open(text_path, "w", encoding="utf-8") as text_file:
        text_file.write(text.strip())
    with open(script_path, "w", encoding="utf-8") as script_file:
        script_file.write(
            "\n".join(
                [
                    "param([string]$TextPath, [string]$OutputPath, [string]$VoiceName, [int]$Rate)",
                    "$ErrorActionPreference = 'Stop'",
                    "Add-Type -AssemblyName System.Speech",
                    "$Text = Get-Content -Raw -Encoding UTF8 $TextPath",
                    "$Synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
                    "if ($VoiceName) { try { $Synth.SelectVoice($VoiceName) } catch {} }",
                    "$Synth.Rate = $Rate",
                    "$Synth.Volume = 100",
                    "$Synth.SetOutputToWaveFile($OutputPath)",
                    "$Synth.Speak($Text)",
                    "$Synth.Dispose()",
                ]
            )
        )

    try:
        subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                script_path,
                text_path,
                output_path,
                voice,
                str(rate_from_speed(speed)),
            ],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
    finally:
        for temp_path in (text_path, script_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


def synthesize_text(text: str, output_path: str, language: str, voice: str, speed: float) -> str:
    provider, provider_voice = parse_voice_provider(language, voice)
    if provider == "edge":
        synthesize_text_to_edge_mp3(text, output_path, provider_voice, speed)
        return "audio/mpeg"
    if provider == "elevenlabs":
        synthesize_text_to_elevenlabs_mp3(text, output_path, provider_voice or ELEVENLABS_ADAM_VOICE_ID, speed)
        return "audio/mpeg"
    synthesize_text_to_wav(text, output_path, provider_voice, speed)
    return "audio/wav"


def build_speaker_config(
    speaker: str,
    voice_config: dict | None,
    default_voice: str,
    default_speed: float,
    default_pitch: float,
    default_volume: float,
) -> dict:
    config = (voice_config or {}).get(speaker) or {}
    if not config:
        if speaker == "B":
            return {
                "voice": default_voice,
                "speed": clamp_number(default_speed * 0.98, 0.98, 0.5, 1.8),
                "pitch": 1.2,
                "volume": 1.0,
            }
        return {
            "voice": default_voice,
            "speed": clamp_number(default_speed * 0.94, 0.94, 0.5, 1.8),
            "pitch": -0.5,
            "volume": 1.0,
        }
    return {
        "voice": config.get("voice") or default_voice,
        "speed": clamp_number(config.get("speed"), default_speed, 0.5, 1.8),
        "pitch": clamp_number(config.get("pitch"), default_pitch, -12, 12),
        "volume": clamp_number(config.get("volume"), default_volume, 0.3, 2.0),
    }


def ffmpeg_atempo_filters(speed: float) -> list[str]:
    remaining = clamp_number(speed, 1.0, 0.5, 1.8)
    filters = []
    while remaining > 2.0:
        filters.append("atempo=2.0")
        remaining /= 2.0
    while remaining < 0.5:
        filters.append("atempo=0.5")
        remaining /= 0.5
    filters.append(f"atempo={remaining:.4f}")
    return filters


def postprocess_audio(input_path: str, output_path: str, speed: float, pitch: float, volume: float) -> None:
    speed_value = clamp_number(speed, 1.0, 0.5, 1.8)
    pitch_value = clamp_number(pitch, 0.0, -12, 12)
    volume_value = clamp_number(volume, 1.0, 0.3, 2.0)

    if abs(speed_value - 1.0) < 0.001 and abs(pitch_value) < 0.001 and abs(volume_value - 1.0) < 0.001:
        os.replace(input_path, output_path)
        return

    filters = []
    if abs(pitch_value) >= 0.001:
        pitch_factor = 2 ** (pitch_value / 12)
        filters.extend([
            f"asetrate=44100*{pitch_factor:.6f}",
            "aresample=44100",
            f"atempo={1 / pitch_factor:.6f}",
        ])
    filters.extend(ffmpeg_atempo_filters(speed_value))
    if abs(volume_value - 1.0) >= 0.001:
        filters.append(f"volume={volume_value:.4f}")

    command = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-af",
        ",".join(filters),
        "-codec:a",
        "libmp3lame" if output_path.lower().endswith(".mp3") else "pcm_s16le",
        output_path,
    ]
    subprocess.run(command, check=True, capture_output=True, text=True, encoding="utf-8")
    try:
        os.remove(input_path)
    except OSError:
        pass


def synthesize_segments(
    subtitles: list[dict],
    job_id: str | None,
    language: str,
    voice: str,
    speed: float,
    selected_indexes: list[int] | None = None,
    pitch: float = 0.0,
    volume: float = 1.0,
    voice_config: dict | None = None,
) -> list[dict]:
    os.makedirs(TTS_DIR, exist_ok=True)
    base_name = safe_audio_basename(job_id)
    selected = set(selected_indexes or [])
    source = [
        (index, item)
        for index, item in enumerate(subtitles)
        if item.get("text", "").strip() and (not selected or index in selected)
    ]
    if not source:
        raise ValueError("Khong co doan phu de nao co noi dung de tao giong doc.")

    results = []
    provider, _ = parse_voice_provider(language, voice)
    extension = "mp3" if provider in {"edge", "elevenlabs"} else "wav"
    for index, item in source:
        speaker = item.get("speaker") or "A"
        config = build_speaker_config(speaker, voice_config, voice, speed, pitch, volume)
        provider, _ = parse_voice_provider(language, config["voice"])
        extension = "mp3" if provider in {"edge", "elevenlabs"} else "wav"
        output_path = os.path.join(TTS_DIR, f"{base_name}_{index + 1}_{uuid.uuid4().hex[:8]}.{extension}")
        raw_output_path = os.path.join(TTS_DIR, f"{base_name}_{index + 1}_{uuid.uuid4().hex[:8]}_raw.{extension}")
        media_type = synthesize_text(item["text"], raw_output_path, language, config["voice"], 1.0)
        postprocess_audio(raw_output_path, output_path, config["speed"], config["pitch"], config["volume"])
        results.append({
            "index": index,
            "start": item.get("start"),
            "end": item.get("end"),
            "speaker": speaker,
            "path": output_path,
            "media_type": media_type,
            "url": f"/api/tts/audio/{os.path.basename(output_path)}",
        })
    return results


def synthesize_full_narration(
    subtitles: list[dict],
    job_id: str | None,
    language: str,
    voice: str,
    speed: float,
    pitch: float = 0.0,
    volume: float = 1.0,
    voice_config: dict | None = None,
) -> str:
    if not any(item.get("text", "").strip() for item in subtitles):
        raise ValueError("Khong co noi dung phu de de tao giong doc.")

    segments = synthesize_segments(subtitles, job_id, language, voice, speed, [], pitch, volume, voice_config)
    return combine_segments_on_timeline(segments, subtitles, job_id)


def combine_segments_on_timeline(segments: list[dict], subtitles: list[dict], job_id: str | None) -> str:
    if not segments:
        raise ValueError("Khong co audio de ghep.")

    base_name = safe_audio_basename(job_id)
    total_seconds = max(subtitle_time_to_seconds(item.get("end")) for item in subtitles) + 0.5
    output_path = os.path.join(TTS_DIR, f"{base_name}_full_{uuid.uuid4().hex[:8]}.mp3")
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"anullsrc=channel_layout=stereo:sample_rate=44100:d={max(total_seconds, 0.5)}",
    ]
    for segment in segments:
        command.extend(["-i", segment["path"]])

    filters = []
    mix_inputs = ["[0:a]"]
    for input_index, segment in enumerate(segments, start=1):
        delay_ms = max(0, round(subtitle_time_to_seconds(segment.get("start")) * 1000))
        label = f"a{input_index}"
        filters.append(f"[{input_index}:a]adelay={delay_ms}|{delay_ms}[{label}]")
        mix_inputs.append(f"[{label}]")

    filters.append(f"{''.join(mix_inputs)}amix=inputs={len(mix_inputs)}:normalize=0:dropout_transition=0[out]")
    command.extend(["-filter_complex", ";".join(filters), "-map", "[out]", "-codec:a", "libmp3lame", output_path])
    subprocess.run(command, check=True, capture_output=True, text=True, encoding="utf-8")
    return output_path
