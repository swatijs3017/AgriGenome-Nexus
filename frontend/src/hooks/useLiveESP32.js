import { useEffect, useState } from 'react';
import { getLatestSensorData } from '../services/api';

export function useLiveESP32(pollMs = 5000) {
  const [reading, setReading] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    let active = true;
    let busy = false;
    const fetchLatest = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await getLatestSensorData();
        if (!active) return;
        const data = response.data;
        if (!data || !data.timestamp || data.note === 'Baseline Telemetry Mode') {
          setReading(null);
          setError('No actual ESP32 reading is available on this backend.');
        } else {
          setReading(data);
          setError('');
        }
      } catch (e) {
        if (active) { setReading(null); setError(e.message || 'Sensor API unavailable'); }
      } finally {
        busy = false;
        if (active) { setLoading(false); setClock(Date.now()); }
      }
    };
    fetchLatest();
    const timer = setInterval(() => { setClock(Date.now()); fetchLatest(); }, pollMs);
    return () => { active = false; clearInterval(timer); };
  }, [pollMs]);

  const timestamp = reading?.timestamp ? Date.parse(reading.timestamp) : NaN;
  const age = Number.isFinite(timestamp) ? clock - timestamp : Infinity;
  const fresh = !!reading && age >= -5000 && age <= 30000;
  const value = (key, fallback = null) => {
    const v = reading?.[key] ?? fallback;
    return fresh && v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
  };
  return { reading, fresh, loading, error, ageSeconds: Number.isFinite(age) ? Math.max(0,Math.round(age/1000)) : null, value };
}
