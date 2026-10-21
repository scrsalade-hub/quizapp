import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, storeUser } from '../api.js';

export default function Login() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const cleaned = name.trim().replace(/\s+/g, ' ');
    if (cleaned.length < 2) {
      setError('Please enter at least 2 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/users/login', { method: 'POST', body: { name: cleaned } });
      storeUser(data);
      navigate('/topics');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="panel white auth-panel">
        <p className="kicker">Practice Tool</p>
        <h1>QuizApp</h1>
        <p className="serif muted">Enter your name to start practicing. Returning with the same name keeps your history.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ada Lovelace"
              autoFocus
              autoComplete="name"
            />
          </div>
          {error && <div className="error-box">{error}</div>}
          <button className="btn primary" type="submit" disabled={busy || name.trim().length < 2}>
            {busy ? 'Signing in…' : 'Start'}
          </button>
        </form>
      </div>
    </div>
  );
}
