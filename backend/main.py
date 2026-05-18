import shutil
import uuid
import os
import json
import asyncio
from datetime import datetime, timedelta
from fastapi import FastAPI, BackgroundTasks, Request, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import func
from datetime import datetime, timedelta
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

os.makedirs("uploads/video", exist_ok=True)
os.makedirs("uploads/subtitle", exist_ok=True)

# --- KHAI BÁO CẤU TRÚC DỮ LIỆU TỪ FRONTEND ---
class SubtitleItem(BaseModel):
    start: str
    end: str
    text: str

class BurnRequest(BaseModel):
    job_id: str
    subtitles: List[SubtitleItem]

# ==========================================
# CÁC TIẾN TRÌNH CHẠY NGẦM (BACKGROUND TASKS)
# ==========================================

# GIAI ĐOẠN 1: Dùng Whisper/Gemini để lấy text
def bg_extract_subtitles(file_path: str, src_language: str, job_id: str):
    db = SessionLocal()
    try:
        print(f"[{job_id}] Đang phân tích âm thanh và tách chữ...")
        
        # Gọi hàm AI của bạn (trả về list các dict phụ đề)
        subtitles_data = extract_subtitles_from_video(file_path, src_language)
        
        # Lưu kết quả thành file JSON để lát nữa Frontend gọi API status sẽ lấy lên
        json_path = f"uploads/subtitle/{job_id}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(subtitles_data, f, ensure_ascii=False)

        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = "transcribed"  # Đổi trạng thái để Frontend biết đã tách xong
            db.commit()
            print(f"[{job_id}] Đã tách chữ xong! Chờ người dùng chỉnh sửa.")
            
    except Exception as e:
        print(f"[{job_id}] Lỗi AI phân tích: {str(e)}")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = "failed"
            db.commit()
    finally:
        db.close()

# GIAI ĐOẠN 2: Ép text đã sửa vào video
def bg_burn_video(job_id: str, subtitles: list, pos_y: int, opacity: float):
    db = SessionLocal()
    try:
        print(f"[{job_id}] Đang render video với phụ đề...")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        
        if job:
            # Gọi hàm FFmpeg (đưa text đã sửa vào)
            final_video_path = burn_subtitles_to_video(job.original_video_path, subtitles, pos_y, opacity)
            
            job.status = "completed"
            job.hardsub_video_path = final_video_path
            db.commit()
            print(f"[{job_id}] Ép video thành công!")
            
    except Exception as e:
        print(f"[{job_id}] Lỗi FFmpeg render: {str(e)}")
        job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
        if job:
            job.status = "failed"
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
    db: Session = Depends(get_db)
):
    job_id = str(uuid.uuid4())
    file_extension = file.filename.split('.')[-1]
    file_path = f"uploads/video/{job_id}.{file_extension}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    new_job = models.VideoJob(
        id=job_id,
        filename=file.filename,
        src_language=src_language,
        status="processing",
        original_video_path=file_path,
        subtitle_position_y=subtitle_position_y,
        background_opacity=background_opacity,
        user_id=user_id # Cập nhật vào DB
    )
    db.add(new_job)
    db.commit()
        
    # Kích hoạt Giai đoạn 1
    background_tasks.add_task(bg_extract_subtitles, file_path, src_language, job_id)
    
    return JSONResponse({"status": "queued", "job_id": job_id})

@app.post("/api/burn")
async def burn_video(request: BurnRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == request.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job.status = "burning"
    db.commit()
    
    # Chuyển đổi dữ liệu Pydantic sang List[Dict] thông thường để FFmpeg dễ xử lý
    subs_dict = [{"start": s.start, "end": s.end, "text": s.text} for s in request.subtitles]
    
    # Kích hoạt Giai đoạn 2
    background_tasks.add_task(bg_burn_video, request.job_id, subs_dict, job.subtitle_position_y, job.background_opacity)
    
    return JSONResponse({"status": "burning", "job_id": request.job_id})

@app.get("/api/status/{job_id}")
async def get_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    response = {
        "job_id": job.id,
        "status": job.status
    }
    
    # Nếu AI tách chữ xong, đóng gói file JSON gửi về cho giao diện
    if job.status == "transcribed":
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
        })
    return result

# 2. API Tải file SRT
@app.get("/api/download_srt/{job_id}")
async def download_srt(job_id: str):
    srt_path = f"uploads/subtitle/{job_id}_temp.srt"
    if not os.path.exists(srt_path):
        # Nếu không có SRT thì trả về file JSON (Có thể người dùng chưa chạy ép video)
        json_path = f"uploads/subtitle/{job_id}.json"
        if not os.path.exists(json_path):
            raise HTTPException(status_code=404, detail="Không tìm thấy file phụ đề")
        return FileResponse(path=json_path, filename=f"PhuDe_{job_id}.json")
        
    return FileResponse(path=srt_path, filename=f"PhuDe_{job_id}.srt")

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
                # Xóa file vật lý
                if job.original_video_path and os.path.exists(job.original_video_path):
                    os.remove(job.original_video_path)
                if job.hardsub_video_path and os.path.exists(job.hardsub_video_path):
                    os.remove(job.hardsub_video_path)
                
                json_path = f"uploads/subtitle/{job.id}.json"
                if os.path.exists(json_path): os.remove(json_path)
                
                srt_path = f"uploads/subtitle/{job.id}_temp.srt"
                if os.path.exists(srt_path): os.remove(srt_path)
                
                # Xóa khỏi DB
                db.delete(job)
                
            db.commit()
            print(f"Đã dọn dẹp {len(old_jobs)} dự án quá hạn (20 ngày).")
        except Exception as e:
            print("Lỗi dọn rác:", e)
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
@app.get("/admin/jobs")
async def get_all_jobs(db: Session = Depends(get_db)):
    # Query kết hợp (Join) giữa bảng VideoJob và bảng User để lấy Email
    # Giả sử bạn dùng bảng VideoJob làm gốc
    jobs = db.query(VideoJob).order_by(VideoJob.created_at.desc()).all()
    
    result = []
    for job in jobs:
        result.append({
            "id": job.id,
            "filename": job.filename,
            "user_email": job.user_email, # Hoặc lấy từ mối quan hệ ForeignKey
            "status": job.status,
            "created_at": job.created_at.isoformat()
        })
    return {"jobs": result}

from pydantic import BaseModel

# Khai báo cấu trúc dữ liệu cấu hình nhận được từ Frontend
class ConfigSchema(BaseModel):
    whisper_model: str

# API cập nhật cấu hình
@app.post("/admin/config")
async def update_config(config: ConfigSchema):
    try:
        # Ở đây bạn có thể lưu vào Database hoặc ghi đè vào file .env
        # Demo: In ra terminal để kiểm tra
        print(f"--- Đã nhận cấu hình mới ---")
        print(f"Model Whisper được chọn: {config.whisper_model}")
        
        # Giả sử bạn lưu vào một biến toàn cục hoặc file
        # update_env_file("WHISPER_MODEL", config.whisper_model)

        return {"message": "Cập nhật cấu hình thành công!", "status": "success"}
    except Exception as e:
        return {"message": str(e), "status": "error"}
    
# Biến lưu trạng thái (trong thực tế nên lưu vào Database hoặc Redis)
from pydantic import BaseModel

class MaintenanceRequest(BaseModel):
    status: bool

system_settings = {"maintenance_mode": False}

@app.post("/admin/maintenance")
async def toggle_maintenance(req: MaintenanceRequest):
    system_settings["maintenance_mode"] = req.status
    return {"status": "success", "maintenance_mode": system_settings["maintenance_mode"]}

@app.get("/admin/system-status")
async def get_status():
    return system_settings
# 1. Danh sách IP bị chặn (Nên lưu vào DB hoặc File)
blacklisted_ips = set()

class IPCheck(BaseModel):
    ip: str

# 2. Route nhận lệnh chặn từ Admin
@app.post("/admin/blacklist")
async def add_to_blacklist(data: IPCheck):
    blacklisted_ips.add(data.ip)
    print(f"--- Đã chặn IP: {data.ip} ---")
    return {"message": "Thêm vào danh sách đen thành công"}

# 3. Middleware: Kiểm tra mọi yêu cầu đến Server
@app.middleware("http")
async def block_blacklisted_ips(request: Request, call_next):
    client_ip = request.client.host
    if client_ip in blacklisted_ips:
        return JSONResponse(status_code=403, content={"detail": "Địa chỉ IP của bạn đã bị chặn."})
    return await call_next(request)