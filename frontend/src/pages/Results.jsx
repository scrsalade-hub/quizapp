import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '../App.jsx';

export default function Results() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state || !Array.isArray(state.details)) {
    return <Navigate to="/topics" replace />;
  }
  const { topicId, title, scorePct, correct, total, details } = state;

  return (
    <>
      <Header />
      <main className="page">
        <p className="kicker">Results</p>
        <h1>{title}</h1>

        <div className="score-hero">
          <div className="pct">{Math.round(scorePct)}%</div>
          <div className="sub">{correct} / {total} correct</div>
        </div>

        <div className="row" style={{ marginBottom: 32 }}>
          <button className="btn primary" onClick={() => navigate(`/quiz/${topicId}`)}>
            Retake (re-shuffled)
          </button>
          <Link className="btn" to="/topics">Choose another topic</Link>
        </div>

        <h2>Review</h2>
        {details.map((d, i) => (
          <div className="review-item" key={i}>
            <span className={`badge ${d.correct ? 'ok' : 'bad'}`}>
              {d.correct ? 'Correct' : 'Incorrect'}
            </span>
            <p className="q">{i + 1}. {d.questionText}</p>
            <p className="ans"><b>Your answer:</b> {d.userAnswer}</p>
            {!d.correct && <p className="ans"><b>Correct answer:</b> {d.correctAnswer}</p>}
            {d.explanation && <p className="expl">{d.explanation}</p>}
          </div>
        ))}
      </main>
    </>
  );
}
