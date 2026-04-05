"""
Train three XGBoost regressors for p_weather, p_civic, p_pollution (risk_model.pkl).

Usage (from gigsure/backend):
  python ml/train_risk_model.py --csv path/to/data.csv
"""

from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from xgboost import XGBRegressor

RANDOM_STATE = 42

REQUIRED_COLS = [
    "zone_id",
    "city",
    "week_start_date",
    "month",
    "season",
    "avg_rainfall_mm_day",
    "max_temp_c",
    "aqi_avg",
    "aqi_max",
    "civic_incidents_count",
    "flood_zone_tier",
    "p_weather_actual",
    "p_civic_actual",
    "p_pollution_actual",
]

GRID = {
    "n_estimators": [100, 200, 300],
    "max_depth": [3, 5, 7],
    "learning_rate": [0.05, 0.1, 0.2],
    "subsample": [0.8, 1.0],
}


def _engineer(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["month"] = pd.to_numeric(out["month"], errors="coerce")
    m2 = pd.to_datetime(out["week_start_date"], errors="coerce").dt.month
    out["month"] = out["month"].fillna(m2)
    out["month"] = out["month"].fillna(1).astype(int).clip(1, 12)
    out["city_norm"] = out["city"].astype(str).str.strip().str.lower()
    out["is_monsoon_month"] = out["month"].isin([6, 7, 8, 9]).astype(int)
    out["is_delhi_aqi_season"] = (
        (out["city_norm"] == "delhi") & (out["month"].isin([10, 11, 12, 1, 2]))
    ).astype(int)
    out["rainfall_above_threshold"] = (out["avg_rainfall_mm_day"] > 20).astype(int)
    return out


def _build_weather_matrix(
    df: pd.DataFrame, season_ohe: OneHotEncoder, season_cols: list[str]
) -> pd.DataFrame:
    smat = season_ohe.transform(df[["season"]].astype(str))
    season_df = pd.DataFrame(smat, columns=season_cols, index=df.index)
    base = df[
        [
            "avg_rainfall_mm_day",
            "max_temp_c",
            "month",
            "is_monsoon_month",
            "flood_zone_tier",
            "city_encoded",
        ]
    ].copy()
    return pd.concat([base, season_df], axis=1)


def _build_civic_matrix(df: pd.DataFrame) -> pd.DataFrame:
    return df[
        ["civic_incidents_count", "month", "city_encoded", "flood_zone_tier"]
    ].copy()


def _build_pollution_matrix(df: pd.DataFrame) -> pd.DataFrame:
    return df[
        ["aqi_avg", "aqi_max", "month", "city_encoded", "is_delhi_aqi_season"]
    ].copy()


def _grid_search(X: np.ndarray, y: np.ndarray, name: str) -> XGBRegressor:
    xgb = XGBRegressor(random_state=RANDOM_STATE, n_jobs=-1)
    gs = GridSearchCV(
        xgb,
        GRID,
        cv=5,
        scoring="neg_mean_squared_error",
        n_jobs=-1,
        verbose=0,
    )
    gs.fit(X, y)
    print(f"  [{name}] best params: {gs.best_params_}")
    return gs.best_estimator_


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    args = ap.parse_args()
    path = Path(args.csv).resolve()
    if not path.is_file():
        raise SystemExit(f"File not found: {path}")

    df = pd.read_csv(path)
    miss = [c for c in REQUIRED_COLS if c not in df.columns]
    if miss:
        raise SystemExit(f"Missing columns: {miss}")
    df["season"] = df["season"].astype(str).str.strip().str.lower()

    for c in REQUIRED_COLS:
        if c not in ("zone_id", "city", "week_start_date", "season"):
            df[c] = pd.to_numeric(df[c], errors="coerce")

    df = _engineer(df)
    df = df.dropna(
        subset=[
            "avg_rainfall_mm_day",
            "max_temp_c",
            "aqi_avg",
            "aqi_max",
            "civic_incidents_count",
            "flood_zone_tier",
            "p_weather_actual",
            "p_civic_actual",
            "p_pollution_actual",
        ]
    )

    le_city = LabelEncoder()
    df["city_encoded"] = le_city.fit_transform(df["city_norm"].astype(str))

    df_tr, df_te = train_test_split(df, test_size=0.2, random_state=RANDOM_STATE)

    try:
        season_ohe = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
    except TypeError:
        season_ohe = OneHotEncoder(sparse=False, handle_unknown="ignore")
    season_ohe.fit(df_tr[["season"]].astype(str))
    season_cols = [f"season_{c}" for c in season_ohe.categories_[0]]

    Xw_tr = _build_weather_matrix(df_tr, season_ohe, season_cols)
    Xw_te = _build_weather_matrix(df_te, season_ohe, season_cols)
    Xc_tr = _build_civic_matrix(df_tr)
    Xc_te = _build_civic_matrix(df_te)
    Xp_tr = _build_pollution_matrix(df_tr)
    Xp_te = _build_pollution_matrix(df_te)

    yw_tr, yw_te = df_tr["p_weather_actual"].values, df_te["p_weather_actual"].values
    yc_tr, yc_te = df_tr["p_civic_actual"].values, df_te["p_civic_actual"].values
    yp_tr, yp_te = df_tr["p_pollution_actual"].values, df_te["p_pollution_actual"].values

    print("Training weather model (GridSearchCV)...")
    gw = _grid_search(Xw_tr.values, yw_tr, "weather")
    print("Training civic model (GridSearchCV)...")
    gc = _grid_search(Xc_tr.values, yc_tr, "civic")
    print("Training pollution model (GridSearchCV)...")
    gp = _grid_search(Xp_tr.values, yp_tr, "pollution")

    pred_w = np.clip(gw.predict(Xw_te.values), 0, 1)
    pred_c = np.clip(gc.predict(Xc_te.values), 0, 1)
    pred_p = np.clip(gp.predict(Xp_te.values), 0, 1)

    rmse_w = float(np.sqrt(mean_squared_error(yw_te, pred_w)))
    r2_w = float(r2_score(yw_te, pred_w))
    rmse_c = float(np.sqrt(mean_squared_error(yc_te, pred_c)))
    r2_c = float(r2_score(yc_te, pred_c))
    rmse_p = float(np.sqrt(mean_squared_error(yp_te, pred_p)))
    r2_p = float(r2_score(yp_te, pred_p))

    out_dir = Path(__file__).resolve().parent / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    pkl = out_dir / "risk_model.pkl"

    bundle = {
        "weather": gw,
        "civic": gc,
        "pollution": gp,
        "city_encoder": le_city,
        "season_ohe": season_ohe,
        "season_columns": season_cols,
        "weather_columns": list(Xw_tr.columns),
        "civic_columns": list(Xc_tr.columns),
        "pollution_columns": list(Xp_tr.columns),
        "trained_at": datetime.now().isoformat(),
    }
    joblib.dump(bundle, pkl)

    print("\nRisk model trained successfully.")
    print(f"Weather RMSE: {rmse_w:.4f}, R²: {r2_w:.4f}")
    print(f"Civic RMSE: {rmse_c:.4f}, R²: {r2_c:.4f}")
    print(f"Pollution RMSE: {rmse_p:.4f}, R²: {r2_p:.4f}")
    print(f"Saved to ml/models/risk_model.pkl")


if __name__ == "__main__":
    main()
