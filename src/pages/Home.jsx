import { Snowflake, Activity, History, Download, ArrowRight, CheckCircle2, WifiOff, Gauge, Wifi } from 'lucide-react';
import { useLatest } from '../components/useLatest';
import { isDemo } from '../data';

const CARDS = [
  { id: 'current-status', tag: 'LIVE MONITORING', title: 'Current Status', desc: 'Monitor temperature, humidity, door activity and power conditions in real time.', Icon: Activity },
  { id: 'history', tag: 'ANALYTICS & EVENTS', title: 'History & Insights', desc: 'Explore historical readings, temperature trends, door events and power interruptions.', Icon: History },
  { id: 'download', tag: 'DATA MANAGEMENT', title: 'Export Data', desc: 'Download recorded sensor data in CSV or JSON format for reporting and analysis.', Icon: Download },
];

export default function Home() {
  const { online } = useLatest();
  return (
    <div className="home">
      <div className="logo-tile big"><Snowflake size={35} /></div>
      <div className={`pill ${online ? 'ok' : 'off'}`}>
        {online ? <CheckCircle2 size={14} /> : <WifiOff size={14} />}
        {online ? 'Monitoring system connected' : 'Device currently offline'}
        {isDemo && <em>· demo data</em>}
      </div>
      <div>
        <h1 className="hero">Cold storage, under<br /><span>control and in view.</span></h1>
        <p className="muted" style={{ justifyContent: 'center' }}>A clear view of your storage environment, equipment health and recorded data.</p>
      </div>
      <div className="cards3">
        {CARDS.map(({ id, tag, title, desc, Icon }) => (
          <a key={id} href={`#${id}`} className="home-card">
            <div className="hc-top"><span className="hc-icon"><Icon size={21} /></span><span className="hc-tag">{tag}</span></div>
            <h3>{title}</h3>
            <p>{desc}</p>
            <ArrowRight className="hc-arrow" size={18} />
          </a>
        ))}
      </div>
      <div className="strip">
        <div><Gauge size={21} /><div><b>Intelligent cold-chain monitoring</b><small>Sensor readings collected from your ESP32 unit</small></div></div>
        <div><Wifi size={21} /><div><b>Connected monitoring dashboard</b><small>Live status, event history and data exports in one place</small></div></div>
      </div>
    </div>
  );
}
