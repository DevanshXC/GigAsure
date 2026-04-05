
"""
Hybrid Fraud Model:
- XGBoost (supervised)
- Isolation Forest (unsupervised)

Usage:
  python ml/train_fraud_model.py --csv path/to/data.csv
"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

RANDOM_STATE = 42

BASE_NUMERIC = [
    "duty_on_minutes_before_trigger",
    "orders_last_60min",
    "gps_accuracy_m",
    "velocity_kmh_last_ping",
    "gps_coordinate_jump_km",
    "co_claimants_same_event",
    "rider_claim_frequency_z_score",
    "days_active_last_30",
]

REQUIRED_BASE = BASE_NUMERIC + ["claim_id", "rider_id", "trigger_type"]


# ---------------- FEATURE ENGINEERING ----------------
def _engineer(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["reactive_duty"] = (out["duty_on_minutes_before_trigger"] < 2).astype(int)
    out["zero_orders"] = (out["orders_last_60min"] == 0).astype(int)
    out["suspicious_precision"] = (out["gps_accuracy_m"] < 8).astype(int)
    out["teleported"] = (out["gps_coordinate_jump_km"] > 4).astype(int)
    out["coordinated_ring"] = (out["co_claimants_same_event"] > 25).astype(int)
    out["low_activity"] = (out["days_active_last_30"] < 5).astype(int)
    return out


def _feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    eng = [
        "reactive_duty",
        "zero_orders",
        "suspicious_precision",
        "teleported",
        "coordinated_ring",
        "low_activity",
    ]
    return df[BASE_NUMERIC + eng].copy()


# ---------------- HYBRID PREDICTION ----------------
def hybrid_predict(bundle, X):
    scaler = bundle["scaler"]
    X_scaled = scaler.transform(X)

    xgb = bundle["xgb"]
    iso = bundle["iso"]

    # XGBoost probability
    if xgb is not None:
        xgb_prob = xgb.predict_proba(X_scaled)[:, 1]
    else:
        xgb_prob = np.zeros(X_scaled.shape[0])

    # Isolation Forest anomaly score
    iso_score = -iso.score_samples(X_scaled)

    # Normalize ISO score
    iso_score = (iso_score - iso_score.min()) / (
        iso_score.max() - iso_score.min() + 1e-8
    )

    # Combine scores
    final_score = 0.7 * xgb_prob + 0.3 * iso_score

    preds = (final_score > bundle["threshold"]).astype(int)

    return preds, final_score


# ---------------- MAIN TRAINING ----------------
def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    args = ap.parse_args()

    path = Path(args.csv).resolve()
    if not path.is_file():
        raise SystemExit(f"File not found: {path}")

    df = pd.read_csv(path)

    miss = [c for c in REQUIRED_BASE if c not in df.columns]
    if miss:
        raise SystemExit(f"Missing columns: {miss}")

    for c in BASE_NUMERIC:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    df = _engineer(df)
    X_df = _feature_frame(df)
    feature_names = list(X_df.columns)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_df.values)

    # ---------------- XGBOOST ----------------
    xgb_model = None
    has_fraud = "is_fraud" in df.columns

    if has_fraud:
        y = df["is_fraud"].astype(int)

        if y.nunique() >= 2:
            X_tr, X_te, y_tr, y_te = train_test_split(
                X_scaled,
                y.values,
                test_size=0.2,
                random_state=RANDOM_STATE,
                stratify=y,
            )

            xgb = XGBClassifier(
                random_state=RANDOM_STATE,
                n_jobs=-1,
                eval_metric="logloss",
            )

            grid = {
                "n_estimators": [100, 200],
                "max_depth": [3, 5],
                "scale_pos_weight": [2, 5],
            }

            gs = GridSearchCV(xgb, grid, cv=3, scoring="f1", n_jobs=-1)
            gs.fit(X_tr, y_tr)

            xgb_model = gs.best_estimator_

            pred = xgb_model.predict(X_te)
            proba = xgb_model.predict_proba(X_te)[:, 1]

            print("\nXGBoost Metrics:")
            print(f"Precision: {precision_score(y_te, pred):.4f}")
            print(f"Recall: {recall_score(y_te, pred):.4f}")
            print(f"F1: {f1_score(y_te, pred):.4f}")
            print(f"ROC-AUC: {roc_auc_score(y_te, proba):.4f}")
            print(f"Confusion matrix:\n{confusion_matrix(y_te, pred)}")

    # ---------------- ISOLATION FOREST ----------------
    iso = IsolationForest(
        n_estimators=200,
        contamination=0.15,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    iso.fit(X_scaled)

    print("\nIsolation Forest trained.")

    # ---------------- SAVE MODEL ----------------
    out_dir = Path(__file__).resolve().parent / "models"
    out_dir.mkdir(parents=True, exist_ok=True)

    bundle = {
        "xgb": xgb_model,
        "iso": iso,
        "scaler": scaler,
        "feature_names": feature_names,
        "threshold": 0.5,
        "trained_at": datetime.now().isoformat(),
    }

    pkl_path = out_dir / "fraud_model.pkl"
    joblib.dump(bundle, pkl_path)

    print("\nHybrid model saved.")
    print(f"Saved to {pkl_path}")


if __name__ == "__main__":
    main()
