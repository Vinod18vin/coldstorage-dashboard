// Data layer: Firebase Realtime Database, or an in-browser simulator (demo mode)
// when no Firebase config is present.
import { initializeApp } from 'firebase/app';
import {
  getDatabase, ref, onValue, query, limitToLast, get, set,
} from 'firebase/database';
import { normalize, DEFAULT_CONFIG } from './utils';

const env = import.meta.env;
const BASE = env.VITE_DB_PATH || 'coldstorage';
export const isDemo = !env.VITE_FIREBASE_DATABASE_URL || !env.VITE_FIREBASE_API_KEY;

let db = null;
if (!isDemo) {
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: env.VITE_FIREBASE_DATABASE_URL,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  });
  db = getDatabase(app);
}

/* ---------------- demo simulator ---------------- */
const demo = { rows: [], listeners: new Set(), cfg: null, timer: null, doorUntil: 0, powerUntil: 0 };

function demoReading(ts) {
  const t = ts / 1000;
  let temp = 5 + 1.2 * Math.sin(t / 900) + 0.4 * Math.sin(t / 97) + (Math.random() - 0.5) * 0.3;
  const door = ts < demo.doorUntil;
  if (door) temp += 1.5;
  const mains = ts >= demo.powerUntil;
  const hum = 62 + 6 * Math.sin(t / 1300) + (Math.random() - 0.5) * 2 + (door ? 8 : 0);
  const batt = mains ? 4.1 : 3.8;
  let alarm = 'OK';
  if (!mains) alarm = 'POWER_LOST';
  else if (temp > (demo.cfg?.tempMax ?? 8)) alarm = 'TEMP_HIGH';
  return normalize({
    ts, temp: +temp.toFixed(1), hum: +hum.toFixed(0), door: door ? 1 : 0, mains: mains ? 1 : 0, batt, alarm,
  });
}

function demoInit() {
  if (demo.timer) return;
  try { demo.cfg = JSON.parse(localStorage.getItem('cs_cfg')) || { ...DEFAULT_CONFIG }; }
  catch { demo.cfg = { ...DEFAULT_CONFIG }; }
  const now = Date.now();
  // 7 days of history, one point every 5 minutes, with a few door/power events
  for (let ts = now - 7 * 864e5; ts < now; ts += 5 * 60000) {
    const k = Math.floor(ts / 3600000);
    demo.doorUntil = k % 5 === 0 && ts % 3600000 < 12 * 60000 ? ts + 1 : 0;
    demo.powerUntil = k % 61 === 0 && ts % 3600000 < 25 * 60000 ? ts + 1 : 0;
    demo.rows.push(demoReading(ts));
  }
  demo.doorUntil = 0; demo.powerUntil = 0;
  demo.rows.push(demoReading(Date.now()));
  demo.timer = setInterval(() => {
    const ts = Date.now();
    if (Math.random() < 0.03) demo.doorUntil = ts + 40000;
    if (Math.random() < 0.004) demo.powerUntil = ts + 60000;
    demo.rows.push(demoReading(ts));
    if (demo.rows.length > 4000) demo.rows.shift();
    demo.listeners.forEach((fn) => fn());
  }, 3000);
}

function demoSub(fn) {
  demoInit();
  demo.listeners.add(fn);
  fn();
  return () => demo.listeners.delete(fn);
}

/* ---------------- public API ---------------- */
export function subscribeLatest(cb) {
  if (isDemo) return demoSub(() => cb(demo.rows[demo.rows.length - 1]));
  return onValue(ref(db, `${BASE}/latest`), (s) => cb(normalize(s.val())));
}

export function subscribeRecent(n, cb) {
  if (isDemo) return demoSub(() => cb(demo.rows.slice(-n)));
  return onValue(query(ref(db, `${BASE}/history`), limitToLast(n)), (s) => {
    const v = s.val() || {};
    cb(Object.values(v).map(normalize).filter(Boolean).sort((a, b) => a.ts - b.ts));
  });
}

// from / to in epoch milliseconds
export async function fetchRange(fromMs, toMs, limit = 5000) {
  if (isDemo) {
    demoInit();
    return demo.rows.filter((r) => r.ts >= fromMs && r.ts <= toMs).slice(-limit);
  }
  // Read the history collection and filter locally. This avoids requiring
  // a Firebase .indexOn rule for ts, so the app works with the current DB rules.
  const snap = await get(ref(db, `${BASE}/history`));
  const v = snap.val() || {};
  return Object.values(v)
    .map(normalize)
    .filter((r) => r && r.ts >= fromMs && r.ts <= toMs)
    .sort((a, b) => a.ts - b.ts)
    .slice(-limit);
}

export function subscribeConfig(cb) {
  if (isDemo) {
    demoInit();
    cb(demo.cfg);
    return () => {};
  }
  return onValue(ref(db, `${BASE}/config`), (s) => cb({ ...DEFAULT_CONFIG, ...(s.val() || {}) }));
}

export async function saveConfig(cfg) {
  if (isDemo) {
    demoInit();
    demo.cfg = cfg;
    localStorage.setItem('cs_cfg', JSON.stringify(cfg));
    return;
  }
  await set(ref(db, `${BASE}/config`), cfg);
}
