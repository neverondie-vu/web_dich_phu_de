import json
import os
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.services.media_storage import ensure_user_record, log_processing_history


router = APIRouter(prefix="/api/automation", tags=["link-automation"])


def _validate_video_url(url: str) -> str:
    from app.services.link_automation import validate_video_url

    return validate_video_url(url)


def _run_link_automation(job_id: str, url: str, src_language: str, tone: str, voice: str, reduce_original_voice: bool):
    from app.services.link_automation import run_link_automation

    return run_link_automation(job_id, url, src_language, tone, voice, reduce_original_voice)


class LinkAutomationRequest(BaseModel):
    url: str = Field(min_length=10, max_length=2000)
    src_language: str = Field(default="zh", pattern=r"^(zh|en|ja|ko|vi)$")
    tone: str = Field(default="Tự nhiên, rõ ràng", max_length=120)
    voice: str = Field(default="edge:vi-VN-HoaiMyNeural", max_length=120)
    reduce_original_voice: bool = True
    rights_confirmed: bool = False
    user_id: str | None = Field(default=None, max_length=100)
    user_email: str | None = Field(default=None, max_length=255)
    username: str | None = Field(default=None, max_length=255)


@router.post("/link")
async def start_link_automation(request: LinkAutomationRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not request.rights_confirmed:
        raise HTTPException(status_code=400, detail="Bạn cần xác nhận có quyền sử dụng video nguồn.")
    try:
        url = _validate_video_url(request.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    job_id = str(uuid.uuid4())
    ensure_user_record(db, request.user_id, email=request.user_email, username=request.username)
    db.add(models.VideoJob(
        id=job_id,
        filename="Đang lấy thông tin video…",
        src_language=request.src_language,
        status="queued",
        original_video_path=None,
        subtitle_position_y=20,
        background_opacity=0.78,
        user_id=request.user_id,
    ))
    db.flush()
    log_processing_history(db, job_id, request.user_id, "automated_video", "queued", json.dumps({
        "url": url,
        "tone": request.tone,
        "voice": request.voice,
        "reduce_original_voice": request.reduce_original_voice,
    }, ensure_ascii=False))
    db.commit()
    background_tasks.add_task(_run_link_automation, job_id, url, request.src_language, request.tone, request.voice, request.reduce_original_voice)
    return {"job_id": job_id, "status": "queued"}


@router.post("/retry/{job_id}")
async def retry_link_automation(job_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiến trình")
    if job.status != "failed":
        raise HTTPException(status_code=400, detail="Chỉ có thể thử lại tiến trình đã thất bại")
    queued_event = db.query(models.ProcessingHistory).filter(
        models.ProcessingHistory.job_id == job_id,
        models.ProcessingHistory.action == "automated_video",
        models.ProcessingHistory.status == "queued",
    ).order_by(models.ProcessingHistory.created_at.asc()).first()
    if not queued_event or not queued_event.message:
        raise HTTPException(status_code=400, detail="Không tìm thấy liên kết nguồn để thử lại")
    try:
        saved = json.loads(queued_event.message)
        url = _validate_video_url(saved["url"])
        tone = saved.get("tone", "Tự nhiên, rõ ràng")
        voice = saved.get("voice", "edge:vi-VN-HoaiMyNeural")
        reduce_original_voice = bool(saved.get("reduce_original_voice", True))
    except (json.JSONDecodeError, TypeError, KeyError):
        url = _validate_video_url(queued_event.message)
        tone = "Tự nhiên, rõ ràng"
        voice = "edge:vi-VN-HoaiMyNeural"
        reduce_original_voice = True
    job.status = "queued"
    log_processing_history(db, job_id, job.user_id, "automated_video_retry", "queued", "Thử lại với bộ tải Bilibili dự phòng")
    db.commit()
    background_tasks.add_task(_run_link_automation, job_id, url, job.src_language, tone, voice, reduce_original_voice)
    return {"job_id": job_id, "status": "queued"}


@router.get("/status/{job_id}")
async def get_automation_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiến trình")
    last_event = db.query(models.ProcessingHistory).filter(models.ProcessingHistory.job_id == job_id).order_by(models.ProcessingHistory.created_at.desc()).first()
    has_dubbed = bool(job.hardsub_video_path and os.path.exists(job.hardsub_video_path.rsplit(".", 1)[0] + "_dubbed.mp4"))
    return {
        "job_id": job.id,
        "status": job.status,
        "filename": job.filename,
        "message": last_event.message if last_event else None,
        "video_url": f"/api/download_dubbed/{job.id}" if job.status == "completed" and has_dubbed else None,
        "hardsub_url": f"/api/download/{job.id}" if job.status == "completed" and job.hardsub_video_path else None,
        "srt_url": f"/api/download_srt/{job.id}" if job.srt_path else None,
    }
