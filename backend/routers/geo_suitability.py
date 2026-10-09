from fastapi import APIRouter
from pydantic import BaseModel, Field
from models.geo_crop_suitability import evaluate

router = APIRouter()

class GeoSuitabilityInput(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    planting_month: int = Field(ge=1, le=12)
    temperature: float = Field(ge=-20, le=65, description="Average growing-season temperature, Celsius")
    humidity: float = Field(ge=0, le=100)
    soil_moisture: float = Field(ge=0, le=100, description="Volumetric/relative soil moisture, percent (match crop threshold assumptions)")
    nitrogen: float | None = Field(default=None, ge=0)
    phosphorus: float | None = Field(default=None, ge=0)
    potassium: float | None = Field(default=None, ge=0)
    ec: float | None = Field(default=None, ge=0)
    soil_ph: float | None = Field(default=None, ge=0, le=14)
    annual_rainfall_mm: float | None = Field(default=None, ge=0, le=15000)
    top_k: int = Field(default=5, ge=1, le=10)

@router.post('/geo-crop-suitability')
def geo_crop_suitability(payload: GeoSuitabilityInput):
    return evaluate(payload)
