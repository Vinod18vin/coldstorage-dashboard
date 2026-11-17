import { Snowflake, Activity, History, Download, LogOut } from 'lucide-react';

const LINKS = [
  { id: 'current-status', label: 'Live Monitor', Icon: Activity },
  { id: 'history', label: 'History', Icon: History },
  { id: 'download', label: 'Export Data', Icon: Download },
];

export default function Header({ route, onLogout }) {
  return (
    <header className="header">
      <div className="header-in">
        <a className="brand" href="#" aria-label="ColdWatch home">
          <span className="brand-mark"><Snowflake size={21} /></span>
          <span>ColdWatch</span>
        </a>
        <nav className="nav" aria-label="Main navigation">
          {LINKS.map(({ id, label, Icon }) => (
            <a key={id} href={`#${id}`} className={route === id ? 'active' : ''} aria-current={route === id ? 'page' : undefined}>
              <Icon size={16} /><span>{label}</span>
            </a>
          ))}
          <button className="btn ghost" onClick={onLogout}><LogOut size={15} /><span>Sign out</span></button>
        </nav>
      </div>
    </header>
  );
}
