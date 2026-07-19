import glob
import mimetypes
import os
import re
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
import yt_dlp

from app import models
from app.ai.creative_writer import rewrite_subtitle_script
from app.ai.subtitle_pipeline import add_voiceover_to_video, burn_subtitles_to_video, extract_subtitles_from_video
from app.config import system_settings
from app.database import SessionLocal
from app.services.media_storage import create_media_file_record, log_processing_history, safe_print, upsert_subtitle_record, write_subtitle_files
from app.services.tts_service import synthesize_full_narration


ALLOWED_LINK_HOSTS = ("bilibili.com", "b23.tv", "youtube.com", "youtu.be", "vimeo.com")
BILIBILI_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Referer": "https://www.bilibili.com/",
    "Origin": "https://www.bilibili.com",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


def validate_video_url(url: str) -> str:
    try:
        parsed = urlparse(url.strip())
    except ValueError as exc:
        raise ValueError("Liên kết video không hợp lệ") from exc
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Liên kết phải bắt đầu bằng http:// hoặc https://")
    host = parsed.hostname.lower().rstrip(".")
    if not any(host == allowed or host.endswith("." + allowed) for allowed in ALLOWED_LINK_HOSTS):
        raise ValueError("Chỉ hỗ trợ Bilibili, YouTube và Vimeo")
    return parsed.geturl()


def _set_stage(db, job_id: str, stage: str, message: str | None = None) -> models.VideoJob:
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise RuntimeError("Không tìm thấy job tự động")
    job.status = stage
    log_processing_history(db, job_id, job.user_id, stage, "processing", message)
    db.commit()
    return job


def _download_bilibili(url: str, job_id: str, max_seconds: int, max_bytes: int) -> tuple[str, str, dict]:
    session = requests.Session()
    session.headers.update(BILIBILI_HEADERS)
    if urlparse(url).hostname.lower().endswith("b23.tv"):
        resolved = session.get(url, timeout=20, allow_redirects=True)
        resolved.raise_for_status()
        url = resolved.url

    bvid_match = re.search(r"BV[a-zA-Z0-9]+", url, flags=re.IGNORECASE)
    if not bvid_match:
        raise ValueError("Không tìm thấy mã BV trong link Bilibili")
    bvid = bvid_match.group(0)
    page_match = re.search(r"[?&]p=(\d+)", url)
    page_number = max(1, int(page_match.group(1))) if page_match else 1
    video_headers = {**BILIBILI_HEADERS, "Referer": f"https://www.bilibili.com/video/{bvid}/"}

    view_response = session.get(
        "https://api.bilibili.com/x/web-interface/view",
        params={"bvid": bvid},
        headers=video_headers,
        timeout=25,
    )
    view_response.raise_for_status()
    view_payload = view_response.json()
    if view_payload.get("code") != 0 or not view_payload.get("data"):
        raise RuntimeError(view_payload.get("message") or "Bilibili không trả về thông tin video")
    info = view_payload["data"]
    duration = int(info.get("duration") or 0)
    if duration and duration > max_seconds:
        raise ValueError(f"Video dài quá giới hạn {max_seconds // 60} phút")

    pages = info.get("pages") or []
    if page_number > len(pages):
        raise ValueError("Số phần video Bilibili không tồn tại")
    cid = pages[page_number - 1].get("cid") if pages else info.get("cid")
    play_response = session.get(
        "https://api.bilibili.com/x/player/playurl",
        params={"bvid": bvid, "cid": cid, "qn": 80, "fnval": 1, "fourk": 0},
        headers=video_headers,
        timeout=25,
    )
    play_response.raise_for_status()
    play_payload = play_response.json()
    play_data = play_payload.get("data") or {}
    streams = play_data.get("durl") or []
    if play_payload.get("code") != 0 or not streams:
        raise RuntimeError(play_payload.get("message") or "Bilibili không cung cấp luồng video công khai")
    if len(streams) != 1:
        raise RuntimeError("Video Bilibili nhiều phân đoạn chưa được hỗ trợ")

    stream = streams[0]
    expected_size = int(stream.get("size") or 0)
    if expected_size and expected_size > max_bytes:
        raise ValueError("Video vượt quá giới hạn dung lượng của hệ thống")
    file_path = os.path.abspath(f"uploads/video/{job_id}.mp4")
    stream_urls = [stream.get("url"), *(stream.get("backup_url") or [])]
    last_error = None
    for stream_url in filter(None, stream_urls):
        for attempt in range(4):
            try:
                written = os.path.getsize(file_path) if os.path.exists(file_path) else 0
                request_headers = dict(video_headers)
                if written:
                    request_headers["Range"] = f"bytes={written}-"
                with session.get(stream_url, headers=request_headers, stream=True, timeout=(20, 120)) as response:
                    response.raise_for_status()
                    if written and response.status_code != 206:
                        written = 0
                    mode = "ab" if written and response.status_code == 206 else "wb"
                    with open(file_path, mode) as target:
                        for chunk in response.iter_content(chunk_size=512 * 1024):
                            if not chunk:
                                continue
                            written += len(chunk)
                            if written > max_bytes:
                                raise ValueError("Video vượt quá giới hạn dung lượng của hệ thống")
                            target.write(chunk)
                if written > 0 and (not expected_size or written >= expected_size * 0.95):
                    title = str(info.get("title") or bvid).strip()
                    safe_title = "".join(char for char in title if char not in '<>:"/\\|?*').strip()[:180] or bvid
                    return file_path, safe_title + ".mp4", info
            except ValueError:
                raise
            except Exception as exc:
                last_error = exc
                time.sleep(1.5 * (attempt + 1))
        if os.path.exists(file_path):
            os.remove(file_path)
    raise RuntimeError(f"Không tải được luồng video Bilibili: {last_error}")


def _download_video(url: str, job_id: str) -> tuple[str, str, dict]:
    os.makedirs("uploads/video", exist_ok=True)
    output_template = os.path.abspath(f"uploads/video/{job_id}.%(ext)s")
    max_seconds = int(os.getenv("MAX_LINK_VIDEO_SECONDS", "1800"))
    max_bytes = int(os.getenv("MAX_LINK_VIDEO_BYTES", str(1_500 * 1024 * 1024)))
    host = (urlparse(url).hostname or "").lower()
    if host == "b23.tv" or host.endswith(".b23.tv") or host == "bilibili.com" or host.endswith(".bilibili.com"):
        return _download_bilibili(url, job_id, max_seconds, max_bytes)

    options = {
        "outtmpl": output_template,
        "format": "bv*[height<=1080]+ba/b[height<=1080]/best[height<=1080]",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "restrictfilenames": True,
        "impersonate": "chrome",
        "http_headers": {
            "Accept-Language": "en-US,en;q=0.9",
        },
    }

    with yt_dlp.YoutubeDL(options) as downloader:
        info = downloader.extract_info(url, download=False)
        duration = int(info.get("duration") or 0)
        if duration and duration > max_seconds:
            raise ValueError(f"Video dài quá giới hạn {max_seconds // 60} phút")
        downloader.download([url])

    candidates = [
        path for path in glob.glob(os.path.abspath(f"uploads/video/{job_id}.*"))
        if not path.endswith((".part", ".ytdl", ".json"))
    ]
    if not candidates:
        raise RuntimeError("Không tìm thấy video sau khi tải")
    file_path = max(candidates, key=os.path.getmtime)
    if os.path.getsize(file_path) > max_bytes:
        os.remove(file_path)
        raise ValueError("Video vượt quá giới hạn dung lượng của hệ thống")

    extension = Path(file_path).suffix.lower() or ".mp4"
    title = str(info.get("title") or f"video-{job_id}").strip()
    safe_title = "".join(char for char in title if char not in '<>:"/\\|?*').strip()[:180] or f"video-{job_id}"
    return file_path, safe_title + extension, info


def run_link_automation(job_id: str, url: str, src_language: str, tone: str, voice: str, reduce_original_voice: bool):
    db = SessionLocal()
    try:
        job = _set_stage(db, job_id, "downloading", "Đang tải video nguồn")
        if job.original_video_path and os.path.exists(job.original_video_path) and os.path.getsize(job.original_video_path) > 1024 * 1024:
            file_path, filename = job.original_video_path, job.filename
            log_processing_history(db, job_id, job.user_id, "download", "completed", "Tái sử dụng video đã tải")
            db.commit()
        else:
            file_path, filename, _ = _download_video(url, job_id)
            job.original_video_path = file_path
            job.filename = filename
            create_media_file_record(db, job_id, job.user_id, filename, "video", src_language, file_path, mimetypes.guess_type(file_path)[0] or "video/mp4")
            log_processing_history(db, job_id, job.user_id, "download", "completed")
            db.commit()

        _set_stage(db, job_id, "transcribing", "Đang nhận diện và dịch phụ đề")
        subtitles = extract_subtitles_from_video(
            file_path,
            src_language,
            whisper_model=system_settings.get("whisper_model", "small"),
            translation_provider=system_settings.get("translation_provider", "nllb"),
        )
        if not subtitles:
            raise RuntimeError("Không nhận diện được lời thoại trong video")

        _set_stage(db, job_id, "rewriting", "Gemini đang viết lại kịch bản")
        subtitles = rewrite_subtitle_script(subtitles, tone)
        json_path, srt_path = write_subtitle_files(job_id, subtitles)
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        job.srt_path = srt_path
        upsert_subtitle_record(db, job_id, json_path, srt_path, len(subtitles))
        log_processing_history(db, job_id, job.user_id, "rewrite_script", "completed")
        db.commit()

        _set_stage(db, job_id, "rendering", "Đang tạo phụ đề, giọng đọc và render video")
        hardsub_path = burn_subtitles_to_video(file_path, subtitles, 20, 0.78, "#000000", "#ffffff", 24, "Arial", 8.0)
        voiceover_path = synthesize_full_narration(subtitles, f"{job_id}_auto", "vi", voice, 1.0, 0.0, 1.0)
        add_voiceover_to_video(hardsub_path, voiceover_path, reduce_original_voice=reduce_original_voice)

        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        job.hardsub_video_path = hardsub_path
        job.status = "completed"
        log_processing_history(db, job_id, job.user_id, "automated_video", "completed")
        db.commit()
    except Exception as exc:
        safe_print(f"[{job_id}] Link automation failed: {exc}")
        db.rollback()
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = "failed"
            log_processing_history(db, job_id, job.user_id, "automated_video", "failed", str(exc))
            db.commit()
    finally:
        db.close()
