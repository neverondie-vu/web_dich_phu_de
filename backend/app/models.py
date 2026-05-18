from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from .database import Base

class VideoJob(Base):
    __tablename__ = "video_jobs"

    id = Column(String(50), primary_key=True, index=True) # Chính là job_id (uuid)
    filename = Column(String(255))
    src_language = Column(String(10))
    status = Column(String(50), default="processing") # processing, completed, failed
    
    # Đường dẫn lưu file
    original_video_path = Column(String(255), nullable=True)
    srt_path = Column(String(255), nullable=True)
    hardsub_video_path = Column(String(255), nullable=True)
    
    # Cấu hình phụ đề (người dùng chọn)
    subtitle_position_y = Column(Integer, default=20)
    background_opacity = Column(Float, default=0.8)
    
    # === 2 CỘT MỚI QUẢN LÝ KHO LƯU TRỮ ===
    user_id = Column(String(100), index=True, nullable=True) # Lưu ID của User từ Firebase
    created_at = Column(DateTime, default=datetime.utcnow)