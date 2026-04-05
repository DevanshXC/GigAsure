"""
Offline K-Means zone clustering for GigaSure tier assignment.

Usage (from gigsure/backend):
  python ml/train_zone_clustering.py --csv path/to/zones.csv

Output:
  - ml/models/zone_clustering.pkl
  - ml/models/zone_clustering_elbow.png
  - Console: elbow k, tier table, ZONE_MAP snippets for auth.py / schemas.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

# Features used for clustering (numeric only)
FEATURE_COLUMNS = [
    "lat",
    "lng",
    "flood_history_score",
    "avg_annual_rainfall_mm",
    "avg_aqi_annual",
    "civic_incident_rate_annual",
    "historical_claim_rate",
    "avg_delivery_density",
]

REQUIRED_COLUMNS = [
    "zone_id",
    "city",
    "lat",
    "lng",
    "pin_code",
    "flood_history_score",
    "avg_annual_rainfall_mm",
    "avg_aqi_annual",
    "civic_incident_rate_annual",
    "historical_claim_rate",
    "avg_delivery_density",
]

FINAL_K = 5
ELBOW_K_RANGE = range(2, 9)


def _elbow_k(ks: list[int], inertias: list[float]) -> int:
    """Elbow as point with maximum distance from line (k1,in1)–(kn,inn)."""
    x = np.array(ks, dtype=float)
    y = np.array(inertias, dtype=float)
    x1, y1 = x[0], y[0]
    x2, y2 = x[-1], y[-1]
    line_len = np.hypot(x2 - x1, y2 - y1)
    if line_len < 1e-12:
        return int(ks[len(ks) // 2])
    dists = []
    for i in range(len(ks)):
        px, py = x[i], y[i]
        d = abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) / line_len
        dists.append(d)
    return int(ks[int(np.argmax(dists))])


def _infer_city_pool(city: str) -> str:
    c = str(city).lower().strip()
    if c in ("mumbai",) or "mumbai" in c:
        return "mumbai_rain_pool"
    if c in ("delhi",) or "delhi" in c:
        return "delhi_aqi_pool"
    if "bengaluru" in c or "bangalore" in c:
        return "bengaluru_pool"
    return "bengaluru_pool"


def main() -> None:
    parser = argparse.ArgumentParser(description="Train zone K-Means tiers from CSV")
    parser.add_argument("--csv", required=True, help="Path to zones CSV")
    args = parser.parse_args()

    csv_path = Path(args.csv).resolve()
    if not csv_path.is_file():
        raise SystemExit(f"CSV not found: {csv_path}")

    df = pd.read_csv(csv_path)
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise SystemExit(f"CSV missing columns: {missing}")

    df = df.copy()
    df["pin_code"] = df["pin_code"].astype(str).str.strip()

    # Numeric features: coerce and fill
    for col in FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].fillna(df[FEATURE_COLUMNS].mean())

    X = df[FEATURE_COLUMNS].values.astype(np.float64)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # --- Elbow k=2..8 ---
    ks = list(ELBOW_K_RANGE)
    inertias: list[float] = []
    for k in ks:
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        km.fit(X_scaled)
        inertias.append(float(km.inertia_))

    optimal_k = _elbow_k(ks, inertias)
    print(f"Elbow method optimal k: {optimal_k}")
    if 4 <= optimal_k <= 6:
        print(
            f"Optimal k is in [4, 6] — using n_clusters={FINAL_K} for 5 risk tiers (spec)."
        )
    else:
        print(
            f"Note: Final model still uses n_clusters={FINAL_K} per training script step 4."
        )

    out_dir = Path(__file__).resolve().parent / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    plot_path = out_dir / "zone_clustering_elbow.png"

    plt.figure(figsize=(8, 5))
    plt.plot(ks, inertias, "bo-", linewidth=2, markersize=8)
    plt.xlabel("k")
    plt.ylabel("Inertia")
    plt.title("K-Means Elbow (inertia vs k)")
    plt.grid(True, alpha=0.3)
    plt.xticks(ks)
    plt.tight_layout()
    plt.savefig(plot_path, dpi=150)
    plt.close()
    print(f"Inertia curve saved: {plot_path}")

    # --- Final KMeans k=5 ---
    kmeans = KMeans(n_clusters=FINAL_K, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)
    try:
        sil = silhouette_score(X_scaled, cluster_labels)
        print(f"Silhouette score (k={FINAL_K}): {sil:.4f}")
    except Exception as e:
        print(f"Silhouette score unavailable: {e}")

    claim_col = df["historical_claim_rate"].values.astype(float)
    cluster_ids = np.arange(FINAL_K)
    mean_claim_by_cluster = {
        int(c): float(claim_col[cluster_labels == c].mean())
        for c in cluster_ids
    }
    # Sort clusters by ascending mean claim rate → tier 1 = safest
    sorted_clusters = sorted(mean_claim_by_cluster.keys(), key=lambda c: mean_claim_by_cluster[c])
    tier_mapping: dict[int, int] = {
        int(sorted_clusters[i]): i + 1 for i in range(FINAL_K)
    }

    zone_tiers = np.array([tier_mapping[int(l)] for l in cluster_labels])
    zone_tier_output: dict[str, int] = {}
    for i, zid in enumerate(df["zone_id"].astype(str)):
        zone_tier_output[str(zid)] = int(zone_tiers[i])

    pin_to_zone_tier: dict[str, dict] = {}
    for i in range(len(df)):
        pin = str(df.iloc[i]["pin_code"])
        pin_to_zone_tier[pin] = {
            "zone_id": str(df.iloc[i]["zone_id"]),
            "tier": int(zone_tiers[i]),
        }

    bundle = {
        "kmeans": kmeans,
        "scaler": scaler,
        "feature_columns": FEATURE_COLUMNS,
        "tier_mapping": tier_mapping,
        "zone_tier_output": zone_tier_output,
        "optimal_k_elbow": optimal_k,
    }
    pkl_path = out_dir / "zone_clustering.pkl"
    joblib.dump(bundle, pkl_path)
    print(f"Saved: {pkl_path}")

    print("\nZone clustering complete. Tier assignments:")
    print(f"{'zone_id':<22} {'pin_code':<10} {'tier'}")
    print("-" * 45)
    for i in range(len(df)):
        print(
            f"{str(df.iloc[i]['zone_id']):<22} {str(df.iloc[i]['pin_code']):<10} {int(zone_tiers[i])}"
        )

    print("\n--- Paste format (minimal, spec step 6) ---")
    for i in range(len(df)):
        pin = str(df.iloc[i]["pin_code"])
        zid = str(df.iloc[i]["zone_id"])
        t = int(zone_tiers[i])
        print(f'    "{pin}": {{"zone_id": "{zid}", "tier": {t}}},')

    print("\n--- ZONE_MAP entries for auth.py / db/schemas.py (merge zone_name manually if needed) ---")
    for i in range(len(df)):
        pin = str(df.iloc[i]["pin_code"])
        zid = str(df.iloc[i]["zone_id"])
        city = str(df.iloc[i]["city"]).strip()
        zt = int(zone_tiers[i])
        pool = _infer_city_pool(city)
        zname = (
            str(df.iloc[i]["zone_name"]).strip()
            if "zone_name" in df.columns and pd.notna(df.iloc[i].get("zone_name"))
            else "UPDATE_ZONE_NAME"
        )
        print(
            f'    "{pin}": {{\n'
            f'        "zone_id": "{zid}",\n'
            f'        "zone_name": "{zname}",\n'
            f'        "zone_tier": {zt},\n'
            f'        "city": "{city.lower()}",\n'
            f'        "city_pool": "{pool}",\n'
            f"    }},"
        )

    print('\nCopy the ZONE_MAP entries above into auth.py (or db/schemas.py ZONE_MAP).')
    print(f"Elbow optimal k was {optimal_k}; trained model uses k={FINAL_K} clusters.")


if __name__ == "__main__":
    main()
