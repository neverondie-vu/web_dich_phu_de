from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from dotenv import load_dotenv

# Tải cấu hình từ file .env
load_dotenv()

# Lấy đường dẫn kết nối Database
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "mysql+pymysql://root:123456@localhost:3306/subtitle_saas"
)

# KHỞI TẠO ENGINE (Đây chính là biến mà main.py đang tìm kiếm)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Khởi tạo phiên làm việc với Database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class để tạo models
Base = declarative_base()

def get_db():
    """Hàm cung cấp kết nối Database cho các API"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()