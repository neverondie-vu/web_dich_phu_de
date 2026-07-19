import json
import os


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYSTEM_SETTINGS_FILE = os.path.join(BASE_DIR, "data", "system_settings.json")

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://127.0.0.1:3000,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

ALLOWED_VIDEO_EXTENSIONS = {"mp4"}
ALLOWED_AUDIO_EXTENSIONS = {"mp3", "wav", "m4a"}

DEFAULT_SYSTEM_SETTINGS = {
    "maintenance_mode": False,
    "blacklisted_ips": [],
    "whisper_model": "small",
    "translation_provider": "nllb",
    "max_storage_gb": 100,
    "retention_days": 20,
}


def load_system_settings() -> dict:
    try:
        with open(SYSTEM_SETTINGS_FILE, "r", encoding="utf-8") as settings_file:
            saved_settings = json.load(settings_file)
        return {**DEFAULT_SYSTEM_SETTINGS, **saved_settings}
    except (FileNotFoundError, json.JSONDecodeError):
        return DEFAULT_SYSTEM_SETTINGS.copy()


system_settings = load_system_settings()


def reload_system_settings() -> dict:
    system_settings.clear()
    system_settings.update(load_system_settings())
    return system_settings


def save_system_settings() -> None:
    system_settings.update({**DEFAULT_SYSTEM_SETTINGS, **system_settings})
    os.makedirs(os.path.dirname(SYSTEM_SETTINGS_FILE), exist_ok=True)
    with open(SYSTEM_SETTINGS_FILE, "w", encoding="utf-8") as settings_file:
        json.dump(system_settings, settings_file, ensure_ascii=False, indent=2)


def ensure_runtime_directories() -> None:
    os.makedirs("uploads/video", exist_ok=True)
    os.makedirs("uploads/audio", exist_ok=True)
    os.makedirs("uploads/subtitle", exist_ok=True)
    os.makedirs("uploads/tts", exist_ok=True)
