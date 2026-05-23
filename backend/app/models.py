from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from datetime import datetime
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(100), primary_key=True, index=True)
    email = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)
    role = Column(String(50), default="user")
    plan = Column(String(50), default="free")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(String(50), primary_key=True, index=True)
    job_id = Column(String(50), ForeignKey("video_jobs.id"), nullable=False, index=True)
    user_id = Column(String(100), ForeignKey("users.id"), nullable=True, index=True)
    original_filename = Column(String(255), nullable=False)
    media_type = Column(String(20), nullable=False)  # video/audio
    source_language = Column(String(10), nullable=False)
    file_path = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Subtitle(Base):
    __tablename__ = "subtitles"

    id = Column(String(50), primary_key=True, index=True)
    job_id = Column(String(50), ForeignKey("video_jobs.id"), nullable=False, index=True)
    media_file_id = Column(String(50), ForeignKey("media_files.id"), nullable=True, index=True)
    target_language = Column(String(10), default="vi")
    json_path = Column(String(255), nullable=True)
    srt_path = Column(String(255), nullable=True)
    segment_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProcessingHistory(Base):
    __tablename__ = "processing_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(50), ForeignKey("video_jobs.id"), nullable=False, index=True)
    user_id = Column(String(100), ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

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
