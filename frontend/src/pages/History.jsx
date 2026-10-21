import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Header } from '../App.jsx';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function History() {
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/attempts/mine')
      .then(setAttempts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="page">
        <p className="kicker">Your record</p>
        <h1>My History</h1>
        {loading && <p className="muted">Loading attempts…</p>}
        {error && <div className="error-box">{error}</div>}
        {!loading && !error && attempts.length === 0 && (
          <p className="muted">
            No attempts yet. <Link to="/topics">Take a quiz</Link> to get started.
          </p>
        )}
        {attempts.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Topic</th>
                  <th>Score</th>
                  <th>Correct</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDate(a.createdAt)}</td>
                    <td>{a.topicTitle}</td>
                    <td><strong>{Math.round(a.scorePct)}%</strong></td>
                    <td>{a.correct} / {a.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
