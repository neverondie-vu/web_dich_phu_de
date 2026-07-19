import json
import os
import shutil
import uuid
from datetime import datetime

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import models
from app.config import system_settings


ALLOWED_AUDIO_EXTENSIONS = {"mp3", "wav", "m4a"}
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_uploads_size_bytes() -> int:
    total = 0
    uploads_root = os.path.abspath(os.path.join(BASE_DIR, "uploads"))
    if not os.path.exists(uploads_root):
        return 0
    for root, _, files in os.walk(uploads_root):
        for filename in files:
            path = os.path.join(root, filename)
            try:
                total += os.path.getsize(path)
            except OSError:
                pass
    return total


def enforce_storage_limit(file_path: str) -> None:
    max_storage_gb = float(system_settings.get("max_storage_gb", 100) or 100)
    max_bytes = int(max_storage_gb * 1024 * 1024 * 1024)
    if get_uploads_size_bytes() <= max_bytes:
        return
    try:
        os.remove(file_path)
    except OSError:
        pass
    raise HTTPException(
        status_code=507,
        detail=f"Dung luong luu tru da vuot gioi han {max_storage_gb:g}GB. Vui long don dep hoac tang gioi han.",
    )


def get_upload_extension(filename: str, allowed_extensions: set[str]) -> str:
    extension = os.path.splitext(filename or "")[1].lower().lstrip(".")
    if extension not in allowed_extensions:
        allowed_text = ", ".join(f".{item}" for item in sorted(allowed_extensions))
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng file không được hỗ trợ. Chỉ chấp nhận: {allowed_text}",
        )
    return extension


def save_upload_file(file: UploadFile, upload_dir: str, job_id: str, allowed_extensions: set[str]) -> tuple[str, str]:
    safe_filename = os.path.basename(file.filename or f"{job_id}")
    file_extension = get_upload_extension(safe_filename, allowed_extensions)
    file_path = f"{upload_dir}/{job_id}.{file_extension}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    enforce_storage_limit(file_path)

    return safe_filename, file_path


def ensure_user_record(
    db: Session,
    user_id: str | None,
    email: str | None = None,
    username: str | None = None,
    role: str | None = None,
    plan: str | None = None,
):
    if not user_id:
        return None

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        user = models.User(
            id=user_id,
            email=email,
            username=username,
            role=role or "user",
            plan=plan or "free",
        )
        db.add(user)
        db.flush()
        return user

    changed = False
    if email and user.email != email:
        user.email = email
        changed = True
    if username and user.username != username:
        user.username = username
        changed = True
    if role and user.role != role:
        user.role = role
        changed = True
    if plan and user.plan != plan:
        user.plan = plan
        changed = True

    if changed:
        user.updated_at = datetime.utcnow()
        db.flush()
    return user


def create_media_file_record(
    db: Session,
    job_id: str,
    user_id: str | None,
    filename: str,
    media_type: str,
    src_language: str,
    file_path: str,
    mime_type: str | None,
):
    media_file = models.MediaFile(
        id=str(uuid.uuid4()),
        job_id=job_id,
        user_id=user_id,
        original_filename=filename,
        media_type=media_type,
        source_language=src_language,
        file_path=file_path,
        mime_type=mime_type,
    )
    db.add(media_file)
    return media_file


def log_processing_history(
    db: Session,
    job_id: str,
    user_id: str | None,
    action: str,
    status: str,
    message: str | None = None,
):
    db.add(
        models.ProcessingHistory(
            job_id=job_id,
            user_id=user_id,
            action=action,
            status=status,
            message=message,
        )
    )


def upsert_subtitle_record(
    db: Session,
    job_id: str,
    json_path: str | None,
    srt_path: str | None,
    segment_count: int,
):
    subtitle = db.query(models.Subtitle).filter(models.Subtitle.job_id == job_id).first()
    media_file = db.query(models.MediaFile).filter(models.MediaFile.job_id == job_id).first()
    if not subtitle:
        subtitle = models.Subtitle(
            id=str(uuid.uuid4()),
            job_id=job_id,
            media_file_id=media_file.id if media_file else None,
        )
        db.add(subtitle)

    subtitle.json_path = json_path
    subtitle.srt_path = srt_path
    subtitle.segment_count = segment_count
    subtitle.updated_at = datetime.utcnow()
    return subtitle


def subtitle_time_to_srt(value) -> str:
    return str(value).replace(".", ",")


def write_subtitle_files(job_id: str, subtitles_data: list) -> tuple[str, str]:
    json_path = f"uploads/subtitle/{job_id}.json"
    srt_path = f"uploads/subtitle/{job_id}.srt"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(subtitles_data, f, ensure_ascii=False)

    with open(srt_path, "w", encoding="utf-8") as f:
        for index, subtitle in enumerate(subtitles_data, start=1):
            f.write(f"{index}\n")
            f.write(
                f"{subtitle_time_to_srt(subtitle.get('start', ''))} --> "
                f"{subtitle_time_to_srt(subtitle.get('end', ''))}\n"
            )
            f.write(f"{subtitle.get('text', '')}\n\n")

    return json_path, srt_path


def is_audio_path(file_path: str | None) -> bool:
    if not file_path:
        return False
    extension = os.path.splitext(file_path)[1].lower().lstrip(".")
    return extension in ALLOWED_AUDIO_EXTENSIONS


def srt_download_filename(job, job_id: str) -> str:
    if job and job.filename:
        base_name = os.path.splitext(os.path.basename(job.filename))[0] or job_id
    else:
        base_name = job_id
    return f"PhuDe_{base_name}.srt"


def safe_print(*values):
    message = " ".join(str(value) for value in values)
    try:
        print(message)
    except UnicodeEncodeError:
        print(message.encode("ascii", "ignore").decode("ascii"))


def resolve_upload_path(file_path: str | None) -> str | None:
    if not file_path:
        return None

    uploads_roots = [
        os.path.abspath(os.path.join(BASE_DIR, "uploads")),
        os.path.abspath("uploads"),
    ]
    candidates = [file_path] if os.path.isabs(file_path) else [
        os.path.join(BASE_DIR, file_path),
        file_path,
    ]

    for candidate in candidates:
        absolute_path = os.path.abspath(candidate)
        if not any(
            absolute_path == root or absolute_path.startswith(root + os.sep)
            for root in uploads_roots
        ):
            continue
        if os.path.exists(absolute_path):
            return absolute_path

    return None


def remove_upload_file(file_path: str | None) -> bool:
    absolute_path = resolve_upload_path(file_path)
    if not absolute_path or not os.path.isfile(absolute_path):
        return False

    os.remove(absolute_path)
    return True


def delete_job_assets(job) -> int:
    candidate_paths = {
        job.original_video_path,
        job.hardsub_video_path,
        job.hardsub_video_path.rsplit(".", 1)[0] + "_dubbed.mp4" if job.hardsub_video_path else None,
        job.srt_path,
        f"uploads/subtitle/{job.id}.json",
        f"uploads/subtitle/{job.id}.srt",
        f"uploads/subtitle/{job.id}_temp.srt",
    }

    removed_count = 0
    for file_path in candidate_paths:
        if remove_upload_file(file_path):
            removed_count += 1

    return removed_count


def delete_job_database_records(db: Session, job) -> None:
    db.query(models.ProcessingHistory).filter(
        models.ProcessingHistory.job_id == job.id
    ).delete(synchronize_session=False)
    db.query(models.Subtitle).filter(
        models.Subtitle.job_id == job.id
    ).delete(synchronize_session=False)
    db.query(models.MediaFile).filter(
        models.MediaFile.job_id == job.id
    ).delete(synchronize_session=False)
    db.delete(job)
