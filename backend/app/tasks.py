import asyncio
from datetime import datetime, timedelta

from app import models
from app.ai.subtitle_pipeline import add_voiceover_to_video, burn_subtitles_to_video, extract_subtitles_from_video
from app.config import system_settings
from app.database import SessionLocal
from app.services.tts_service import synthesize_full_narration
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
            translation_provider=system_settings.get("translation_provider", "nllb"),
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
    tts_language: str = "vi",
    tts_voice: str = "edge:vi-VN-HoaiMyNeural",
    tts_speed: float = 1.0,
    tts_pitch: float = 0.0,
    tts_volume: float = 1.0,
    reduce_original_voice: bool = True,
    subtitle_position_percent: float | None = None,
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
                subtitle_position_percent,
            )
            try:
                log_processing_history(db, job_id, job.user_id, "create_dubbed_video", "processing")
                db.commit()
                voiceover_path = synthesize_full_narration(
                    subtitles,
                    f"{job_id}_dub",
                    tts_language,
                    tts_voice,
                    tts_speed,
                    tts_pitch,
                    tts_volume,
                )
                add_voiceover_to_video(job.hardsub_video_path, voiceover_path, reduce_original_voice=reduce_original_voice)
                log_processing_history(db, job_id, job.user_id, "create_dubbed_video", "completed")
            except Exception as exc:
                log_processing_history(db, job_id, job.user_id, "create_dubbed_video", "failed", str(exc))
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
            retention_days = int(system_settings.get("retention_days", 20) or 20)
            threshold = datetime.utcnow() - timedelta(days=retention_days)
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
