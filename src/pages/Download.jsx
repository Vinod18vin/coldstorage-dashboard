import { useState } from 'react';
import { FileSpreadsheet, FileJson, Download as DlIcon, CalendarRange } from 'lucide-react';
import { fetchRange } from '../data';
import { download, toCsv, pad } from '../utils';

const PRESETS = [
  { id: '24h', label: 'Last 24 hours', ms: 864e5 },
  { id: '7d', label: 'Last 7 days', ms: 7 * 864e5 },
  { id: '30d', label: 'Last 30 days', ms: 30 * 864e5 },
  { id: 'custom', label: 'Custom dates' },
];

const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function DownloadPage() {
  const today = dayStr(new Date());
  const [preset, setPreset] = useState('24h');
  const [from, setFrom] = useState(dayStr(new Date(Date.now() - 864e5)));
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  const go = async (fmt) => {
    setBusy(fmt);
    setMsg(null);
    try {
      let a, b;
      if (preset === 'custom') {
        a = new Date(`${from}T00:00:00`).getTime();
        b = new Date(`${to}T23:59:59`).getTime();
        if (!(a < b)) throw new Error('"From" date must be before "To" date.');
      } else {
        b = Date.now();
        a = b - PRESETS.find((p) => p.id === preset).ms;
      }
      const rows = await fetchRange(a, b, 20000);
      if (!rows.length) { setMsg({ ok: false, text: 'No readings found in that period.' }); return; }
      const stamp = dayStr(new Date());
      if (fmt === 'csv') download(`coldstorage_${stamp}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
      else download(`coldstorage_${stamp}.json`, JSON.stringify(rows.map((r) => ({ ...r, iso: new Date(r.ts).toISOString() })), null, 2), 'application/json');
      setMsg({ ok: true, text: `Downloaded ${rows.length} readings.` });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'Download failed.' });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="stack narrow">
      <div className="page-head"><div><h2>Download Data</h2><p className="muted">Export logged readings for reports and analysis.</p></div></div>

      <section className="panel">
        <h3><CalendarRange size={18} /> Time period</h3>
        <div className="seg wrap">
          {PRESETS.map((p) => <button key={p.id} className={preset === p.id ? 'on' : ''} onClick={() => setPreset(p.id)}>{p.label}</button>)}
        </div>
        {preset === 'custom' && (
          <div className="dates">
            <label className="field"><span>From</span><input className="plain" type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="field"><span>To</span><input className="plain" type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
        )}
      </section>

      <section className="panel">
        <h3><DlIcon size={18} /> Format</h3>
        <div className="fmt">
          <button className="fmt-card" disabled={!!busy} onClick={() => go('csv')}>
            <FileSpreadsheet size={28} /><b>CSV</b><span>Opens in Excel / Google Sheets</span>
            <em>{busy === 'csv' ? 'Preparing…' : 'Download CSV'}</em>
          </button>
          <button className="fmt-card" disabled={!!busy} onClick={() => go('json')}>
            <FileJson size={28} /><b>JSON</b><span>For Python, pandas or your own scripts</span>
            <em>{busy === 'json' ? 'Preparing…' : 'Download JSON'}</em>
          </button>
        </div>
        {msg && <div className={`banner ${msg.ok ? 'good' : 'bad'} slim`}><div><span>{msg.text}</span></div></div>}
        <p className="muted note">Columns: timestamp, epoch_ms, temperature_c, humidity_pct, door, alarm.</p>
      </section>
    </div>
  );
}
