"""Civic disruption NLP — Hugging Face or keyword fallback."""

from pathlib import Path
from typing import Any

nlp_model = None

BASE_DIR = Path(__file__).resolve().parent.parent
NLP_DIR = BASE_DIR / "ml" / "models" / "civic_classifier"

CIVIC_KEYWORDS = [
    "curfew",
    "section 144",
    "riot",
    "bandh",
    "strike",
    "shutdown",
    "protest block",
    "police barricade",
    "zone closure",
    "prohibitory orders",
]


def load_nlp_model() -> None:
    global nlp_model
    try:
        import spacy

        spacy.blank("en")
        print("spaCy blank pipeline initialized")
    except Exception as e:
        print(f"spaCy init skipped: {e}")
    try:
        if NLP_DIR.exists() and any(NLP_DIR.iterdir()):
            from transformers import pipeline

            nlp_model = pipeline(
                "text-classification",
                model=str(NLP_DIR),
                tokenizer=str(NLP_DIR),
            )
            print("NLP model loaded")
        else:
            nlp_model = None
            print("NLP using keyword fallback (no model dir)")
    except Exception as e:
        nlp_model = None
        print(f"NLP using keyword fallback ({e})")


def classify_article(title: str, description: str) -> dict[str, Any]:
    text = f"{title}. {description}".lower()
    if nlp_model is not None:
        try:
            result = nlp_model(text[:512])[0]
            label = result.get("label", "NORMAL")
            score = float(result.get("score", 0.5))
            is_disruption = label == "DISRUPTION" and score > 0.85
            return {
                "label": label,
                "confidence": score,
                "is_disruption": is_disruption,
            }
        except Exception:
            pass

    matches = sum(1 for k in CIVIC_KEYWORDS if k in text)
    conf = min(0.6 + matches * 0.1, 0.95)
    return {
        "label": "DISRUPTION" if matches >= 2 else "NORMAL",
        "confidence": conf,
        "is_disruption": matches >= 2,
    }
