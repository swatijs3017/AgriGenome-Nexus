import React, {useState} from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import {getMarketRisk90} from '../../services/api';

const crops=['Tomato','Onion','Potato','Rice','Wheat','Maize','Groundnut','Soybean'];
const regions=['Karnataka','Maharashtra','Tamil Nadu','Punjab','Uttar Pradesh'];
const panel='rounded-xl border border-agri-green/20 bg-black/40 p-5';
export default function MarketRisk90(){
 const [crop,setCrop]=useState('Tomato'); const [region,setRegion]=useState('Karnataka');
 const [result,setResult]=useState(null); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
 async function submit(e){e.preventDefault();setLoading(true);setError('');setResult(null);
  try {const {data}=await getMarketRisk90({crop,region,days:90});setResult(data);}
  catch(e){setError(typeof e.response?.data?.detail==='string'?e.response.data.detail:e.message);}
  finally{setLoading(false);}
 }
 const chart=result?[...result.history.map(r=>({date:r.date,actual:r.price})),...result.forecast.map(r=>({date:r.date,forecast:r.price,low:r.low,high:r.high}))]:[];
 return <div className="space-y-6">
  <div><h2 className="text-3xl font-bold text-agri-green">90-Day Market Demand & Supply Risk</h2>
   <p className="text-gray-400 mt-2">Scenario-based price forecast and arrivals-derived supply risk. Demand is not directly measured.</p></div>
  <form className={panel} onSubmit={submit}><div className="flex flex-wrap gap-4 items-end">
   <label className="text-sm text-gray-300">Crop<select value={crop} onChange={e=>setCrop(e.target.value)} className="block mt-2 bg-gray-900 border border-agri-green/30 rounded-lg p-3">{crops.map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="text-sm text-gray-300">Region<select value={region} onChange={e=>setRegion(e.target.value)} className="block mt-2 bg-gray-900 border border-agri-green/30 rounded-lg p-3">{regions.map(x=><option key={x}>{x}</option>)}</select></label>
   <button disabled={loading} className="rounded-lg bg-agri-green text-black px-5 py-3 font-bold disabled:opacity-50">{loading?'Training and forecasting…':'Generate 90-day forecast'}</button></div>
   <p className="mt-3 text-xs text-gray-400">Without backend/data/market_history.csv, this runs on reproducible SYNTHETIC demonstration observations. Do not present synthetic results as live mandi prices.</p>
   {error&&<p role="alert" className="mt-3 text-red-400">{error}</p>}</form>
  {result&&<><section className={panel}><p className="text-amber-300 font-semibold">{result.warning}</p><p className="text-sm text-gray-400 mt-2">Last observed: {result.last_observed_date} · Data: {result.data_source} · Holdout MAE: {result.holdout_mae_inr_per_quintal==null?'N/A':`₹${result.holdout_mae_inr_per_quintal}/quintal`}</p></section>
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <section className={panel}><p className="text-gray-400 text-sm">Forecast Day 90</p><p className="text-2xl font-bold text-agri-green">₹{result.forecast_day90_price.toLocaleString('en-IN')}/q</p></section>
    <section className={panel}><p className="text-gray-400 text-sm">Supply Risk (arrivals proxy)</p><p className="text-2xl font-bold capitalize">{result.supply_risk_proxy}</p></section>
    <section className={panel}><p className="text-gray-400 text-sm">Price Change (last 14 days forecast mean)</p><p className="text-2xl font-bold">{result.forecast_14day_mean_change_pct}%</p></section>
   </div><section className={panel}><h3 className="text-lg font-bold mb-4">Historical prices and 90-day scenario</h3><div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chart}><CartesianGrid stroke="#24432d" strokeDasharray="3 3"/><XAxis dataKey="date" tick={{fill:'#a3a3a3',fontSize:10}} minTickGap={40}/><YAxis tick={{fill:'#a3a3a3',fontSize:12}} width={65}/><Tooltip contentStyle={{background:'#0a170f',border:'1px solid #285b37'}}/><Legend/><Area dataKey="high" fill="#155e75" stroke="none" fillOpacity={0.15} name="Heuristic upper"/><Line type="monotone" dataKey="low" stroke="#64748b" dot={false} strokeDasharray="3 4" name="Heuristic lower"/><Line type="monotone" dataKey="actual" stroke="#00ff88" dot={false} name="Observed/demo"/><Line type="monotone" dataKey="forecast" stroke="#00b4ff" dot={false} name="Forecast"/></ComposedChart></ResponsiveContainer></div></section>
   <section className={panel}><h3 className="font-semibold">Limitations</h3><p className="text-gray-400 text-sm mt-2">Demand: {result.demand_signal}. Price volatility risk: {result.price_volatility_risk}.</p><ul className="list-disc pl-5 mt-2 text-gray-400 text-sm">{result.assumptions.map((s,i)=><li key={i}>{s}</li>)}</ul></section></>}
 </div>;
}
