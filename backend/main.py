import shutil
import uuid
import os
import json
import asyncio
import ipaddress
import mimetypes
import requests
from datetime import datetime, timedelta
from fastapi import FastAPI, BackgroundTasks, Request, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import id_token as google_id_token

from sqlalchemy import func
from app.models import VideoJob

# Import Database của bạn
from app.database import engine, SessionLocal, get_db
from app import models

# Import 2 hàm xử lý AI mới
from app.ai.subtitle_pipeline import extract_subtitles_from_video, burn_subtitles_to_video

app = FastAPI(
    title="AutoSub Pro API",
    description="Hệ thống tạo phụ đề tự động 2 giai đoạn + Hàng đợi & Kho lưu trữ",
    version="2.1.0"
)

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://127.0.0.1:3000,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

os.makedirs("uploads/video", exist_ok=True)
os.makedirs("uploads/audio", exist_ok=True)
os.makedirs("uploads/subtitle", exist_ok=True)

ALLOWED_VIDEO_EXTENSIONS = {"mp4"}
ALLOWED_AUDIO_EXTENSIONS = {"mp3", "wav", "m4a"}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SYSTEM_SETTINGS_FILE = os.path.join(BASE_DIR, "data", "system_settings.json")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "autosub-a03c4")
FIRESTORE_USER_URL = (
    f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}"
    "/databases/(default)/documents/users/{uid}"
)
DEFAULT_SYSTEM_SETTINGS = {
    "maintenance_mode": False,
    "blacklisted_ips": [],
    "whisper_model": "small",
}
GOOGLE_AUTH_REQUEST = GoogleAuthRequest()

def load_system_settings():
    try:
        with open(SYSTEM_SETTINGS_FILE, "r", encoding="utf-8") as f:
            saved_settings = json.load(f)
        return {**DEFAULT_SYSTEM_SETTINGS, **saved_settings}
    except (FileNotFoundError, json.JSONDecodeError):
        return DEFAULT_SYSTEM_SETTINGS.copy()

def save_system_settings():
    os.makedirs(os.path.dirname(SYSTEM_SETTINGS_FILE), exist_ok=True)
    with open(SYSTEM_SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(system_settings, f, ensure_ascii=False, indent=2)

def normalize_ip(ip: str):
    try:
        return str(ipaddress.ip_address(ip.strip()))
    except ValueError:
        raise HTTPException(status_code=400, detail="Địa chỉ IP không hợp lệ")

def json_response_with_cors(request: Request, status_code: int, content: dict, headers: dict | None = None):
    response = JSONResponse(status_code=status_code, content=content, headers=headers)
    origin = request.headers.get("origin")

    if origin and origin in CORS_ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"

    return response

def get_request_ip(request: Request):
    if not request.client:
        return None
    try:
        return normalize_ip(request.client.host)
    except HTTPException:
        return request.client.host

def get_bearer_token(request: Request) -> str:
    authorization = request.headers.get("authorization") or ""
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Thiếu Firebase ID token cho khu vực quản trị")
    return token.strip()

def firestore_string_field(fields: dict, field_name: str) -> str | None:
    value = fields.get(field_name)
    if not isinstance(value, dict):
        return None
    return value.get("stringValue")

def get_firestore_user_role(uid: str, token: str) -> str | None:
    response = requests.get(
        FIRESTORE_USER_URL.format(uid=uid),
        headers={"Authorization": f"Bearer {token}"},
        timeout=8,
    )
    if response.status_code == 404:
        return None
    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=403,
            detail="Không đọc được hồ sơ phân quyền Firestore của tài khoản hiện tại",
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Không kiểm tra được quyền quản trị từ Firestore")

    return firestore_string_field(response.json().get("fields", {}), "role")

def verify_admin_request(request: Request) -> dict:
    token = get_bearer_token(request)
    try:
        claims = google_id_token.verify_firebase_token(
            token,
            GOOGLE_AUTH_REQUEST,
            audience=FIREBASE_PROJECT_ID,
            clock_skew_in_seconds=10,
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Firebase ID token không hợp lệ hoặc đã hết hạn") from exc

    uid = claims.get("user_id") or claims.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Token không có định danh người dùng")

    token_role = claims.get("role")
    if claims.get("admin") is True or token_role == "admin":
        return claims

    role = get_firestore_user_role(uid, token)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Tài khoản không có quyền quản trị")

    return claims

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

# --- KHAI BÁO CẤU TRÚC DỮ LIỆU TỪ FRONTEND ---
class SubtitleItem(BaseModel):
    start: str
    end: str
    text: str

class BurnRequest(BaseModel):
    job_id: str
    subtitles: List[SubtitleItem]

class SubtitleUpdateRequest(BaseModel):
    subtitles: List[SubtitleItem]

# ==========================================
# CÁC TIẾN TRÌNH CHẠY NGẦM (BACKGROUND TASKS)
# ==========================================

# GIAI ĐOẠN 1: Dùng Whisper/Gemini để lấy text
def bg_extract_subtitles(file_path: str, src_language: str, job_id: str, final_status: str = "transcribed"):
    db = SessionLocal()
    try:
        safe_print(f"[{job_id}] Đang phân tích âm thanh và tách chữ...")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            log_processing_history(
                db,
                job_id,
                job.user_id,
                "extract_subtitles",
                "processing",
                "Bắt đầu nhận diện giọng nói, dịch và tạo phụ đề.",
            )
            db.commit()
        
        # Gọi hàm AI của bạn (trả về list các dict phụ đề)
        subtitles_data = extract_subtitles_from_video(
            file_path,
            src_language,
            whisper_model=system_settings.get("whisper_model", "small"),
        )
        
        # Lưu kết quả thành JSON cho editor và SRT cho chức năng tải xuống
        json_path, srt_path = write_subtitle_files(job_id, subtitles_data)

        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = final_status
            job.srt_path = srt_path
            upsert_subtitle_record(db, job_id, json_path, srt_path, len(subtitles_data))
            log_processing_history(
                db,
                job_id,
                job.user_id,
                "extract_subtitles",
                "completed",
                f"Đã tạo {len(subtitles_data)} đoạn phụ đề tiếng Việt.",
            )
            db.commit()
            safe_print(f"[{job_id}] Đã tách chữ xong! Chờ người dùng chỉnh sửa.")
            
    except Exception as e:
        safe_print(f"[{job_id}] Lỗi AI phân tích: {str(e)}")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = "failed"
            log_processing_history(db, job_id, job.user_id, "extract_subtitles", "failed", str(e))
            db.commit()
    finally:
        db.close()

# GIAI ĐOẠN 2: Ép text đã sửa vào video
def bg_burn_video(job_id: str, subtitles: list, pos_y: int, opacity: float):
    db = SessionLocal()
    try:
        safe_print(f"[{job_id}] Đang render video với phụ đề...")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        
        if job:
            # Gọi hàm FFmpeg (đưa text đã sửa vào)
            log_processing_history(
                db,
                job_id,
                job.user_id,
                "burn_subtitles",
                "processing",
                "Bắt đầu ép phụ đề cứng vào video.",
            )
            db.commit()
            final_video_path = burn_subtitles_to_video(job.original_video_path, subtitles, pos_y, opacity)
            
            job.status = "completed"
            job.hardsub_video_path = final_video_path
            log_processing_history(
                db,
                job_id,
                job.user_id,
                "burn_subtitles",
                "completed",
                "Đã tạo video MP4 có phụ đề cứng.",
            )
            db.commit()
            safe_print(f"[{job_id}] Ép video thành công!")
            
    except Exception as e:
        safe_print(f"[{job_id}] Lỗi FFmpeg render: {str(e)}")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = "failed"
            log_processing_history(db, job_id, job.user_id, "burn_subtitles", "failed", str(e))
            db.commit()
    finally:
        db.close()

# ==========================================
# CÁC CỔNG API GIAO TIẾP VỚI GIAO DIỆN
# ==========================================

@app.post("/api/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    src_language: str = Form("en"),
    subtitle_position_y: int = Form(20),
    background_opacity: float = Form(0.8),
    user_id: str = Form(None), # Thêm trường user_id
    user_email: str = Form(None),
    username: str = Form(None),
    db: Session = Depends(get_db)
):
    job_id = str(uuid.uuid4())
    filename, file_path = save_upload_file(file, "uploads/video", job_id, ALLOWED_VIDEO_EXTENSIONS)
    mime_type = file.content_type or mimetypes.guess_type(filename)[0]

    ensure_user_record(db, user_id, email=user_email, username=username)
    new_job = models.VideoJob(
        id=job_id,
        filename=filename,
        src_language=src_language,
        status="processing",
        original_video_path=file_path,
        subtitle_position_y=subtitle_position_y,
        background_opacity=background_opacity,
        user_id=user_id # Cập nhật vào DB
    )
    db.add(new_job)
    db.flush()
    create_media_file_record(db, job_id, user_id, filename, "video", src_language, file_path, mime_type)
    log_processing_history(db, job_id, user_id, "upload", "queued", "Người dùng tải video lên hệ thống.")
    db.commit()
        
    # Kích hoạt Giai đoạn 1
    background_tasks.add_task(bg_extract_subtitles, file_path, src_language, job_id)
    
    return JSONResponse({"status": "queued", "job_id": job_id, "media_type": "video"})

@app.post("/api/upload-audio")
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    src_language: str = Form("en"),
    user_id: str = Form(None),
    user_email: str = Form(None),
    username: str = Form(None),
    db: Session = Depends(get_db)
):
    job_id = str(uuid.uuid4())
    filename, file_path = save_upload_file(file, "uploads/audio", job_id, ALLOWED_AUDIO_EXTENSIONS)
    mime_type = file.content_type or mimetypes.guess_type(filename)[0]

    ensure_user_record(db, user_id, email=user_email, username=username)
    new_job = models.VideoJob(
        id=job_id,
        filename=filename,
        src_language=src_language,
        status="processing",
        original_video_path=file_path,
        subtitle_position_y=0,
        background_opacity=0,
        user_id=user_id
    )
    db.add(new_job)
    db.flush()
    create_media_file_record(db, job_id, user_id, filename, "audio", src_language, file_path, mime_type)
    log_processing_history(db, job_id, user_id, "upload", "queued", "Người dùng tải audio lên hệ thống.")
    db.commit()

    background_tasks.add_task(bg_extract_subtitles, file_path, src_language, job_id, "completed")

    return JSONResponse({"status": "queued", "job_id": job_id, "media_type": "audio"})

@app.post("/api/burn")
async def burn_video(request: BurnRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == request.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if is_audio_path(job.original_video_path):
        raise HTTPException(status_code=400, detail="Audio chỉ hỗ trợ xuất file SRT, không thể ép phụ đề vào video")
        
    job.status = "burning"
    
    # Chuyển đổi dữ liệu Pydantic sang List[Dict] thông thường để FFmpeg dễ xử lý
    subs_dict = [{"start": s.start, "end": s.end, "text": s.text} for s in request.subtitles]
    json_path, srt_path = write_subtitle_files(request.job_id, subs_dict)
    job.srt_path = srt_path
    upsert_subtitle_record(db, request.job_id, json_path, srt_path, len(subs_dict))
    log_processing_history(
        db,
        request.job_id,
        job.user_id,
        "burn_subtitles",
        "queued",
        "Người dùng gửi phụ đề đã chỉnh sửa để ép vào video.",
    )
    db.commit()
    
    # Kích hoạt Giai đoạn 2
    background_tasks.add_task(bg_burn_video, request.job_id, subs_dict, job.subtitle_position_y, job.background_opacity)
    
    return JSONResponse({"status": "burning", "job_id": request.job_id})

@app.put("/api/subtitles/{job_id}")
async def update_subtitles(job_id: str, request: SubtitleUpdateRequest, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    subtitles_data = [{"start": s.start, "end": s.end, "text": s.text} for s in request.subtitles]
    json_path, srt_path = write_subtitle_files(job_id, subtitles_data)
    job.srt_path = srt_path
    upsert_subtitle_record(db, job_id, json_path, srt_path, len(subtitles_data))
    log_processing_history(
        db,
        job_id,
        job.user_id,
        "edit_subtitles",
        "completed",
        f"Đã cập nhật {len(subtitles_data)} đoạn phụ đề sau chỉnh sửa.",
    )
    db.commit()

    return {
        "status": "saved",
        "job_id": job_id,
        "subtitle_count": len(subtitles_data),
        "srt_url": f"/api/download_srt/{job_id}",
    }

@app.get("/api/status/{job_id}")
async def get_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    response = {
        "job_id": job.id,
        "status": job.status,
        "filename": job.filename,
        "media_type": "audio" if is_audio_path(job.original_video_path) else "video",
        "has_hardsub": bool(job.hardsub_video_path),
    }
    
    # Nếu AI tách chữ xong, đóng gói file JSON gửi về cho giao diện
    if job.status in {"transcribed", "completed"}:
        json_path = f"uploads/subtitle/{job_id}.json"
        if os.path.exists(json_path):
            with open(json_path, "r", encoding="utf-8") as f:
                response["subtitles"] = json.load(f)
                
    return response

@app.get("/api/download/{job_id}")
async def download_video(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job or job.status != "completed" or not job.hardsub_video_path:
        raise HTTPException(status_code=404, detail="Video chưa sẵn sàng")
    if not os.path.exists(job.hardsub_video_path):
        raise HTTPException(status_code=404, detail="File vật lý không tìm thấy")

    return FileResponse(path=job.hardsub_video_path, filename=f"PhuDe_{job.filename}", media_type="video/mp4")

@app.get("/api/original/{job_id}")
async def get_original_media(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job or not job.original_video_path:
        raise HTTPException(status_code=404, detail="Không tìm thấy file gốc")
    if not os.path.exists(job.original_video_path):
        raise HTTPException(status_code=404, detail="File gốc không còn tồn tại")

    media_type = mimetypes.guess_type(job.original_video_path)[0] or "application/octet-stream"
    return FileResponse(path=job.original_video_path, filename=job.filename, media_type=media_type)

# ==========================================
# CỔNG API KHO LƯU TRỮ VÀ DỌN RÁC
# ==========================================

# 1. API lấy danh sách dự án của 1 User
@app.get("/api/archive/{user_id}")
async def get_user_archive(user_id: str, db: Session = Depends(get_db)):
    jobs = db.query(models.VideoJob).filter(
        models.VideoJob.user_id == user_id, 
        models.VideoJob.status == "completed"
    ).order_by(models.VideoJob.created_at.desc()).all()
    
    result = []
    for j in jobs:
        # Format lại ngày giờ cho đẹp (vd: 20/05/2026)
        created_str = j.created_at.strftime("%d/%m/%Y") if j.created_at else "Không rõ"
        result.append({
            "job_id": j.id,
            "filename": j.filename,
            "created_at": created_str,
            "media_type": "audio" if is_audio_path(j.original_video_path) else "video",
        })
    return result

@app.get("/api/history/{user_id}")
async def get_processing_history(user_id: str, db: Session = Depends(get_db)):
    history = db.query(models.ProcessingHistory).filter(
        models.ProcessingHistory.user_id == user_id
    ).order_by(models.ProcessingHistory.created_at.desc()).limit(100).all()

    return {
        "history": [
            {
                "job_id": item.job_id,
                "action": item.action,
                "status": item.status,
                "message": item.message,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in history
        ]
    }

@app.get("/api/jobs/{job_id}")
async def get_job_detail(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    media_file = db.query(models.MediaFile).filter(models.MediaFile.job_id == job_id).first()
    subtitle = db.query(models.Subtitle).filter(models.Subtitle.job_id == job_id).first()
    history = db.query(models.ProcessingHistory).filter(
        models.ProcessingHistory.job_id == job_id
    ).order_by(models.ProcessingHistory.created_at.asc()).all()

    return {
        "job": {
            "id": job.id,
            "filename": job.filename,
            "src_language": job.src_language,
            "status": job.status,
            "user_id": job.user_id,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        },
        "media_file": {
            "id": media_file.id,
            "media_type": media_file.media_type,
            "file_path": media_file.file_path,
            "mime_type": media_file.mime_type,
        } if media_file else None,
        "subtitle": {
            "id": subtitle.id,
            "target_language": subtitle.target_language,
            "srt_path": subtitle.srt_path,
            "json_path": subtitle.json_path,
            "segment_count": subtitle.segment_count,
        } if subtitle else None,
        "history": [
            {
                "action": item.action,
                "status": item.status,
                "message": item.message,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in history
        ],
    }

@app.delete("/api/archive/{user_id}/{job_id}")
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

    return {
        "status": "deleted",
        "job_id": job_id,
        "removed_files": removed_files,
    }

# 2. API Tải file SRT
@app.get("/api/download_srt/{job_id}")
async def download_srt(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    download_name = srt_download_filename(job, job_id)

    candidate_paths = [
        job.srt_path if job else None,
        f"uploads/subtitle/{job_id}.srt",
        f"uploads/subtitle/{job_id}_temp.srt",
    ]

    for srt_path in candidate_paths:
        if srt_path and os.path.exists(srt_path):
            if job:
                log_processing_history(db, job_id, job.user_id, "download_srt", "completed", "Tải file phụ đề SRT.")
                db.commit()
            return FileResponse(path=srt_path, filename=download_name, media_type="text/plain")

    json_path = f"uploads/subtitle/{job_id}.json"
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            subtitles_data = json.load(f)
        _, srt_path = write_subtitle_files(job_id, subtitles_data)
        if job:
            job.srt_path = srt_path
            upsert_subtitle_record(db, job_id, json_path, srt_path, len(subtitles_data))
            log_processing_history(db, job_id, job.user_id, "download_srt", "completed", "Tải file phụ đề SRT.")
            db.commit()
        return FileResponse(path=srt_path, filename=download_name, media_type="text/plain")

    raise HTTPException(status_code=404, detail="Không tìm thấy file phụ đề")

# 3. Tiến trình dọn rác (Chạy ngầm xóa video quá 20 ngày)
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(auto_cleanup_old_files())

async def auto_cleanup_old_files():
    while True:
        db = SessionLocal()
        try:
            threshold_date = datetime.utcnow() - timedelta(days=20)
            old_jobs = db.query(models.VideoJob).filter(models.VideoJob.created_at < threshold_date).all()
            
            for job in old_jobs:
                delete_job_assets(job)
                delete_job_database_records(db, job)
                
            db.commit()
            safe_print(f"Đã dọn dẹp {len(old_jobs)} dự án quá hạn (20 ngày).")
        except Exception as e:
            safe_print("Lỗi dọn rác:", e)
        finally:
            db.close()
            
        # Ngủ 24 tiếng rồi quét lại một lần (86400 giây)
        await asyncio.sleep(86400)
        

@app.get("/admin/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    try:
        # 1. Thống kê tổng số lượng video đã xử lý
        total_videos = db.query(VideoJob).count()
        
        # 2. Thống kê số lượng video trong 7 ngày gần nhất
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        week_videos = db.query(VideoJob).filter(VideoJob.created_at >= seven_days_ago).count()
        
        # 3. Gom nhóm dữ liệu vẽ biểu đồ theo ngày (7 ngày qua)
        # Lưu ý: Sử dụng VideoJob.id thay vì job_id theo đúng cấu trúc models của bạn
        daily_stats_query = db.query(
            func.date(VideoJob.created_at).label('date'),
            func.count(VideoJob.id).label('count')
        ).filter(VideoJob.created_at >= seven_days_ago).group_by(func.date(VideoJob.created_at)).all()
        
        # Format lại dữ liệu để trả về mảng dễ dùng cho Javascript Chart.js
        daily_data = [{"date": str(item.date), "count": item.count} for item in daily_stats_query]

        return {
            "summary": {
                "total_videos": total_videos,
                "week_videos": week_videos
            },
            "daily": daily_data
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/admin/logs")
async def get_system_logs(db: Session = Depends(get_db)):
    try:
        # Lấy 5 video có trạng thái "failed" (Lỗi xử lý) mới nhất từ bảng VideoJob
        failed_jobs = db.query(VideoJob).filter(VideoJob.status == "failed").order_by(VideoJob.created_at.desc()).limit(5).all()
        
        logs = []
        for job in failed_jobs:
            # Format lại thời gian cho đẹp (VD: 15/05 14:30)
            time_str = job.created_at.strftime("%d/%m %H:%M") if job.created_at else "N/A"
            
            logs.append({
                "level": "error",
                "message": f"Lỗi AI xử lý file: {job.filename}",
                "time": time_str
            })
            
        return {"logs": logs}
    except Exception as e:
        return {"error": str(e)}

@app.get("/admin/audit-logs")
async def get_admin_audit_logs(db: Session = Depends(get_db)):
    history = db.query(models.ProcessingHistory).order_by(
        models.ProcessingHistory.created_at.desc()
    ).limit(50).all()

    logs = []
    for item in history:
        time_str = item.created_at.strftime("%d/%m %H:%M") if item.created_at else "N/A"
        logs.append({
            "action": item.action,
            "description": item.message or f"{item.action}: {item.status}",
            "time": time_str,
            "ip": item.user_id or "system",
            "user_agent": f"job={item.job_id} status={item.status}",
        })

    return {"logs": logs}

@app.get("/admin/jobs")
async def get_all_jobs(db: Session = Depends(get_db)):
    jobs = db.query(VideoJob).order_by(VideoJob.created_at.desc()).all()
    
    result = []
    for job in jobs:
        user = db.query(models.User).filter(models.User.id == job.user_id).first() if job.user_id else None
        media_file = db.query(models.MediaFile).filter(models.MediaFile.job_id == job.id).first()
        result.append({
            "id": job.id,
            "filename": job.filename,
            "media_type": media_file.media_type if media_file else ("audio" if is_audio_path(job.original_video_path) else "video"),
            "file_type": media_file.media_type.upper() if media_file else ("AUDIO" if is_audio_path(job.original_video_path) else "MP4"),
            "user_email": user.email if user and user.email else (job.user_id or "N/A"),
            "status": job.status,
            "has_srt": bool(job.srt_path),
            "has_hardsub": bool(job.hardsub_video_path),
            "created_at": job.created_at.isoformat() if job.created_at else None
        })
    return {"jobs": result}

# Khai báo cấu trúc dữ liệu cấu hình nhận được từ Frontend
class ConfigSchema(BaseModel):
    whisper_model: str

# API cập nhật cấu hình
@app.post("/admin/config")
async def update_config(config: ConfigSchema):
    try:
        allowed_models = {"tiny", "base", "small", "medium", "large", "large-v3"}
        if config.whisper_model not in allowed_models:
            return JSONResponse(
                status_code=400,
                content={"message": "Whisper model không hợp lệ", "status": "error"},
            )

        system_settings["whisper_model"] = config.whisper_model
        save_system_settings()
        safe_print(f"Model Whisper được chọn: {config.whisper_model}")

        return {
            "message": "Cập nhật cấu hình thành công!",
            "status": "success",
            "whisper_model": system_settings["whisper_model"],
        }
    except Exception as e:
        return {"message": str(e), "status": "error"}
    
class MaintenanceRequest(BaseModel):
    status: bool

system_settings = load_system_settings()

@app.post("/admin/maintenance")
async def toggle_maintenance(req: MaintenanceRequest):
    system_settings["maintenance_mode"] = req.status
    save_system_settings()
    return {"status": "success", "maintenance_mode": system_settings["maintenance_mode"]}

@app.get("/admin/system-status")
async def get_status():
    return system_settings
# 1. Danh sách IP bị chặn (Nên lưu vào DB hoặc File)
class IPCheck(BaseModel):
    ip: str

@app.get("/admin/blacklist")
async def get_blacklist():
    return {"ips": sorted(system_settings.get("blacklisted_ips", []))}

# 2. Route nhận lệnh chặn từ Admin
@app.post("/admin/blacklist")
async def add_to_blacklist(data: IPCheck, request: Request):
    ip = normalize_ip(data.ip)
    request_ip = get_request_ip(request)

    if request_ip == ip:
        raise HTTPException(status_code=400, detail="Không thể chặn chính IP đang quản trị")

    blacklisted_ips = system_settings.setdefault("blacklisted_ips", [])
    if ip not in blacklisted_ips:
        blacklisted_ips.append(ip)
        save_system_settings()

    return {"message": "Thêm vào danh sách đen thành công", "ips": sorted(blacklisted_ips)}

@app.delete("/admin/blacklist/{ip}")
async def remove_from_blacklist(ip: str):
    normalized_ip = normalize_ip(ip)
    blacklisted_ips = system_settings.setdefault("blacklisted_ips", [])

    if normalized_ip in blacklisted_ips:
        blacklisted_ips.remove(normalized_ip)
        save_system_settings()

    return {"message": "Đã gỡ IP khỏi danh sách đen", "ips": sorted(blacklisted_ips)}

# 3. Middleware: Kiểm tra mọi yêu cầu đến Server
@app.middleware("http")
async def block_blacklisted_ips(request: Request, call_next):
    client_ip = get_request_ip(request)
    if client_ip in system_settings.get("blacklisted_ips", []):
        return json_response_with_cors(
            request,
            status_code=403,
            content={"detail": "Địa chỉ IP của bạn đã bị chặn."},
        )

    path = request.url.path
    if path.startswith("/admin") and request.method != "OPTIONS":
        try:
            verify_admin_request(request)
        except HTTPException as exc:
            return json_response_with_cors(
                request,
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )

    if (
        system_settings["maintenance_mode"]
        and request.method != "OPTIONS"
        and not path.startswith("/admin")
    ):
        return json_response_with_cors(
            request,
            status_code=503,
            content={"detail": "Hệ thống đang bảo trì. Vui lòng quay lại sau."},
            headers={"Retry-After": "3600"},
        )

    return await call_next(request)
