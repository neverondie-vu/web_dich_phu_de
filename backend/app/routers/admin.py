from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.config import save_system_settings, system_settings
from app.database import get_db
from app.schemas import ConfigSchema, IPCheck, MaintenanceRequest
from app.security import get_request_ip, normalize_ip
from app.services.media_storage import is_audio_path, safe_print


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily = db.query(
        func.date(models.VideoJob.created_at).label("date"),
        func.count(models.VideoJob.id).label("count"),
    ).filter(models.VideoJob.created_at >= seven_days_ago).group_by(func.date(models.VideoJob.created_at)).all()
    return {
        "summary": {"total_videos": db.query(models.VideoJob).count(), "week_videos": db.query(models.VideoJob).filter(models.VideoJob.created_at >= seven_days_ago).count()},
        "daily": [{"date": str(item.date), "count": item.count} for item in daily],
    }


@router.get("/logs")
async def get_system_logs(db: Session = Depends(get_db)):
    jobs = db.query(models.VideoJob).filter(models.VideoJob.status == "failed").order_by(models.VideoJob.created_at.desc()).limit(5).all()
    return {"logs": [{"level": "error", "message": f"Lỗi AI xử lý file: {job.filename}", "time": job.created_at.strftime("%d/%m %H:%M") if job.created_at else "N/A"} for job in jobs]}


@router.get("/audit-logs")
async def get_admin_audit_logs(db: Session = Depends(get_db)):
    history = db.query(models.ProcessingHistory).order_by(models.ProcessingHistory.created_at.desc()).limit(50).all()
    return {"logs": [{"action": item.action, "description": item.message or f"{item.action}: {item.status}", "time": item.created_at.strftime("%d/%m %H:%M") if item.created_at else "N/A", "ip": item.user_id or "system", "user_agent": f"job={item.job_id} status={item.status}"} for item in history]}


@router.get("/jobs")
async def get_all_jobs(db: Session = Depends(get_db)):
    jobs = db.query(models.VideoJob).order_by(models.VideoJob.created_at.desc()).all()
    result = []
    for job in jobs:
        user = db.query(models.User).filter(models.User.id == job.user_id).first() if job.user_id else None
        media = db.query(models.MediaFile).filter(models.MediaFile.job_id == job.id).first()
        result.append({"id": job.id, "filename": job.filename, "media_type": media.media_type if media else ("audio" if is_audio_path(job.original_video_path) else "video"), "file_type": media.media_type.upper() if media else ("AUDIO" if is_audio_path(job.original_video_path) else "MP4"), "user_email": user.email if user and user.email else (job.user_id or "N/A"), "status": job.status, "has_srt": bool(job.srt_path), "has_hardsub": bool(job.hardsub_video_path), "created_at": job.created_at.isoformat() if job.created_at else None})
    return {"jobs": result}


@router.post("/config")
async def update_config(config: ConfigSchema):
    allowed_models = {"tiny", "base", "small", "medium", "large", "large-v3"}
    if config.whisper_model not in allowed_models:
        return JSONResponse(status_code=400, content={"message": "Whisper model không hợp lệ", "status": "error"})
    system_settings["whisper_model"] = config.whisper_model
    save_system_settings()
    safe_print(f"Model Whisper được chọn: {config.whisper_model}")
    return {"message": "Cập nhật cấu hình thành công!", "status": "success", "whisper_model": config.whisper_model}


@router.post("/maintenance")
async def toggle_maintenance(request: MaintenanceRequest):
    system_settings["maintenance_mode"] = request.status
    save_system_settings()
    return {"status": "success", "maintenance_mode": request.status}


@router.get("/system-status")
async def get_system_status():
    return system_settings


@router.get("/blacklist")
async def get_blacklist():
    return {"ips": sorted(system_settings.get("blacklisted_ips", []))}


@router.post("/blacklist")
async def add_to_blacklist(data: IPCheck, request: Request):
    ip = normalize_ip(data.ip)
    if get_request_ip(request) == ip:
        raise HTTPException(status_code=400, detail="Không thể chặn chính IP đang quản trị")
    blacklisted_ips = system_settings.setdefault("blacklisted_ips", [])
    if ip not in blacklisted_ips:
        blacklisted_ips.append(ip)
        save_system_settings()
    return {"message": "Thêm vào danh sách đen thành công", "ips": sorted(blacklisted_ips)}


@router.delete("/blacklist/{ip}")
async def remove_from_blacklist(ip: str):
    normalized_ip = normalize_ip(ip)
    blacklisted_ips = system_settings.setdefault("blacklisted_ips", [])
    if normalized_ip in blacklisted_ips:
        blacklisted_ips.remove(normalized_ip)
        save_system_settings()
    return {"message": "Đã gỡ IP khỏi danh sách đen", "ips": sorted(blacklisted_ips)}
