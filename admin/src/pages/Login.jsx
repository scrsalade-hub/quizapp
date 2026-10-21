import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, storeAdmin } from '../api.js';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/admin/login', { method: 'POST', body: { password } });
      storeAdmin(data);
      navigate('/topics');
    } catch (err) {
      setError(err.status === 401 ? 'Invalid password.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="panel white auth-panel">
        <p className="kicker">Restricted</p>
        <h1>Admin Login</h1>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="password">Admin password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </div>
          {error && <div className="error-box">{error}</div>}
          <button className="btn primary" type="submit" disabled={busy || !password}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
