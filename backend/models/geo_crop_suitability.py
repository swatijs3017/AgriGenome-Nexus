"""Geo-adaptive crop suitability prototype.

RandomForestRegressor is trained from documented, synthetic threshold-derived
examples. Scores are screening indices, NOT agronomically validated probabilities.
No external weather, satellite, or soil service is queried.
"""
import json
from functools import lru_cache
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestRegressor

THRESHOLDS = json.loads((Path(__file__).resolve().parents[1] / "data" / "crop_thresholds.json").read_text())
FEATURES = ("temperature", "humidity", "soil_moisture", "nitrogen", "phosphorus", "potassium", "ec")
WEIGHTS = np.array([1.5, 0.7, 1.3, 0.5, 0.4, 0.5, 0.8], dtype=float)


def bounds(profile, field):
    return float(profile["min_" + field.replace("temperature", "temp").replace("soil_moisture", "moisture")]), float(profile["max_" + field.replace("temperature", "temp").replace("soil_moisture", "moisture")])


def suitability(value, low, high):
    """1 in preferred band; smoothly decays with distance outside band."""
    if low <= value <= high:
        return 1.0
    distance = low - value if value < low else value - high
    return float(np.exp(-2.0 * distance / max(high - low, 1e-6)))


def train_model(profile):
    rng = np.random.default_rng(42)
    samples, labels = [], []
    for _ in range(700):
        row = []
        for key in FEATURES:
            low, high = bounds(profile, key)
            row.append(float(rng.uniform(max(0.0, low - 1.5 * (high - low)), high + 1.5 * (high - low))))
        score = float(np.average([suitability(v, *bounds(profile, key)) for key, v in zip(FEATURES, row)], weights=WEIGHTS))
        samples.append(row)
        labels.append(score)
    model = RandomForestRegressor(n_estimators=48, max_depth=11, min_samples_leaf=3, random_state=42, n_jobs=1)
    model.fit(np.asarray(samples), np.asarray(labels))
    return model


@lru_cache(maxsize=16)
def get_model(crop_name):
    return train_model(THRESHOLDS[crop_name])


def evaluate(data):
    month = data.planting_month
    # Latitude-derived day length approximation; longitude intentionally not used
    # as a proxy for local climate. The effect is deliberately small.
    latitude = np.deg2rad(data.latitude)
    declination = np.deg2rad(23.44 * np.sin(2 * np.pi * (month - 3) / 12))
    arg = np.clip(-np.tan(latitude) * np.tan(declination), -1, 1)
    daylight_hours = round(float(24 * np.arccos(arg) / np.pi), 1)
    results = []
    for name, profile in THRESHOLDS.items():
        row, notes = [], []
        for field in FEATURES:
            lo, hi = bounds(profile, field)
            val = getattr(data, field, None)
            if val is None:
                val = (lo + hi) / 2
                notes.append(f"{field.replace('_', ' ').title()} missing: assumed crop-specific optimum")
            else:
                if val < lo:
                    notes.append(f"{field.replace('_', ' ').title()} below preferred range ({lo:g}–{hi:g})")
                elif val > hi:
                    notes.append(f"{field.replace('_', ' ').title()} above preferred range ({lo:g}–{hi:g})")
            row.append(float(val))
        # Train distinct crop-level regression models on synthetic reference data.
        predicted = float(get_model(name).predict(np.array(row, dtype=float).reshape(1, -1))[0])
        # Optional field observations: pH is a general screening filter; rainfall
        # compared to approximate annual crop water need derived from moisture band.
        if data.soil_ph is not None:
            predicted *= suitability(data.soil_ph, 6.0, 7.5)
            if not 6.0 <= data.soil_ph <= 7.5:
                notes.append("Soil pH outside generic 6.0–7.5 screening band; verify crop-specific requirements")
        if data.annual_rainfall_mm is not None:
            # Broad, approximate screening, not calibrated per crop or location.
            target = 500 + 12 * (profile["min_moisture"] - 40)
            predicted *= 0.7 + 0.3 * suitability(data.annual_rainfall_mm, target * 0.6, target * 1.6)
            if data.annual_rainfall_mm < target * 0.6:
                notes.append("Rainfall may be insufficient without irrigation")
        # Short-day/long-day effects are cultivar-specific: report daylight but
        # do not fabricate photoperiod-specific penalties without cultivar data.
        score = round(float(np.clip(predicted * 100, 0, 100)), 1)
        results.append({"crop": name, "score": score,
                        "rating": "High" if score >= 80 else "Moderate" if score >= 60 else "Low",
                        "considerations": notes[:5], "maturity_days": profile["maturity_days"]})
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"latitude": data.latitude, "longitude": data.longitude,
            "planting_month": month, "estimated_daylight_hours": daylight_hours,
            "method": "Random forest fitted to synthetic crop-threshold examples; optional heuristic pH/rainfall screening",
            "data_quality": "Prototype only: not trained or validated on observed harvest outcomes",
            "assumptions": ["Coordinates do not automatically fetch local weather or soil data",
                            "Annual rainfall is user-supplied, not a forecast",
                            "Missing nutrient/soil readings are imputed at each crop's preferred midpoint, reducing ranking reliability",
                            "Scores are screening indices, not calibrated probabilities"],
            "recommendations": results[:data.top_k]}
