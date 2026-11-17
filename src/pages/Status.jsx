import { useEffect, useState } from 'react';
import {
  Thermometer, Droplets, DoorOpen, DoorClosed, BellRing, ShieldCheck, Clock,
} from 'lucide-react';
import TrendChart from '../components/TrendChart';
import { useLatest } from '../components/useLatest';
import { subscribeRecent } from '../data';
import { ALARM_LABELS, fmtDateTime } from '../utils';

const DISPLAY_CONFIG = { tempMin: 0, tempMax: 18, humMax: 85 };

function Stat({ Icon, label, value, unit, state = 'ok', sub }) {
  return (
    <div className={`stat ${state}`}>
      <div className="stat-top"><span className="stat-icon"><Icon size={19} /></span><span className="stat-label">{label}</span></div>
      <div className="stat-val">{value}{unit && <small>{unit}</small>}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

export default function Status() {
  const { latest, online } = useLatest();
  const [series, setSeries] = useState([]);

  useEffect(() => subscribeRecent(60, setSeries), []);

  if (!latest) return <div className="empty">Waiting for the first reading from the device…</div>;

  const tempBad = latest.temp != null && latest.temp > 18;
  const humBad = latest.hum != null && latest.hum > 85;
  const alarmOn = latest.alarm !== 'OK' || tempBad;
  const alarmText = latest.alarm !== 'OK' ? ALARM_LABELS[latest.alarm] || latest.alarm : 'Temperature too high';

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h2>Current Status</h2>
          <p className="muted"><Clock size={14} /> Last reading {fmtDateTime(latest.ts)}</p>
        </div>
        <div className={`pill ${online ? 'ok' : 'off'}`}>{online ? 'Live' : 'Device offline'}</div>
      </div>

      {alarmOn ? (
        <div className="banner bad"><BellRing size={20} /><div><b>Alarm active</b><span>{alarmText}</span></div></div>
      ) : (
        <div className="banner good"><ShieldCheck size={20} /><div><b>All normal</b><span>Temperature is within the configured limit.</span></div></div>
      )}

      <div className="stats">
        <Stat Icon={Thermometer} label="Temperature" value={latest.temp ?? '--'} unit="°C" state={tempBad ? 'bad' : 'ok'}
              sub="Temperature limit 18 °C" />
        <Stat Icon={Droplets} label="Humidity" value={latest.hum ?? '--'} unit="%" state={humBad ? 'warn' : 'ok'}
              sub="Humidity reading" />
        <Stat Icon={latest.door ? DoorOpen : DoorClosed} label="Door" value={latest.door ? 'Open' : 'Closed'} state={latest.door ? 'warn' : 'ok'}
              sub={latest.door ? 'Close it to protect stock' : 'Sealed'} />
        <Stat Icon={BellRing} label="Alarm" value={alarmOn ? 'Active' : 'Clear'} state={alarmOn ? 'bad' : 'ok'}
              sub={alarmOn ? alarmText : ALARM_LABELS.OK} />
      </div>

      <section className="panel">
        <h3>Live trend <small>last {series.length} readings</small></h3>
        <TrendChart data={series} cfg={DISPLAY_CONFIG} />
      </section>
    </div>
  );
}
