from typing import List, Literal

from pydantic import BaseModel, Field


class SubtitleItem(BaseModel):
    start: str
    end: str
    text: str


class BurnRequest(BaseModel):
    job_id: str
    subtitles: List[SubtitleItem]
    subtitle_position_y: int | None = Field(default=None, ge=5, le=500)
    background_opacity: float | None = Field(default=None, ge=0, le=1)
    background_color: str = Field(default="#000000", pattern=r"^#[0-9a-fA-F]{6}$")
    text_color: str = Field(default="#ffffff", pattern=r"^#[0-9a-fA-F]{6}$")
    font_size: int = Field(default=24, ge=12, le=72)
    font_family: Literal["Arial", "Tahoma", "Verdana", "Times New Roman", "Georgia", "Courier New"] = "Arial"


class SubtitleUpdateRequest(BaseModel):
    subtitles: List[SubtitleItem]


class ConfigSchema(BaseModel):
    whisper_model: str


class MaintenanceRequest(BaseModel):
    status: bool


class IPCheck(BaseModel):
    ip: str
