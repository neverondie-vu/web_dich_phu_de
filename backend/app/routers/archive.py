import json
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.services.media_storage import (
    delete_job_assets,
    delete_job_database_records,
    is_audio_path,
    log_processing_history,
    srt_download_filename,
    upsert_subtitle_record,
    write_subtitle_files,
)


router = APIRouter(prefix="/api", tags=["archive"])


@router.get("/archive/{user_id}")
async def get_user_archive(user_id: str, db: Session = Depends(get_db)):
    jobs = db.query(models.VideoJob).filter(
        models.VideoJob.user_id == user_id,
        models.VideoJob.status == "completed",
    ).order_by(models.VideoJob.created_at.desc()).all()
    return [{
        "job_id": job.id,
        "filename": job.filename,
        "created_at": job.created_at.strftime("%d/%m/%Y") if job.created_at else "Không rõ",
        "media_type": "audio" if is_audio_path(job.original_video_path) else "video",
    } for job in jobs]


@router.get("/history/{user_id}")
async def get_processing_history(user_id: str, db: Session = Depends(get_db)):
    history = db.query(models.ProcessingHistory).filter(
        models.ProcessingHistory.user_id == user_id
    ).order_by(models.ProcessingHistory.created_at.desc()).limit(100).all()
    return {"history": [{
        "job_id": item.job_id,
        "action": item.action,
        "status": item.status,
        "message": item.message,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    } for item in history]}


@router.get("/jobs/{job_id}")
async def get_job_detail(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    media = db.query(models.MediaFile).filter(models.MediaFile.job_id == job_id).first()
    subtitle = db.query(models.Subtitle).filter(models.Subtitle.job_id == job_id).first()
    history = db.query(models.ProcessingHistory).filter(
        models.ProcessingHistory.job_id == job_id
    ).order_by(models.ProcessingHistory.created_at.asc()).all()
    return {
        "job": {"id": job.id, "filename": job.filename, "src_language": job.src_language, "status": job.status, "user_id": job.user_id, "created_at": job.created_at.isoformat() if job.created_at else None},
        "media_file": {"id": media.id, "media_type": media.media_type, "file_path": media.file_path, "mime_type": media.mime_type} if media else None,
        "subtitle": {"id": subtitle.id, "target_language": subtitle.target_language, "srt_path": subtitle.srt_path, "json_path": subtitle.json_path, "segment_count": subtitle.segment_count} if subtitle else None,
        "history": [{"action": item.action, "status": item.status, "message": item.message, "created_at": item.created_at.isoformat() if item.created_at else None} for item in history],
    }


@router.delete("/archive/{user_id}/{job_id}")
async def delete_archived_job(user_id: str, job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(
        models.VideoJob.id == job_id,
        models.VideoJob.user_id == user_id,
        models.VideoJob.status == "completed",
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy dự án trong kho lưu trữ")
    removed_files = delete_job_assets(job)
    delete_job_database_records(db, job)
    db.commit()
    return {"status": "deleted", "job_id": job_id, "removed_files": removed_files}


@router.get("/download_srt/{job_id}")
async def download_srt(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    download_name = srt_download_filename(job, job_id)
    candidates = [job.srt_path if job else None, f"uploads/subtitle/{job_id}.srt", f"uploads/subtitle/{job_id}_temp.srt"]
    for srt_path in candidates:
        if srt_path and os.path.exists(srt_path):
            if job:
                log_processing_history(db, job_id, job.user_id, "download_srt", "completed")
                db.commit()
            return FileResponse(path=srt_path, filename=download_name, media_type="text/plain")
    json_path = f"uploads/subtitle/{job_id}.json"
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as subtitle_file:
            subtitles = json.load(subtitle_file)
        _, srt_path = write_subtitle_files(job_id, subtitles)
        if job:
            job.srt_path = srt_path
            upsert_subtitle_record(db, job_id, json_path, srt_path, len(subtitles))
            db.commit()
        return FileResponse(path=srt_path, filename=download_name, media_type="text/plain")
    raise HTTPException(status_code=404, detail="Không tìm thấy file phụ đề")
