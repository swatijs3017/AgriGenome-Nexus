"""90-day market research prototype. Not a trading/planting recommendation."""
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

DATA_FILE = Path(__file__).resolve().parents[1] / 'data' / 'market_history.csv'
REQUIRED = ['date', 'crop', 'region', 'price_inr_per_quintal', 'arrivals_tonnes', 'rainfall_mm', 'temperature_c']
BASE = {'Tomato': 1700, 'Onion': 2300, 'Potato': 1800, 'Rice': 2600, 'Wheat': 2400, 'Maize': 2100, 'Groundnut': 5800, 'Soybean': 4600}
REGIONS = ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Punjab', 'Uttar Pradesh']

def demonstration_history(crop, region, end_date=None, days=450):
    """Deterministic synthetic example series; NEVER label as real mandi observations."""
    end_date = end_date or date.today()
    seed = sum(map(ord, crop + region))
    rng = np.random.default_rng(seed)
    baseline = BASE[crop] * (1 + (REGIONS.index(region) - 2) * 0.025)
    rows = []
    for i in range(days):
        day = end_date - timedelta(days=days - i - 1)
        seasonal = np.sin(2*np.pi*(day.timetuple().tm_yday)/365.25)
        rain = max(0, 5 + 5*seasonal + rng.normal(0, 3))
        temp = 28 + 6*np.cos(2*np.pi*day.timetuple().tm_yday/365.25) + rng.normal(0, 1.3)
        arrivals = max(5, 110 + 27*seasonal + rng.normal(0, 10))
        price = max(50, baseline*(1 - 0.19*(arrivals-110)/110 + 0.10*seasonal + 0.0007*i) + rng.normal(0, baseline*0.035))
        rows.append({'date':day.isoformat(), 'crop':crop, 'region':region, 'price_inr_per_quintal':round(price,2), 'arrivals_tonnes':round(arrivals,2), 'rainfall_mm':round(rain,2),'temperature_c':round(temp,2)})
    return pd.DataFrame(rows)

def load_history(crop,region):
    if not DATA_FILE.exists():
        return demonstration_history(crop,region), 'synthetic_demo'
    try:
        df = pd.read_csv(DATA_FILE)
        absent = set(REQUIRED)-set(df.columns)
        if absent:
            raise ValueError('CSV missing columns: '+', '.join(sorted(absent)))
        df = df.loc[(df.crop.astype(str).str.casefold()==crop.casefold()) & (df.region.astype(str).str.casefold()==region.casefold())].copy()
        if df.empty:
            raise ValueError(f'No CSV rows for crop={crop}, region={region}')
        return df, 'user_csv'
    except (OSError, pd.errors.ParserError) as exc:
        raise ValueError(f'Cannot read CSV: {exc}') from exc

def clean_history(df):
    df = df.copy()
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    for col in REQUIRED[3:]:
        df[col] = pd.to_numeric(df[col],errors='coerce')
    df = df.dropna(subset=['date']+REQUIRED[3:]).sort_values('date').drop_duplicates('date',keep='last')
    df = df[(df.price_inr_per_quintal>0) & (df.arrivals_tonnes>0) & (df.rainfall_mm>=0) & (df.temperature_c.between(-30,65))]
    if len(df)<120:
        raise ValueError('Need at least 120 valid daily rows for this crop and region')
    if (df.date.diff().dropna().dt.days!=1).any():
        raise ValueError('CSV requires continuous daily dates (no missing days)')
    return df.reset_index(drop=True)

def _features(df):
    d = df.copy()
    for col in ['price_inr_per_quintal','arrivals_tonnes']:
        for lag in [1,7,14,28]:
            d[f'{col}_lag{lag}']=d[col].shift(lag)
        d[f'{col}_mean7']=d[col].shift(1).rolling(7).mean()
        d[f'{col}_mean28']=d[col].shift(1).rolling(28).mean()
    doy=d.date.dt.dayofyear
    d['sin_doy']=np.sin(2*np.pi*doy/365.25)
    d['cos_doy']=np.cos(2*np.pi*doy/365.25)
    features=[c for c in d.columns if '_lag' in c or '_mean' in c]+['rainfall_mm','temperature_c','sin_doy','cos_doy']
    return d,features

def forecast(crop,region,days=90):
    if crop not in BASE or region not in REGIONS:
        raise ValueError('Unsupported crop or region')
    if days!=90:
        raise ValueError('This endpoint supports exactly 90 days')
    df,source=load_history(crop,region)
    df=clean_history(df)
    trained,cols=_features(df)
    trained=trained.dropna(subset=cols)
    model=RandomForestRegressor(n_estimators=100,min_samples_leaf=3,max_features=0.8,random_state=42,n_jobs=1)
    # Time-ordered evaluation, not a random split: hold out most recent 30 days.
    split=max(60,len(trained)-30)
    model.fit(trained.iloc[:split][cols],trained.iloc[:split].price_inr_per_quintal)
    val=trained.iloc[split:]
    errors=abs(val.price_inr_per_quintal.to_numpy()-model.predict(val[cols])) if len(val) else np.array([])
    mae=float(np.mean(errors)) if len(errors) else None
    model.fit(trained[cols],trained.price_inr_per_quintal)
    prices=df.price_inr_per_quintal.to_numpy()
    arrivals=df.arrivals_tonnes.to_numpy()
    baseline_arrival=float(np.median(arrivals[-28:]))
    baseline_rain=float(np.median(df.rainfall_mm.tail(28)))
    baseline_temp=float(np.median(df.temperature_c.tail(28)))
    history=[{'date':r.date.strftime('%Y-%m-%d'),'price':round(float(r.price_inr_per_quintal),2),'arrivals_tonnes':round(float(r.arrivals_tonnes),2)} for r in df.tail(30).itertuples()]
    out=[];last_day=df.date.iloc[-1].date()
    for step in range(1,days+1):
        next_day=last_day+timedelta(days=step)
        # Scenario assumption: arrivals and weather fixed at recent medians.
        record={'date':pd.Timestamp(next_day),'price_inr_per_quintal':float(prices[-1]),'arrivals_tonnes':baseline_arrival,'rainfall_mm':baseline_rain,'temperature_c':baseline_temp}
        tmp=pd.concat([df[['date','price_inr_per_quintal','arrivals_tonnes','rainfall_mm','temperature_c']],pd.DataFrame([record])],ignore_index=True)
        x,_=_features(tmp)
        prediction=max(1,float(model.predict(x.iloc[[-1]][cols])[0]))
        prices=np.append(prices,prediction)
        df=pd.concat([df,pd.DataFrame([{**record,'price_inr_per_quintal':prediction}])],ignore_index=True)
        band=max(0.10*prediction,(mae or 0)*1.65)*(1+step/90*0.8)
        out.append({'date':next_day.isoformat(),'day':step,'price':round(prediction,2),'low':round(max(0,prediction-band),2),'high':round(prediction+band,2)})
    recent_price=float(np.median(prices[:len(prices)-days][-14:]))
    forecast_price=float(np.mean([r['price'] for r in out[-14:]]))
    change_pct=(forecast_price/recent_price-1)*100
    # Proxy ONLY: low arrivals indicate possible supply tightness, not measured future supply.
    earlier=float(np.median(arrivals[-84:-28])) if len(arrivals)>84 else baseline_arrival
    supply_ratio=baseline_arrival/max(1,earlier)
    supply_risk='high' if supply_ratio<0.8 else 'moderate' if supply_ratio<0.95 else 'low'
    price_risk='high' if abs(change_pct)>20 else 'moderate' if abs(change_pct)>10 else 'low'
    return {'crop':crop,'region':region,'horizon_days':90,'data_source':source,'last_observed_date':last_day.isoformat(),
            'training_rows':int(len(trained)),'holdout_mae_inr_per_quintal':round(mae,2) if mae is not None else None,
            'last_observed_price':round(float(prices[len(prices)-days-1]),2),'forecast_day90_price':out[-1]['price'],
            'forecast_14day_mean_change_pct':round(change_pct,1),'supply_risk_proxy':supply_risk,
            'price_volatility_risk':price_risk,'demand_signal':'unavailable (no direct demand observations)',
            'recent_arrivals_tonnes':round(baseline_arrival,2),
            'history':history,'forecast':out,
            'assumptions':['Forward weather uses median of most recent 28 observed days; not a meteorological forecast.',
                           'Forward arrivals use median of most recent 28 observed days; not an arrivals forecast.',
                           'Supply risk is a historical-arrivals proxy, not a validated future shortage prediction.',
                           'Bands are heuristic uncertainty ranges, not calibrated prediction intervals.',
                           'Demand cannot be independently measured from price and arrivals alone.'],
            'warning':'DEMONSTRATION SYNTHETIC DATA — NOT LIVE MARKET EVIDENCE' if source=='synthetic_demo' else 'User-supplied CSV; check provenance, units and timestamp before relying on results.'}
