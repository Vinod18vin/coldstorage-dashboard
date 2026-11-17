import { useEffect, useState } from 'react';
import Lock from './components/Lock.jsx';
import Header from './components/Header.jsx';
import Home from './pages/Home.jsx';
import Status from './pages/Status.jsx';
import History from './pages/History.jsx';
import DownloadPage from './pages/Download.jsx';

const ROUTES = { '': Home, home: Home, 'current-status': Status, history: History, download: DownloadPage };

const getRoute = () => window.location.hash.replace('#', '');

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('cs_auth') === '1');
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const on = () => { setRoute(getRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  if (!authed) {
    return <Lock onUnlock={() => { sessionStorage.setItem('cs_auth', '1'); setAuthed(true); }} />;
  }

  const Page = ROUTES[route] || Home;
  return (
    <>
      <Header
        route={route}
        onLogout={() => { sessionStorage.removeItem('cs_auth'); window.location.hash = ''; setAuthed(false); }}
      />
      <main className="page"><Page /></main>
    </>
  );
}
