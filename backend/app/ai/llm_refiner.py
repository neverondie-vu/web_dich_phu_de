# app/ai/llm_refiner.py
from google import genai
import os
from dotenv import load_dotenv

# Tải biến môi trường (API Key) từ file .env
load_dotenv()

# Khởi tạo Client theo chuẩn SDK mới của Google
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def refine_subtitle_with_gemini(raw_srt: str) -> str:
    """Dùng Gemini 2.5 Flash để làm mượt văn bản SRT dịch thô"""
    try:
        print("5. Đang gửi cho Gemini 2.5 biên tập lại (Refinement)...")
        
        prompt = f"""
        Bạn là một chuyên gia biên dịch phụ đề video. 
        Dưới đây là nội dung file SRT đã được dịch thô sang tiếng Việt từ AI (có thể chứa nhiều từ Hán Việt hoặc dịch word-by-word ngô nghê).
        
        Nhiệm vụ của bạn:
        1. Giữ nguyên TUYỆT ĐỐI định dạng thời gian (00:00:00,000 --> 00:00:00,000) và số thứ tự đoạn. KHÔNG được làm mất hoặc xáo trộn bất kỳ block thời gian nào.
        2. Chỉnh sửa văn bản dịch tiếng Việt sao cho tự nhiên, mượt mà, đúng ngữ pháp và văn phong nói đời thường. 
        3. Nếu phát hiện thuật ngữ chuyên ngành (ví dụ: câu cá, xe cộ, game...), hãy dùng từ lóng chuyên ngành cho phù hợp.
        4. Trả về ĐÚNG định dạng chuẩn của file SRT. KHÔNG giải thích, KHÔNG chào hỏi, KHÔNG thêm bất kỳ ký tự nào ngoài nội dung file SRT.
        
        Nội dung SRT cần xử lý:
        {raw_srt}
        """
        
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text.strip()
    
    except Exception as e:
        print(f"Lỗi khi gọi Gemini: {e}")
        return raw_srt