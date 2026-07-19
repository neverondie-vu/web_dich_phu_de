from typing import Dict, List, Literal

from pydantic import BaseModel, Field


class SubtitleItem(BaseModel):
    start: str
    end: str
    text: str
    speaker: Literal["A", "B"] = "A"


class BurnRequest(BaseModel):
    job_id: str
    subtitles: List[SubtitleItem]
    subtitle_position_y: int | None = Field(default=None, ge=5, le=4000)
    subtitle_position_percent: float | None = Field(default=None, ge=2, le=45)
    background_opacity: float | None = Field(default=None, ge=0, le=1)
    background_color: str = Field(default="#000000", pattern=r"^#[0-9a-fA-F]{6}$")
    text_color: str = Field(default="#ffffff", pattern=r"^#[0-9a-fA-F]{6}$")
    font_size: int = Field(default=24, ge=12, le=4000)
    font_family: Literal["Arial", "Tahoma", "Verdana", "Times New Roman", "Georgia", "Courier New"] = "Arial"
    tts_language: str = Field(default="vi", min_length=2, max_length=10)
    tts_voice: str = Field(default="edge:vi-VN-HoaiMyNeural", max_length=120)
    tts_speed: float = Field(default=1.0, ge=0.5, le=1.8)
    tts_pitch: float = Field(default=0.0, ge=-12, le=12)
    tts_volume: float = Field(default=1.0, ge=0.3, le=2.0)
    reduce_original_voice: bool = True


class SubtitleUpdateRequest(BaseModel):
    subtitles: List[SubtitleItem]


class SpeakerVoiceConfig(BaseModel):
    voice: str = Field(default="", max_length=120)
    speed: float = Field(default=1.0, ge=0.5, le=1.8)
    pitch: float = Field(default=0.0, ge=-12, le=12)
    volume: float = Field(default=1.0, ge=0.3, le=2.0)


class TTSRequest(BaseModel):
    job_id: str | None = None
    text: str | None = Field(default=None, max_length=5000)
    start: str = "00:00:00.000"
    end: str = "00:00:02.000"
    subtitles: List[SubtitleItem] = Field(default_factory=list)
    language: str = Field(default="vi", min_length=2, max_length=10)
    voice: str = Field(default="", max_length=120)
    speed: float = Field(default=1.0, ge=0.5, le=1.8)
    pitch: float = Field(default=0.0, ge=-12, le=12)
    volume: float = Field(default=1.0, ge=0.3, le=2.0)
    speaker: Literal["A", "B"] = "A"
    voice_config: Dict[Literal["A", "B"], SpeakerVoiceConfig] = Field(default_factory=dict)
    mode: Literal["segment", "full"] = "segment"
    selected_indexes: List[int] = Field(default_factory=list)


class ConfigSchema(BaseModel):
    whisper_model: str
    translation_provider: Literal["nllb", "google", "gpt"] = "nllb"
    max_storage_gb: int = Field(default=100, ge=1, le=10000)
    retention_days: int = Field(default=20, ge=1, le=365)


class MaintenanceRequest(BaseModel):
    status: bool


class IPCheck(BaseModel):
    ip: str
