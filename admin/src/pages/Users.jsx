import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Header } from '../App.jsx';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api('/api/admin/users')
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="page">
        <p className="kicker">Performance</p>
        <h1>Users</h1>
        {loading && <p className="muted">Loading users…</p>}
        {error && <div className="error-box">{error}</div>}
        {!loading && !error && users.length === 0 && (
          <p className="muted">No users have signed in yet.</p>
        )}
        {users.length > 0 && (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Joined</th>
                  <th>Last active</th>
                  <th>Attempts</th>
                  <th>Topics tried</th>
                  <th>Avg %</th>
                  <th>Best %</th>
                  <th>Latest %</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="clickable" onClick={() => navigate(`/users/${u.id}`)}>
                    <td title={u.id}>…{u.id.slice(-6)}</td>
                    <td><strong>{u.name}</strong></td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>{fmtDate(u.lastActiveAt)}</td>
                    <td>{u.totalAttempts}</td>
                    <td>{u.topicsAttempted}</td>
                    <td>{u.totalAttempts ? Math.round(u.avgScorePct) : '—'}</td>
                    <td>{u.totalAttempts ? Math.round(u.bestScorePct) : '—'}</td>
                    <td>{u.latestScorePct !== null ? Math.round(u.latestScorePct) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {users.length > 0 && <p className="muted mt serif">Click a row to open the full profile.</p>}
      </main>
    </>
  );
}
