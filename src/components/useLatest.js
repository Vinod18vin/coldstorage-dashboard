import { useEffect, useState } from 'react';
import { subscribeLatest, subscribeConfig } from '../data';
import { DEFAULT_CONFIG } from '../utils';

export function useLatest() {
  const [latest, setLatest] = useState(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => subscribeLatest(setLatest), []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);
  const online = !!latest && now - latest.ts < 60000;
  return { latest, online, now };
}

export function useConfig() {
  const [cfg, setCfg] = useState(DEFAULT_CONFIG);
  useEffect(() => subscribeConfig(setCfg), []);
  return [cfg, setCfg];
}
