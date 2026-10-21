import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Header } from '../App.jsx';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/api/admin/users/${id}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (<><Header /><main className="page"><p className="muted">Loading profile…</p></main></>);
  }
  if (error) {
    return (<><Header /><main className="page"><div className="error-box">{error}</div></main></>);
  }
  if (!data) return null;

  const { user, attempts, perTopicStats } = data;

  return (
    <>
      <Header />
      <main className="page">
        <p className="kicker">User profile</p>
        <h1>{user.name}</h1>
        <p className="muted serif">
          ID: {user.id} · Joined {fmtDate(user.createdAt)} · Last active {fmtDate(user.lastActiveAt)}
        </p>

        <div className="stat-cards">
          <div className="stat-card"><div className="v">{user.totalAttempts}</div><div className="l">Attempts</div></div>
          <div className="stat-card"><div className="v">{user.topicsAttempted}</div><div className="l">Topics tried</div></div>
          <div className="stat-card"><div className="v">{user.totalAttempts ? `${Math.round(user.avgScorePct)}%` : '—'}</div><div className="l">Average</div></div>
          <div className="stat-card"><div className="v">{user.totalAttempts ? `${Math.round(user.bestScorePct)}%` : '—'}</div><div className="l">Best</div></div>
          <div className="stat-card"><div className="v">{user.latestScorePct !== null ? `${Math.round(user.latestScorePct)}%` : '—'}</div><div className="l">Latest</div></div>
        </div>

        <h2>Per-topic stats</h2>
        {perTopicStats.length === 0 && <p className="muted">No attempts yet.</p>}
        <div className="card-grid">
          {perTopicStats.map((t) => (
            <div className="card" key={t.topicId}>
              <h3>{t.topicTitle}</h3>
              <div className="meta">
                {t.attempts} attempt{t.attempts !== 1 ? 's' : ''} · best {Math.round(t.best)}% ·
                latest {Math.round(t.latest)}% · avg {Math.round(t.avg)}%
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt">Attempts</h2>
        {attempts.length === 0 && <p className="muted">This user has not completed any quizzes.</p>}
        {attempts.map((a) => (
          <details className="accordion" key={a.id}>
            <summary>
              <span>{a.topicTitle}</span>
              <span>
                <span className={`badge ${a.scorePct >= 50 ? 'ok' : 'bad'}`} style={{ marginRight: 10 }}>
                  {Math.round(a.scorePct)}%
                </span>
                {a.correct}/{a.total} · {fmtDate(a.createdAt)}
              </span>
            </summary>
            <div className="body">
              {(a.perQuestion || []).map((p, i) => (
                <div className="review-item" key={i}>
                  <span className={`badge ${p.correct ? 'ok' : 'bad'}`}>
                    {p.correct ? 'Correct' : 'Incorrect'}
                  </span>
                  <p className="q">{i + 1}. {p.questionText}</p>
                  <p className="ans"><b>User answer:</b> {p.userAnswer || '—'}</p>
                  {!p.correct && <p className="ans"><b>Correct answer:</b> {p.correctAnswer}</p>}
                  {p.explanation && <p className="expl">{p.explanation}</p>}
                </div>
              ))}
            </div>
          </details>
        ))}
      </main>
    </>
  );
}
