import asyncio
from datetime import datetime, timedelta

from app import models
from app.ai.subtitle_pipeline import burn_subtitles_to_video, extract_subtitles_from_video
from app.config import system_settings
from app.database import SessionLocal
from app.services.media_storage import (
    delete_job_assets,
    delete_job_database_records,
    log_processing_history,
    safe_print,
    upsert_subtitle_record,
    write_subtitle_files,
)


def extract_subtitles_task(file_path: str, src_language: str, job_id: str, final_status: str = "transcribed"):
    db = SessionLocal()
    try:
        safe_print(f"[{job_id}] Đang phân tích âm thanh và tách chữ...")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            log_processing_history(db, job_id, job.user_id, "extract_subtitles", "processing")
            db.commit()

        subtitles_data = extract_subtitles_from_video(
            file_path,
            src_language,
            whisper_model=system_settings.get("whisper_model", "small"),
        )
        json_path, srt_path = write_subtitle_files(job_id, subtitles_data)
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = final_status
            job.srt_path = srt_path
            upsert_subtitle_record(db, job_id, json_path, srt_path, len(subtitles_data))
            log_processing_history(db, job_id, job.user_id, "extract_subtitles", "completed")
            db.commit()
    except Exception as exc:
        safe_print(f"[{job_id}] Lỗi AI phân tích: {exc}")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = "failed"
            log_processing_history(db, job_id, job.user_id, "extract_subtitles", "failed", str(exc))
            db.commit()
    finally:
        db.close()


def burn_video_task(
    job_id: str,
    subtitles: list,
    pos_y: int,
    opacity: float,
    background_color: str,
    text_color: str,
    font_size: int,
    font_family: str,
):
    db = SessionLocal()
    try:
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            log_processing_history(db, job_id, job.user_id, "burn_subtitles", "processing")
            db.commit()
            job.hardsub_video_path = burn_subtitles_to_video(
                job.original_video_path,
                subtitles,
                pos_y,
                opacity,
                background_color,
                text_color,
                font_size,
                font_family,
            )
            job.status = "completed"
            log_processing_history(db, job_id, job.user_id, "burn_subtitles", "completed")
            db.commit()
    except Exception as exc:
        safe_print(f"[{job_id}] Lỗi FFmpeg render: {exc}")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = "failed"
            log_processing_history(db, job_id, job.user_id, "burn_subtitles", "failed", str(exc))
            db.commit()
    finally:
        db.close()


async def cleanup_expired_jobs():
    while True:
        db = SessionLocal()
        try:
            threshold = datetime.utcnow() - timedelta(days=20)
            old_jobs = db.query(models.VideoJob).filter(models.VideoJob.created_at < threshold).all()
            for job in old_jobs:
                delete_job_assets(job)
                delete_job_database_records(db, job)
            db.commit()
            safe_print(f"Đã dọn dẹp {len(old_jobs)} dự án quá hạn (20 ngày).")
        except Exception as exc:
            safe_print("Lỗi dọn rác:", exc)
        finally:
            db.close()
        await asyncio.sleep(86400)
