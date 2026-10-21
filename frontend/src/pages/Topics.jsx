import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Header } from '../App.jsx';

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api('/api/topics')
      .then(setTopics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="page">
        <p className="kicker">Choose a topic</p>
        <h1>Practice Tests</h1>
        {loading && <p className="muted">Loading topics…</p>}
        {error && <div className="error-box">{error}</div>}
        {!loading && !error && topics.length === 0 && (
          <p className="muted">No topics available yet. Check back soon.</p>
        )}
        <div className="card-grid">
          {topics.map((t) => (
            <div className="card" key={t.id}>
              <span className="meta">{t.questionCount} questions</span>
              <h3>{t.title}</h3>
              <p className="snippet">{t.instructions}</p>
              <button className="btn primary" onClick={() => navigate(`/quiz/${t.id}`)}>
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
