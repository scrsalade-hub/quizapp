import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Header } from '../App.jsx';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api('/api/admin/topics')
      .then(setTopics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.title}"? This cannot be undone. (User attempts are kept.)`)) return;
    setDeleting(t.id);
    try {
      await api(`/api/admin/topics/${t.id}`, { method: 'DELETE' });
      setTopics((list) => list.filter((x) => x.id !== t.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <Header />
      <main className="page">
        <div className="row">
          <div>
            <p className="kicker">Content</p>
            <h1 style={{ marginBottom: 0 }}>Topics</h1>
          </div>
          <div className="spacer" />
          <button className="btn primary" onClick={() => navigate('/topics/new')}>New Topic</button>
        </div>

        {loading && <p className="muted mt">Loading topics…</p>}
        {error && <div className="error-box">{error}</div>}
        {!loading && !error && topics.length === 0 && (
          <p className="muted mt">No topics yet. Create the first one.</p>
        )}

        <div className="card-grid">
          {topics.map((t) => (
            <div className="card" key={t.id}>
              <span className="meta">
                {t.questionCount} questions · created {fmtDate(t.createdAt)}
              </span>
              <h3>{t.title}</h3>
              <p className="snippet">{t.instructions}</p>
              <div className="row">
                <Link className="btn small" to={`/topics/${t.id}/edit`}>Edit</Link>
                <button
                  className="btn small danger"
                  disabled={deleting === t.id}
                  onClick={() => remove(t)}
                >
                  {deleting === t.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
