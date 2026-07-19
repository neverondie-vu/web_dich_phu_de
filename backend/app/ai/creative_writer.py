import json
import os
import re

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()


def _json_array(text: str) -> list[str]:
    cleaned = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", cleaned, flags=re.DOTALL | re.IGNORECASE)
    if fenced:
        cleaned = fenced.group(1).strip()
    start, end = cleaned.find("["), cleaned.rfind("]")
    if start < 0 or end <= start:
        raise ValueError("Gemini did not return a JSON array")
    result = json.loads(cleaned[start:end + 1])
    if not isinstance(result, list) or not all(isinstance(item, str) for item in result):
        raise ValueError("Gemini returned an invalid script array")
    return result


def rewrite_subtitle_script(subtitles: list[dict], tone: str = "Tự nhiên, rõ ràng") -> list[dict]:
    """Rewrite translated subtitle text while preserving every original time range."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or not subtitles:
        return subtitles

    client = genai.Client(api_key=api_key)
    rewritten: list[dict] = []
    batch_size = max(5, min(50, int(os.getenv("GEMINI_REWRITE_BATCH_SIZE", "30"))))

    for offset in range(0, len(subtitles), batch_size):
        batch = subtitles[offset:offset + batch_size]
        source_texts = [str(item.get("text", "")).strip() for item in batch]
        prompt = (
            "Bạn là biên kịch video tiếng Việt. Viết lại từng câu thành lời kể mới, tự nhiên và dễ đọc bằng TTS. "
            "Giữ nguyên ý và dữ kiện, nhưng thay đổi cách diễn đạt; không thêm lời chào, số thứ tự hay markdown. "
            "Câu mới phải đủ ngắn để đọc trong đúng khoảng thời gian của phụ đề gốc. "
            f"Giọng văn: {tone}. Trả về DUY NHẤT một JSON array gồm đúng {len(source_texts)} chuỗi, cùng thứ tự.\n"
            f"Đầu vào: {json.dumps(source_texts, ensure_ascii=False)}"
        )
        response = client.models.generate_content(
            model=os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash"),
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=list[str],
            ),
        )
        try:
            new_texts = _json_array(response.text or "")
        except (ValueError, json.JSONDecodeError):
            new_texts = source_texts
        if len(new_texts) != len(batch):
            new_texts = source_texts
        rewritten.extend({**item, "text": text.strip()} for item, text in zip(batch, new_texts))

    return rewritten
