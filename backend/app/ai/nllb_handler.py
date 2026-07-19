import os
from threading import Lock

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

model_name = os.getenv("NLLB_MODEL", "facebook/nllb-200-distilled-600M")
tokenizer = None
model = None
device = None
model_lock = Lock()
translation_lock = Lock()


def get_nllb_model():
    """Load NLLB only when a translation job actually needs it."""
    global device, model, tokenizer

    if model is not None and tokenizer is not None:
        return tokenizer, model, device

    with model_lock:
        if model is None or tokenizer is None:
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            loaded_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            loaded_model = loaded_model.to(
                device=device,
                dtype=torch.float16 if device.type == "cuda" else None,
            )
            loaded_model.eval()
            model = loaded_model
            print(f"NLLB loaded on {device}.")

    return tokenizer, model, device


def translate_batch_to_vietnamese(texts: list[str], src_lang: str) -> list[str]:
    """Translate multiple subtitle segments in one model call."""
    if not texts:
        return []

    with translation_lock, torch.inference_mode():
        active_tokenizer, active_model, active_device = get_nllb_model()
        active_tokenizer.src_lang = src_lang
        inputs = active_tokenizer(
            texts,
            return_tensors="pt",
            padding=True,
            max_length=512,
            truncation=True,
        ).to(active_device)
        target_lang_id = active_tokenizer.convert_tokens_to_ids("vie_Latn")
        translated = active_model.generate(**inputs, forced_bos_token_id=target_lang_id)
        return active_tokenizer.batch_decode(translated, skip_special_tokens=True)


def translate_to_vietnamese(text: str, src_lang: str) -> str:
    """Translate one segment while keeping compatibility with existing callers."""
    return translate_batch_to_vietnamese([text], src_lang)[0]
