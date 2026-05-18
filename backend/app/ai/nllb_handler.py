# app/ai/nllb_handler.py
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
import os

# Khởi tạo model NLLB
model_name = os.getenv("NLLB_MODEL", "facebook/nllb-200-distilled-600M")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

def translate_to_vietnamese(text: str, src_lang: str) -> str:
    """Dịch văn bản sang tiếng Việt"""
    tokenizer.src_lang = src_lang
    inputs = tokenizer(text, return_tensors='pt', max_length=512, truncation=True)
    
    # Đã sửa lỗi phiên bản mới tại đây:
    target_lang_id = tokenizer.convert_tokens_to_ids('vie_Latn')
    
    translated = model.generate(**inputs, forced_bos_token_id=target_lang_id)
    return tokenizer.decode(translated[0], skip_special_tokens=True)