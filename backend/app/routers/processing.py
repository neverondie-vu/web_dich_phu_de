import json
import mimetypes
import os
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app import models
from app.config import ALLOWED_AUDIO_EXTENSIONS, ALLOWED_VIDEO_EXTENSIONS
from app.database import get_db
from app.schemas import BurnRequest, SubtitleUpdateRequest, TTSRequest
from app.services.media_storage import (
    create_media_file_record,
    ensure_user_record,
    is_audio_path,
    log_processing_history,
    resolve_upload_path,
    save_upload_file,
    upsert_subtitle_record,
    write_subtitle_files,
)
from app.services.tts_service import TTSConfigurationError, synthesize_full_narration, synthesize_segments
from app.tasks import burn_video_task, extract_subtitles_task


router = APIRouter(prefix="/api", tags=["processing"])


@router.post("/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    src_language: str = Form("en"),
    subtitle_position_y: int = Form(20),
    background_opacity: float = Form(0.8),
    user_id: str = Form(None),
    user_email: str = Form(None),
    username: str = Form(None),
    db: Session = Depends(get_db),
):
    job_id = str(uuid.uuid4())
    filename, file_path = save_upload_file(file, "uploads/video", job_id, ALLOWED_VIDEO_EXTENSIONS)
    mime_type = file.content_type or mimetypes.guess_type(filename)[0]
    ensure_user_record(db, user_id, email=user_email, username=username)
    db.add(models.VideoJob(
        id=job_id,
        filename=filename,
        src_language=src_language,
        status="processing",
        original_video_path=file_path,
        subtitle_position_y=subtitle_position_y,
        background_opacity=background_opacity,
        user_id=user_id,
    ))
    db.flush()
    create_media_file_record(db, job_id, user_id, filename, "video", src_language, file_path, mime_type)
    log_processing_history(db, job_id, user_id, "upload", "queued")
    db.commit()
    background_tasks.add_task(extract_subtitles_task, file_path, src_language, job_id)
    return JSONResponse({"status": "queued", "job_id": job_id, "media_type": "video"})


@router.post("/upload-audio")
async def upload_audio(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    src_language: str = Form("en"),
    user_id: str = Form(None),
    user_email: str = Form(None),
    username: str = Form(None),
    db: Session = Depends(get_db),
):
    job_id = str(uuid.uuid4())
    filename, file_path = save_upload_file(file, "uploads/audio", job_id, ALLOWED_AUDIO_EXTENSIONS)
    mime_type = file.content_type or mimetypes.guess_type(filename)[0]
    ensure_user_record(db, user_id, email=user_email, username=username)
    db.add(models.VideoJob(
        id=job_id,
        filename=filename,
        src_language=src_language,
        status="processing",
        original_video_path=file_path,
        subtitle_position_y=0,
        background_opacity=0,
        user_id=user_id,
    ))
    db.flush()
    create_media_file_record(db, job_id, user_id, filename, "audio", src_language, file_path, mime_type)
    log_processing_history(db, job_id, user_id, "upload", "queued")
    db.commit()
    background_tasks.add_task(extract_subtitles_task, file_path, src_language, job_id, "completed")
    return JSONResponse({"status": "queued", "job_id": job_id, "media_type": "audio"})


@router.post("/burn")
async def burn_video(request: BurnRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == request.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if is_audio_path(job.original_video_path):
        raise HTTPException(status_code=400, detail="Audio chỉ hỗ trợ xuất SRT")
    job.status = "burning"
    if request.subtitle_position_y is not None:
        job.subtitle_position_y = request.subtitle_position_y
    if request.background_opacity is not None:
        job.background_opacity = request.background_opacity
    subtitles = [{"start": item.start, "end": item.end, "text": item.text, "speaker": item.speaker} for item in request.subtitles]
    json_path, srt_path = write_subtitle_files(request.job_id, subtitles)
    job.srt_path = srt_path
    upsert_subtitle_record(db, request.job_id, json_path, srt_path, len(subtitles))
    log_processing_history(db, request.job_id, job.user_id, "burn_subtitles", "queued")
    db.commit()
    background_tasks.add_task(
        burn_video_task,
        request.job_id,
        subtitles,
        job.subtitle_position_y,
        job.background_opacity,
        request.background_color,
        request.text_color,
        request.font_size,
        request.font_family,
        request.tts_language,
        request.tts_voice,
        request.tts_speed,
        request.tts_pitch,
        request.tts_volume,
        request.reduce_original_voice,
        request.subtitle_position_percent,
    )
    return JSONResponse({"status": "burning", "job_id": request.job_id})


@router.put("/subtitles/{job_id}")
async def update_subtitles(job_id: str, request: SubtitleUpdateRequest, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    subtitles = [{"start": item.start, "end": item.end, "text": item.text, "speaker": item.speaker} for item in request.subtitles]
    json_path, srt_path = write_subtitle_files(job_id, subtitles)
    job.srt_path = srt_path
    upsert_subtitle_record(db, job_id, json_path, srt_path, len(subtitles))
    log_processing_history(db, job_id, job.user_id, "edit_subtitles", "completed")
    db.commit()
    return {"status": "saved", "job_id": job_id, "subtitle_count": len(subtitles), "srt_url": f"/api/download_srt/{job_id}"}


@router.post("/tts")
async def create_subtitle_voice(request: TTSRequest, db: Session = Depends(get_db)):
    subtitles = [{"start": item.start, "end": item.end, "text": item.text, "speaker": item.speaker} for item in request.subtitles]
    if request.text and not subtitles:
        subtitles = [{
            "start": request.start,
            "end": request.end,
            "text": request.text,
            "speaker": request.speaker,
        }]
    if not subtitles:
        raise HTTPException(status_code=400, detail="Chua co phu de de tao giong doc")

    job = None
    if request.job_id:
        job = db.query(models.VideoJob).filter(models.VideoJob.id == request.job_id).first()

    try:
        if job:
            log_processing_history(db, request.job_id, job.user_id, "text_to_speech", "processing")
            db.commit()

        selected = request.selected_indexes if request.mode == "segment" else []
        if request.mode == "full":
            output_path = synthesize_full_narration(
                subtitles,
                request.job_id,
                request.language,
                request.voice,
                request.speed,
                request.pitch,
                request.volume,
                {key: value.model_dump() for key, value in request.voice_config.items()},
            )
            segments = []
            audio_url = f"/api/tts/audio/{os.path.basename(output_path)}"
        else:
            segments = synthesize_segments(
                subtitles,
                request.job_id,
                request.language,
                request.voice,
                request.speed,
                selected,
                request.pitch,
                request.volume,
                {key: value.model_dump() for key, value in request.voice_config.items()},
            )
            audio_url = segments[0]["url"]
        response = {"status": "completed", "mode": request.mode, "segments": segments, "audio_url": audio_url}

        if job:
            log_processing_history(db, request.job_id, job.user_id, "text_to_speech", "completed")
            db.commit()
        return response
    except TTSConfigurationError as exc:
        if job:
            log_processing_history(db, request.job_id, job.user_id, "text_to_speech", "failed", str(exc))
            db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        if job:
            log_processing_history(db, request.job_id, job.user_id, "text_to_speech", "failed", str(exc))
            db.commit()
        raise HTTPException(status_code=500, detail=f"Khong the tao giong doc: {exc}") from exc


@router.get("/tts/audio/{filename}")
async def download_tts_audio(filename: str):
    extension = os.path.splitext(filename.lower())[1]
    if os.path.basename(filename) != filename or extension not in {".wav", ".mp3"}:
        raise HTTPException(status_code=400, detail="Ten file audio khong hop le")
    audio_path = resolve_upload_path(f"uploads/tts/{filename}")
    if not audio_path:
        raise HTTPException(status_code=404, detail="Khong tim thay file audio")
    media_type = "audio/mpeg" if extension == ".mp3" else "audio/wav"
    return FileResponse(path=audio_path, filename=filename, media_type=media_type)


@router.get("/status/{job_id}")
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
        "has_dubbed": bool(job.hardsub_video_path and os.path.exists(job.hardsub_video_path.rsplit(".", 1)[0] + "_dubbed.mp4")),
    }
    json_path = f"uploads/subtitle/{job_id}.json"
    if job.status in {"transcribed", "completed"} and os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as subtitle_file:
            response["subtitles"] = json.load(subtitle_file)
    return response


@router.get("/download/{job_id}")
async def download_video(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job or job.status != "completed" or not job.hardsub_video_path:
        raise HTTPException(status_code=404, detail="Video chưa sẵn sàng")
    if not os.path.exists(job.hardsub_video_path):
        raise HTTPException(status_code=404, detail="File vật lý không tìm thấy")
    return FileResponse(
        path=job.hardsub_video_path,
        filename=f"PhuDe_{job.filename}",
        media_type="video/mp4",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/download_dubbed/{job_id}")
async def download_dubbed_video(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job or job.status != "completed" or not job.hardsub_video_path:
        raise HTTPException(status_code=404, detail="Video long tieng chua san sang")
    dubbed_path = job.hardsub_video_path.rsplit(".", 1)[0] + "_dubbed.mp4"
    if not os.path.exists(dubbed_path):
        raise HTTPException(status_code=404, detail="Khong tim thay video long tieng")
    return FileResponse(
        path=dubbed_path,
        filename=f"LongTieng_{job.filename}",
        media_type="video/mp4",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/original/{job_id}")
async def get_original_media(job_id: str, db: Session = Depends(get_db)):
    job = db.query(models.VideoJob).filter(models.VideoJob.id == job_id).first()
    if not job or not job.original_video_path or not os.path.exists(job.original_video_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy file gốc")
    media_type = mimetypes.guess_type(job.original_video_path)[0] or "application/octet-stream"
    return FileResponse(path=job.original_video_path, filename=job.filename, media_type=media_type)
