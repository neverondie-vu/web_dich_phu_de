import base64
import os
from typing import Literal

from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from dotenv import load_dotenv


router = APIRouter(prefix="/api/creative", tags=["creative-studio"])
load_dotenv()


class CreativeTextRequest(BaseModel):
    source_text: str = Field(min_length=2, max_length=30000)
    action: Literal["translate", "rewrite", "commentary", "visual-plan"]
    target_language: str = Field(default="Tiếng Việt", max_length=60)
    tone: str = Field(default="Tự nhiên, rõ ràng", max_length=120)
    rights_confirmed: bool = False


class ThumbnailRequest(BaseModel):
    title: str = Field(min_length=2, max_length=180)
    direction: str = Field(default="Nổi bật, hiện đại, dễ đọc trên di động", max_length=1000)
    reference_image: str | None = Field(default=None, max_length=12_000_000)
    rights_confirmed: bool = False


def _client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Chưa cấu hình GEMINI_API_KEY cho Creative Studio.")
    return genai.Client(api_key=api_key)


@router.post("/text")
async def create_text(request: CreativeTextRequest):
    if not request.rights_confirmed:
        raise HTTPException(status_code=400, detail="Bạn cần xác nhận có quyền sử dụng nội dung nguồn.")

    instructions = {
        "translate": (
            f"Dịch sang {request.target_language}. Giữ nguyên timecode nếu đầu vào là SRT/VTT. "
            "Văn phong tự nhiên, không thêm lời giải thích ngoài bản dịch."
        ),
        "rewrite": (
            f"Viết một kịch bản mới bằng {request.target_language}, giọng {request.tone}. "
            "Giữ ý chính và dữ kiện cần thiết nhưng thay đổi cấu trúc, cách diễn đạt và nhịp kể; "
            "không sao chép câu chữ hoặc bắt chước sát phong cách của tác giả nguồn."
        ),
        "commentary": (
            f"Viết phần phân tích, nhận xét và giải thích bằng {request.target_language}, giọng {request.tone}. "
            "Nêu góc nhìn riêng, luận điểm rõ ràng và phân biệt dữ kiện với nhận định."
        ),
        "visual-plan": (
            f"Tạo shot list bằng {request.target_language} cho một video nguyên bản. "
            "Mỗi cảnh gồm: thời lượng, lời đọc, hình minh họa/hoạt hình tự tạo và chữ trên màn hình. "
            "Không đề xuất tái sử dụng khung hình có bản quyền từ video nguồn."
        ),
    }
    prompt = (
        "Bạn là biên tập viên video giàu kinh nghiệm. Chỉ trả về thành phẩm, không mở đầu xã giao.\n\n"
        f"Yêu cầu: {instructions[request.action]}\n\nNội dung tham khảo:\n{request.source_text}"
    )

    try:
        response = _client().models.generate_content(
            model=os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash"),
            contents=prompt,
        )
        result = (response.text or "").strip()
        if not result:
            raise RuntimeError("Gemini không trả về nội dung")
        return {"result": result, "action": request.action}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không thể xử lý nội dung với Gemini: {exc}") from exc


@router.post("/thumbnail")
async def create_thumbnail(request: ThumbnailRequest):
    if not request.rights_confirmed:
        raise HTTPException(status_code=400, detail="Bạn cần xác nhận có quyền sử dụng ảnh tham chiếu.")

    contents: list = [
        (
            "Thiết kế ảnh bìa video tỷ lệ 16:9, bố cục nguyên bản, tương phản cao, dễ đọc trên màn hình nhỏ. "
            f"Tiêu đề: {request.title}. Chỉ dẫn nghệ thuật: {request.direction}. "
            "Không thêm logo nền tảng, watermark hoặc nhân vật có bản quyền. "
            "Nếu có ảnh tham chiếu, chỉ dùng làm dữ liệu do người dùng sở hữu để thiết kế lại bố cục."
        )
    ]

    if request.reference_image:
        try:
            header, encoded = request.reference_image.split(",", 1)
            mime_type = header.split(";")[0].split(":", 1)[1]
            if mime_type not in {"image/jpeg", "image/png", "image/webp"}:
                raise ValueError("Định dạng ảnh không được hỗ trợ")
            contents.append(types.Part.from_bytes(data=base64.b64decode(encoded), mime_type=mime_type))
        except (ValueError, IndexError) as exc:
            raise HTTPException(status_code=400, detail="Ảnh tham chiếu không hợp lệ.") from exc

    try:
        response = _client().models.generate_content(
            model=os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"),
            contents=contents,
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
        )
        for candidate in response.candidates or []:
            for part in candidate.content.parts or []:
                if part.inline_data and part.inline_data.data:
                    mime_type = part.inline_data.mime_type or "image/png"
                    encoded = base64.b64encode(part.inline_data.data).decode("ascii")
                    return {"image": f"data:{mime_type};base64,{encoded}", "description": part.text or ""}
        raise RuntimeError("Gemini không trả về ảnh")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Không thể tạo ảnh bìa với Gemini: {exc}") from exc
