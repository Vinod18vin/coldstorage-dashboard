import { useState } from 'react';
import { Snowflake, Lock as LockIcon, User, Eye, EyeOff, ArrowRight } from 'lucide-react';

const USER = 'admin';
const PASS = 'admin@123';

export default function Lock({ onUnlock }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (u.trim() === USER && p === PASS) onUnlock();
    else setErr('Incorrect username or password.');
  };

  return (
    <div className="lock-wrap">
      <form className="lock-card" onSubmit={submit}>
        <div className="logo-tile"><Snowflake size={30} /></div>
        <h1>Cold Storage Monitor</h1>
        <p className="muted">Sign in to view live storage conditions.</p>

        <label className="field">
          <span>Username</span>
          <div className="input">
            <User size={17} />
            <input value={u} onChange={(e) => { setU(e.target.value); setErr(''); }} autoFocus autoComplete="username" placeholder="Enter username" />
          </div>
        </label>

        <label className="field">
          <span>Password</span>
          <div className="input">
            <LockIcon size={17} />
            <input type={show ? 'text' : 'password'} value={p} onChange={(e) => { setP(e.target.value); setErr(''); }} autoComplete="current-password" placeholder="Enter password" />
            <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label="Toggle password visibility">
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        {err && <div className="form-err">{err}</div>}

        <button className="btn primary full" type="submit">Unlock <ArrowRight size={17} /></button>
      </form>
    </div>
  );
}
