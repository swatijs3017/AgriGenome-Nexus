
import axios from 'axios';

// ==========================================
// API CONFIGURATION
// ==========================================

// In production, set VITE_API_BASE_URL to the
// backend root, e.g. https://your-backend.onrender.com
// In local development, Vite proxies /api to FastAPI.

const backendURL = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/+$/, '');

const baseURL = backendURL
  ? `${backendURL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// 1. SENSOR DATA — ESP32
// ==========================================

export const postSensorData = (data) =>
  api.post('/sensor-data/', data);

export const getLatestSensorData = () =>
  api.get('/sensor-data/latest');


// ==========================================
// 2. CROP INTELLIGENCE
// ==========================================

export const recommendCrop = (data) =>
  api.post('/recommend-crop', data);


// ==========================================
// 3. DOSING DECISION
// ==========================================

export const getDosingDecision = (data) =>
  api.post('/dosing-decision', data);


// ==========================================
// 4. PLANT HEALTH
// ==========================================

export const detectPlantHealth = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/plant-health', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  });
};


// ==========================================
// 5. HARVEST READINESS
// ==========================================

export const getHarvestReadiness = (data) =>
  api.post('/harvest-readiness', data);


// ==========================================
// 6. MARKET PRICE
// ==========================================

export const getMarketPrice = (data) =>
  api.post('/market-price', data);


// ==========================================
// 7. GEO-ADAPTIVE CROP SUITABILITY
// ==========================================

export const getGeoCropSuitability = (data) =>
  api.post('/geo-crop-suitability', data, {
    timeout: 30000,
  });


// ==========================================
// 8. 90-DAY MARKET RISK PREDICTOR
// ==========================================

export const getMarketRisk90 = (data) =>
  api.post('/market-risk-90d', data, {
    timeout: 120000,
  });


// ==========================================
// DEFAULT EXPORT
// ==========================================

export default api;
