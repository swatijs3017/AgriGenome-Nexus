
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()


# ============================================
# 1. APPLICATION LIFESPAN
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Preload the existing ML models when
    the FastAPI application starts.
    """

    print("🌱 AgriGenome-Nexus API starting up...")
    print("Loading ML models...")

    # Existing ML models
    from models.crop_recommender import recommender
    from models.dosing_engine import engine
    from models.harvest_predictor import predictor
    from models.market_forecaster import forecaster
    from scripts.plant_health import health_model

    print("✅ Existing ML models loaded successfully!")
    print("✅ Geo-Adaptive Crop Suitability registered!")
    print("✅ 90-Day Market Risk Predictor registered!")

    yield

    print("🛑 AgriGenome-Nexus API shutting down.")


# ============================================
# 2. INITIALIZE FASTAPI
# ============================================

app = FastAPI(
    title="AgriGenome-Nexus API",
    description=(
        "AI-powered precision agriculture platform "
        "with ESP32 monitoring, crop suitability, "
        "plant health, harvest prediction, "
        "and market risk forecasting."
    ),
    version="1.1.0",
    lifespan=lifespan,
)


# ============================================
# 3. CORS CONFIGURATION
# ============================================

allowed_origins = [
    "https://agri-genome-nexus-31pc.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

env_origins = os.getenv("CORS_ORIGINS", "")

if env_origins:
    allowed_origins.extend([
        origin.strip()
        for origin in env_origins.split(",")
        if origin.strip()
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# 4. IMPORT EXISTING ROUTERS
# ============================================

from routers import (
    sensor,
    crop,
    dosing,
    plant,
    harvest,
    market,
)

# NEW ML modules
from routers import (
    geo_suitability,
    market_risk_90d,
)


# ============================================
# 5. REGISTER EXISTING ROUTERS
# ============================================

# ESP32 Sensor Data
app.include_router(
    sensor.router,
    prefix="/api/sensor-data",
    tags=["Sensor Data"],
)

# Crop Intelligence
app.include_router(
    crop.router,
    prefix="/api",
    tags=["Crop Intelligence"],
)

# Dosing Decision
app.include_router(
    dosing.router,
    prefix="/api",
    tags=["Dosing Decision"],
)

# Plant Health
app.include_router(
    plant.router,
    prefix="/api",
    tags=["Plant Health"],
)

# Harvest Readiness
app.include_router(
    harvest.router,
    prefix="/api",
    tags=["Harvest Readiness"],
)

# Existing Market Price
app.include_router(
    market.router,
    prefix="/api",
    tags=["Market Price"],
)


# ============================================
# 6. REGISTER NEW ML MODULES
# ============================================

# Model 1: Geo-Adaptive Crop Suitability
app.include_router(
    geo_suitability.router,
    prefix="/api",
    tags=["Geo-Adaptive Crop Suitability"],
)

# Model 2: 90-Day Market Risk Predictor
app.include_router(
    market_risk_90d.router,
    prefix="/api",
    tags=["90-Day Market Risk"],
)


# ============================================
# 7. ROOT ENDPOINT
# ============================================

@app.get("/", tags=["Root"])
def root():
    return {
        "app": "AgriGenome-Nexus",
        "version": "1.1.0",
        "status": "operational",
        "docs": "/docs",
    }


# ============================================
# 8. HEALTH CHECK
# ============================================

@app.get("/health", tags=["Root"])
def health_check():
    return {
        "status": "healthy"
    }
