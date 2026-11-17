import { useEffect, useMemo, useState } from 'react';
import { Thermometer, Droplets, DoorOpen, Timer, RefreshCw } from 'lucide-react';
import TrendChart from '../components/TrendChart';
import { fetchRange } from '../data';
import { summarize, fmtDateTime, fmtDuration } from '../utils';

const RANGES = [
  { id: '1h', label: '1 hour', ms: 3600e3 },
  { id: '6h', label: '6 hours', ms: 6 * 3600e3 },
  { id: '24h', label: '24 hours', ms: 24 * 3600e3 },
  { id: '7d', label: '7 days', ms: 7 * 864e5 },
];

const f1 = (v) => (v == null ? '--' : v.toFixed(1));
const DISPLAY_CONFIG = { tempMin: 0, tempMax: 18, humMax: 85, delayMin: 0 };

export default function History() {
  const [range, setRange] = useState('24h');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    const ms = RANGES.find((r) => r.id === range).ms;
    const to = Date.now();
    fetchRange(to - ms, to)
      .then((r) => live && setRows(r))
      .catch((e) => live && setError(e.message || 'Could not load history'))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [range, tick]);

  const s = useMemo(() => summarize(rows, DISPLAY_CONFIG), [rows]);
  // keep the chart light: at most ~400 points
  const chartData = useMemo(() => {
    const step = Math.ceil(rows.length / 400) || 1;
    return rows.filter((_, i) => i % step === 0);
  }, [rows]);

  return (
    <div className="stack">
      <div className="page-head">
        <div><h2>History</h2><p className="muted">Past temperature, humidity and door activity.</p></div>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
          <button onClick={() => setTick(tick + 1)} title="Refresh" aria-label="Refresh"><RefreshCw size={15} /></button>
        </div>
      </div>

      {error && <div className="banner bad"><div><b>Error</b><span>{error}</span></div></div>}
      {loading && <div className="empty">Loading…</div>}

      {!loading && !error && rows.length === 0 && <div className="empty">No readings in this period.</div>}

      {!loading && rows.length > 0 && (
        <>
          <div className="stats four">
            <div className="stat"><div className="stat-top"><span className="stat-icon"><Thermometer size={19} /></span><span className="stat-label">Temperature</span></div>
              <div className="stat-val">{f1(s.avgTemp)}<small>°C avg</small></div><div className="stat-sub">Min {f1(s.min)} · Max {f1(s.max)} °C</div></div>
            <div className="stat"><div className="stat-top"><span className="stat-icon"><Droplets size={19} /></span><span className="stat-label">Humidity</span></div>
              <div className="stat-val">{s.avgHum == null ? '--' : Math.round(s.avgHum)}<small>% avg</small></div><div className="stat-sub">{s.count} readings</div></div>
            <div className="stat"><div className="stat-top"><span className="stat-icon"><DoorOpen size={19} /></span><span className="stat-label">Door opened</span></div>
              <div className="stat-val">{s.doorOpens}<small>times</small></div><div className="stat-sub">In this period</div></div>
            <div className={`stat ${s.outMs > 0 ? 'warn' : ''}`}><div className="stat-top"><span className="stat-icon"><Timer size={19} /></span><span className="stat-label">Out of range</span></div>
              <div className="stat-val">{fmtDuration(s.outMs)}</div><div className="stat-sub">Recorded outside the temperature limit</div></div>
          </div>

          <section className="panel">
            <h3>Temperature and humidity</h3>
            <TrendChart data={chartData} cfg={DISPLAY_CONFIG} long={range === '7d' || range === '24h'} height={320} />
            <p className="muted note">Temperature limit = 18 °C.</p>
          </section>

          <section className="panel">
            <h3>Events <small>{s.events.length}</small></h3>
            {s.events.length === 0 ? <p className="muted">No door or alarm events in this period.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Event</th></tr></thead>
                  <tbody>
                    {s.events.slice(0, 50).map((e, i) => (
                      <tr key={i}><td>{fmtDateTime(e.ts)}</td><td><span className={`dot ${e.level}`} />{e.type}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <h3>Recent readings</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Time</th><th>Temp (°C)</th><th>Hum (%)</th><th>Door</th><th>Alarm</th></tr></thead>
                <tbody>
                  {rows.slice(-30).reverse().map((r) => (
                    <tr key={r.ts}>
                      <td>{fmtDateTime(r.ts)}</td><td>{f1(r.temp)}</td><td>{r.hum ?? '--'}</td>
                      <td>{r.door ? 'Open' : 'Closed'}</td><td>{r.alarm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
