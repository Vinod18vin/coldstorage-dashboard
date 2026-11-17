// Timestamps from the ESP32 are epoch SECONDS (from NTP). Milliseconds also work.
export const toMs = (ts) => (ts < 1e12 ? ts * 1000 : ts);

export const DEFAULT_CONFIG = { tempMin: 2, tempMax: 8, humMax: 85, delayMin: 10 };

export function normalize(raw) {
  if (!raw || raw.ts == null) return null;
  const truthy = (v, ...yes) => v === true || v === 1 || v === '1' || yes.includes(v);
  return {
    ts: toMs(Number(raw.ts)),
    temp: raw.temp == null ? null : Number(raw.temp),
    hum: raw.hum == null ? null : Number(raw.hum),
    door: truthy(raw.door, 'OPEN', 'open'),          // 1 / "OPEN" = door open
    mains: raw.mains == null ? true : truthy(raw.mains, 'OK', 'ok'), // 1 = mains present
    batt: raw.batt == null ? null : Number(raw.batt), // battery volts (optional)
    alarm: raw.alarm || 'OK',
  };
}

export const pad = (n) => String(n).padStart(2, '0');

export function fmtTime(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fmtDateTime(ms) {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${fmtTime(ms)}`;
}

export function fmtDuration(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function battPercent(v) {
  if (v == null) return null;
  return Math.max(0, Math.min(100, Math.round(((v - 3.2) / (4.2 - 3.2)) * 100)));
}

export const ALARM_LABELS = {
  OK: 'All normal',
  TEMP_HIGH: 'Temperature too high',
  TEMP_LOW: 'Temperature too low',
  HUM_HIGH: 'Humidity too high',
  DOOR_OPEN: 'Door left open',
  POWER_LOST: 'Mains power lost',
  SENSOR_FAULT: 'Sensor fault',
};

export function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toCsv(rows) {
  const head = ['timestamp', 'epoch_ms', 'temperature_c', 'humidity_pct', 'door', 'alarm'];
  const lines = rows.map((r) =>
    [
      new Date(r.ts).toISOString(),
      r.ts,
      r.temp ?? '',
      r.hum ?? '',
      r.door ? 'OPEN' : 'CLOSED',
      r.alarm,
    ].join(',')
  );
  return [head.join(','), ...lines].join('\n');
}

// Summary stats for the History page
export function summarize(rows, cfg) {
  const temps = rows.map((r) => r.temp).filter((v) => v != null);
  const hums = rows.map((r) => r.hum).filter((v) => v != null);
  const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  let doorOpens = 0;
  let powerLosses = 0;
  let outMs = 0;
  const events = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const p = rows[i - 1];
    if (p) {
      if (!p.door && r.door) { doorOpens++; events.push({ ts: r.ts, type: 'Door opened', level: 'warn' }); }
      if (p.door && !r.door) events.push({ ts: r.ts, type: 'Door closed', level: 'ok' });
      if (p.mains && !r.mains) { powerLosses++; events.push({ ts: r.ts, type: 'Mains power lost', level: 'bad' }); }
      if (!p.mains && r.mains) events.push({ ts: r.ts, type: 'Mains power restored', level: 'ok' });
      if (p.alarm === 'OK' && r.alarm !== 'OK') events.push({ ts: r.ts, type: `Alarm: ${ALARM_LABELS[r.alarm] || r.alarm}`, level: 'bad' });
      if (p.alarm !== 'OK' && r.alarm === 'OK') events.push({ ts: r.ts, type: 'Alarm cleared', level: 'ok' });
      const out = p.temp != null && (p.temp > cfg.tempMax || p.temp < cfg.tempMin);
      if (out) outMs += Math.min(r.ts - p.ts, 10 * 60000);
    }
  }
  return {
    count: rows.length,
    min: temps.length ? Math.min(...temps) : null,
    max: temps.length ? Math.max(...temps) : null,
    avgTemp: avg(temps),
    avgHum: avg(hums),
    doorOpens,
    powerLosses,
    outMs,
    events: events.reverse(),
  };
}
