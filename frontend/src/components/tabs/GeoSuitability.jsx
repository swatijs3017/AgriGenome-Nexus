import React, { useState } from 'react';
import { getGeoCropSuitability, getLatestSensorData } from '../../services/api';

const initial = { latitude: '12.9716', longitude: '77.5946', planting_month: String(new Date().getMonth() + 1), temperature: '28', humidity: '65', soil_moisture: '55', nitrogen: '', phosphorus: '', potassium: '', ec: '', soil_ph: '', annual_rainfall_mm: '', top_k: '5' };
const fields = [
  ['latitude','Latitude (°)'],['longitude','Longitude (°)'],['planting_month','Planting month (1–12)'],
  ['temperature','Growing-season temp (°C)'],['humidity','Humidity (%)'],['soil_moisture','Soil moisture (%)'],
  ['nitrogen','Nitrogen (sensor units)'],['phosphorus','Phosphorus (sensor units)'],['potassium','Potassium (sensor units)'],
  ['ec','Electrical conductivity (sensor units)'],['soil_ph','Soil pH (optional)'],['annual_rainfall_mm','Annual rainfall (mm, optional)'], ['top_k','Number of results (1–10)'],
];
const optional = new Set(['nitrogen','phosphorus','potassium','ec','soil_ph','annual_rainfall_mm']);
const panel = 'rounded-xl border border-agri-green/20 bg-black/40 p-5';
export default function GeoSuitability() {
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const loadSensor = async () => {
    setError('');
    try {
      const { data } = await getLatestSensorData();
      if (!data || !data.timestamp) throw new Error('No sensor reading available');
      const time = Date.parse(data.timestamp);
      if (!Number.isFinite(time) || Date.now() - time > 30000 || time - Date.now() > 5000) throw new Error('ESP32 reading is stale');
      const mapping = { temperature: data.temperature, humidity: data.humidity, soil_moisture: data.soil_percent ?? data.soil_moisture, nitrogen: data.nitrogen, phosphorus: data.phosphorus, potassium: data.potassium, ec: data.ec, soil_ph: data.ph };
      setForm(f => { const next = {...f}; Object.entries(mapping).forEach(([key, value]) => { if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) next[key] = String(value); }); if (data.latitude != null && Number(data.latitude) !== 0) next.latitude = String(data.latitude); if (data.longitude != null && Number(data.longitude) !== 0) next.longitude = String(data.longitude); return next; });
      setMessage('Recent ESP32 readings loaded. Check weather and soil inputs before predicting.');
    } catch (e) { setError(e.response?.data?.detail || e.message); }
  };
  const submit = async e => {
    e.preventDefault(); setError(''); setLoading(true); setResult(null);
    try {
      const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, optional.has(key) && value.trim() === '' ? null : Number(value)]));
      for (const [key, value] of Object.entries(payload)) if (value !== null && !Number.isFinite(value)) throw new Error(`Invalid input: ${key}`);
      const { data } = await getGeoCropSuitability(payload); setResult(data);
    } catch (e) { const detail = e.response?.data?.detail; setError(Array.isArray(detail) ? detail.map(x => `${x.loc?.join('.')}: ${x.msg}`).join('; ') : (detail || e.message)); }
    finally { setLoading(false); }
  };
  return <div className="space-y-6">
    <div><h2 className="text-3xl font-bold text-agri-green">Geo-Adaptive Crop Suitability</h2><p className="text-gray-400 mt-2">Compare crops using field conditions and location. Prototype scores are not validated yield probabilities.</p></div>
    <form onSubmit={submit} className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><h3 className="text-lg font-semibold">Field and climate inputs</h3><button type="button" onClick={loadSensor} className="rounded-lg border border-agri-green px-4 py-2 text-agri-green hover:bg-agri-green/10">Use recent ESP32 data</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{fields.map(([key,label]) => <label key={key} className="space-y-1 text-sm text-gray-300"><span className="block">{label}</span><input required={!optional.has(key)} type="number" step={key === 'planting_month' || key === 'top_k' ? '1' : 'any'} value={form[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))} className="w-full rounded-lg border border-agri-green/30 bg-gray-900 p-3 text-white outline-none focus:border-agri-green" /></label>)}</div>
      <p className="mt-3 text-xs text-gray-400">Use representative growing-season averages, not a single instant sensor reading. NPK and EC should follow the same units as the repository threshold file. Missing values are estimated per crop.</p>
      <button disabled={loading} className="mt-5 rounded-lg bg-agri-green px-6 py-3 font-bold text-black disabled:opacity-50">{loading ? 'Evaluating…' : 'Rank suitable crops'}</button>
      {message && <p className="mt-3 text-sm text-gray-300">{message}</p>}{error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </form>
    {result && <div className="space-y-4"><section className={panel}><h3 className="font-semibold text-xl">Top recommendations</h3><p className="text-sm text-gray-400 mt-1">Estimated daylight: {result.estimated_daylight_hours} h. Model: synthetic-data Random Forest + screening rules.</p></section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{result.recommendations.map((crop, i) => <article key={crop.crop} className={panel}><div className="flex items-start justify-between gap-4"><h4 className="text-lg font-semibold">#{i+1} {crop.crop}</h4><span className="text-agri-green font-bold">{crop.score}/100</span></div><div className="mt-3 h-2 rounded-full bg-gray-700"><div className="h-full rounded-full bg-agri-green" style={{width:`${crop.score}%`}} /></div><p className="mt-2 text-sm">{crop.rating} suitability · Approx. {crop.maturity_days} maturity days</p>{crop.considerations.length > 0 && <ul className="mt-3 text-xs text-gray-400 list-disc pl-4 space-y-1">{crop.considerations.map((note,j)=><li key={j}>{note}</li>)}</ul>}</article>)}</div>
      <section className={panel}><h4 className="font-semibold">Important limitations</h4><p className="mt-2 text-sm text-gray-400">{result.data_quality}</p><ul className="mt-2 list-disc pl-5 text-sm text-gray-400">{result.assumptions.map((a,i)=><li key={i}>{a}</li>)}</ul></section></div>}
  </div>;
}
