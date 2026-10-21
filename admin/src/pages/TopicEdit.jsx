import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Header } from '../App.jsx';

const EMPTY_DOC = JSON.stringify(
  {
    title: '',
    instructions: '',
    questions: [
      {
        type: 'mcq',
        question: '',
        options: ['', ''],
        answer: 0,
        explanation: '',
      },
    ],
  },
  null,
  2
);

export default function TopicEdit() {
  const { id } = useParams(); // undefined = new
  const isNew = !id;
  const navigate = useNavigate();

  const [json, setJson] = useState(EMPTY_DOC);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingTopic, setLoadingTopic] = useState(!isNew);

  const loadCurrent = async () => {
    if (isNew) return;
    setLoadingTopic(true);
    setErrors([]);
    try {
      const topics = await api('/api/admin/topics');
      const topic = topics.find((t) => t.id === id);
      if (!topic) throw new Error('Topic not found');
      setJson(JSON.stringify({
        title: topic.title,
        instructions: topic.instructions,
        questions: topic.questions,
      }, null, 2));
      setNotice('Loaded current topic from server.');
    } catch (e) {
      setErrors([e.message]);
    } finally {
      setLoadingTopic(false);
    }
  };

  useEffect(() => {
    if (!isNew) loadCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const format = () => {
    setErrors([]);
    setNotice('');
    try {
      const parsed = JSON.parse(json);
      setJson(JSON.stringify(parsed, null, 2));
      setNotice('JSON is syntactically valid and has been formatted.');
    } catch (e) {
      setErrors([`JSON syntax error: ${e.message}`]);
    }
  };

  const save = async () => {
    setErrors([]);
    setNotice('');
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      setErrors([`JSON syntax error: ${e.message}`]);
      return;
    }
    setBusy(true);
    try {
      if (isNew) {
        await api('/api/admin/topics', { method: 'POST', body: parsed });
      } else {
        await api(`/api/admin/topics/${id}`, { method: 'PUT', body: parsed });
      }
      navigate('/topics');
    } catch (e) {
      if (Array.isArray(e.errors)) setErrors(e.errors);
      else setErrors([e.message]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header />
      <main className="page">
        <p className="kicker">{isNew ? 'New topic' : 'Edit topic'}</p>
        <h1>{isNew ? 'Create Topic' : 'Edit Topic'}</h1>
        <p className="serif muted">
          Paste or write the quiz JSON below. Schema: title, instructions, questions[]
          with types mcq / truefalse / matching. The server validates on save.
        </p>

        {loadingTopic ? (
          <p className="muted">Loading topic…</p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="json">Quiz JSON</label>
              <textarea
                id="json"
                value={json}
                onChange={(e) => setJson(e.target.value)}
                spellCheck={false}
              />
            </div>

            {errors.length > 0 && (
              <div className="error-box">
                <strong>{errors.length} validation error{errors.length > 1 ? 's' : ''}:</strong>
                <ul>
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            {notice && <div className="success-box">{notice}</div>}

            <div className="row">
              <button className="btn primary" onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Validate & Save'}
              </button>
              <button className="btn" onClick={format}>Format</button>
              {!isNew && <button className="btn" onClick={loadCurrent}>Load current</button>}
              <button className="btn" onClick={() => navigate('/topics')}>Cancel</button>
            </div>
          </>
        )}
      </main>
    </>
  );
}
