import os
from threading import Lock

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

model_name = os.getenv("NLLB_MODEL", "facebook/nllb-200-distilled-600M")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = model.to(device=device, dtype=torch.float16 if device.type == "cuda" else None)
model.eval()
translation_lock = Lock()

print(f"NLLB loaded on {device}.")


def translate_batch_to_vietnamese(texts: list[str], src_lang: str) -> list[str]:
    """Translate multiple subtitle segments in one model call."""
    if not texts:
        return []

    with translation_lock, torch.inference_mode():
        tokenizer.src_lang = src_lang
        inputs = tokenizer(
            texts,
            return_tensors="pt",
            padding=True,
            max_length=512,
            truncation=True,
        ).to(device)
        target_lang_id = tokenizer.convert_tokens_to_ids("vie_Latn")
        translated = model.generate(**inputs, forced_bos_token_id=target_lang_id)
        return tokenizer.batch_decode(translated, skip_special_tokens=True)


def translate_to_vietnamese(text: str, src_lang: str) -> str:
    """Translate one segment while keeping compatibility with existing callers."""
    return translate_batch_to_vietnamese([text], src_lang)[0]
