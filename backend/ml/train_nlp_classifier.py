"""
Fine-tune DistilBERT for civic disruption vs normal (saves ml/models/civic_classifier/).

Usage (from gigsure/backend):
  python ml/train_nlp_classifier.py --csv path/to/data.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from torch.utils.data import Dataset
from transformers import (
    DistilBertForSequenceClassification,
    DistilBertTokenizer,
    Trainer,
    TrainingArguments,
)

RANDOM_STATE = 42
MODEL_NAME = "distilbert-base-uncased"


class TextDataset(Dataset):
    def __init__(self, encodings: dict, labels: list[int]):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx: int) -> dict:
        item = {k: torch.tensor(v[idx]) for k, v in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
        return item

    def __len__(self) -> int:
        return len(self.labels)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    args = ap.parse_args()
    path = Path(args.csv).resolve()
    if not path.is_file():
        raise SystemExit(f"File not found: {path}")

    df = pd.read_csv(path)
    for col in ("text", "label", "confidence"):
        if col not in df.columns:
            raise SystemExit(f"CSV must have columns: text, label, confidence (missing {col})")

    df = df[df["confidence"] >= 0.85].copy()
    df["label_enc"] = (df["label"].astype(str).str.upper() == "DISRUPTION").astype(int)

    n = len(df)
    if n < 200:
        print(
            "Warning: Small dataset. Consider using keyword fallback for production. "
            "Model may overfit."
        )

    texts = df["text"].astype(str).tolist()
    labels = df["label_enc"].tolist()

    tokenizer = DistilBertTokenizer.from_pretrained(MODEL_NAME)
    model = DistilBertForSequenceClassification.from_pretrained(
        MODEL_NAME, num_labels=2
    )

    strat = labels if len(set(labels)) > 1 else None
    tr_texts, te_texts, tr_y, te_y = train_test_split(
        texts, labels, test_size=0.2, random_state=RANDOM_STATE, stratify=strat
    )

    tr_enc = tokenizer(
        tr_texts,
        truncation=True,
        padding=True,
        max_length=128,
        return_tensors=None,
    )
    te_enc = tokenizer(
        te_texts,
        truncation=True,
        padding=True,
        max_length=128,
        return_tensors=None,
    )

    train_ds = TextDataset(dict(tr_enc), tr_y)
    eval_ds = TextDataset(dict(te_enc), te_y)

    out_dir = Path(__file__).resolve().parent / "models" / "civic_classifier"
    out_dir.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(out_dir / "trainer_output"),
        learning_rate=2e-5,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        num_train_epochs=3,
        warmup_steps=100,
        weight_decay=0.01,
        logging_steps=50,
        evaluation_strategy="epoch",
        save_strategy="no",
        load_best_model_at_end=False,
        report_to="none",
    )

    def compute_metrics(eval_pred):
        logits = eval_pred.predictions
        lab = eval_pred.label_ids
        preds = np.argmax(logits, axis=-1)
        return {
            "accuracy": float(accuracy_score(lab, preds)),
            "f1": float(f1_score(lab, preds, zero_division=0)),
        }

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        compute_metrics=compute_metrics,
    )
    trainer.train()

    preds = trainer.predict(eval_ds).predictions
    pred_ids = np.argmax(preds, axis=-1)
    acc = accuracy_score(te_y, pred_ids)
    prec = precision_score(te_y, pred_ids, zero_division=0)
    rec = recall_score(te_y, pred_ids, zero_division=0)
    f1 = f1_score(te_y, pred_ids, zero_division=0)

    model.save_pretrained(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))

    print("\nNLP classifier trained.")
    print(f"Accuracy: {acc:.4f}, F1: {f1:.4f}")
    print(f"(Precision: {prec:.4f}, Recall: {rec:.4f})")
    print(f"Saved to ml/models/civic_classifier/")


if __name__ == "__main__":
    main()
