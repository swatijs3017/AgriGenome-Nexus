from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from models.market_risk_90d import forecast, BASE, REGIONS

router = APIRouter(prefix='/api', tags=['90-Day Market Risk'])

class Market90Input(BaseModel):
    crop: str = Field(default='Tomato')
    region: str = Field(default='Karnataka')
    days: int = Field(default=90, ge=90, le=90)

@router.get('/market-risk-90d/options')
def options():
    return {'crops':list(BASE), 'regions':REGIONS, 'required_csv_columns': ['date','crop','region','price_inr_per_quintal','arrivals_tonnes','rainfall_mm','temperature_c']}

@router.post('/market-risk-90d')
def predict_market_risk(payload: Market90Input):
    try:
        return forecast(payload.crop,payload.region,payload.days)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
