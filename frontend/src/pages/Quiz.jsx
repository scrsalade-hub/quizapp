import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Header } from '../App.jsx';
import Calculator from '../components/Calculator.jsx';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* ---------------- MCQ ---------------- */
function McqQuestion({ q, checked, selected, onSelect }) {
  return (
    <div>
      {q.options.map((opt, i) => {
        let cls = 'option-btn';
        if (checked) {
          if (i === q.answer) cls += ' correct';
          else if (i === selected) cls += ' wrong';
        } else if (i === selected) cls += ' selected';
        return (
          <button
            key={i}
            className={cls}
            disabled={checked}
            onClick={() => onSelect(i)}
          >
            <span className="letter">{LETTERS[i]}</span>
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- True / False ---------------- */
function TrueFalseQuestion({ q, checked, selected, onSelect }) {
  const render = (value, label) => {
    let cls = 'tf-btn';
    if (checked) {
      if (value === q.answer) cls += ' correct';
      else if (value === selected) cls += ' wrong';
    } else if (value === selected) cls += ' selected';
    return (
      <button className={cls} disabled={checked} onClick={() => onSelect(value)}>
        {label}
      </button>
    );
  };
  return (
    <div className="tf-row">
      {render(true, 'True')}
      {render(false, 'False')}
    </div>
  );
}

/* ---------------- Matching ---------------- */
function MatchingQuestion({ q, checked, slots, setSlots, selectedBlock, setSelectedBlock }) {
  // slots[i] = index into q.rights placed for pair i, or null
  const usedBlocks = new Set(slots.filter((s) => s !== null));
  const poolBlocks = q.rights.map((_, i) => i).filter((i) => !usedBlocks.has(i));

  const placeInSlot = (slotIndex) => {
    if (checked) return;
    if (slots[slotIndex] !== null) {
      // tapping a filled slot returns its block to the pool
      const next = slots.slice();
      next[slotIndex] = null;
      setSlots(next);
      return;
    }
    if (selectedBlock !== null) {
      const next = slots.slice();
      next[slotIndex] = selectedBlock;
      setSlots(next);
      setSelectedBlock(null);
    }
  };

  const onDropToSlot = (e, slotIndex) => {
    e.preventDefault();
    if (checked) return;
    const block = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(block)) return;
    const next = slots.slice();
    // if the block came from another slot, clear that slot
    const fromSlot = next.indexOf(block);
    if (fromSlot !== -1) next[fromSlot] = null;
    next[slotIndex] = block;
    setSlots(next);
    setSelectedBlock(null);
  };

  const blockStatus = (slotIndex) => {
    if (!checked || slots[slotIndex] === null) return '';
    return q.rights[slots[slotIndex]] === q.pairs[slotIndex].right ? 'correct' : 'wrong';
  };

  const renderBlock = (blockIndex, inSlot, slotIndex) => (
    <div
      key={blockIndex}
      className={
        'match-block' +
        (selectedBlock === blockIndex && !inSlot ? ' selected' : '') +
        (inSlot ? ' in-slot' : '')
      }
      draggable={!checked}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(blockIndex));
        e.dataTransfer.effectAllowed = 'move';
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (inSlot) placeInSlot(slotIndex);
          else if (!checked) setSelectedBlock(selectedBlock === blockIndex ? null : blockIndex);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (inSlot) placeInSlot(slotIndex);
        else if (!checked) setSelectedBlock(selectedBlock === blockIndex ? null : blockIndex);
      }}
    >
      {q.rights[blockIndex]}
    </div>
  );

  return (
    <div>
      {q.pairs.map((pair, i) => (
        <div className="match-row" key={i}>
          <div className="match-left">{pair.left}</div>
          <div
            className={
              'match-slot' +
              (slots[i] !== null ? ' filled' : '') +
              (checked && slots[i] !== null ? ' ' + blockStatus(i) : '')
            }
            onClick={() => placeInSlot(i)}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
            onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
            onDrop={(e) => { e.currentTarget.classList.remove('dragover'); onDropToSlot(e, i); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); placeInSlot(i); } }}
            aria-label={`Answer slot for ${pair.left}`}
          >
            {slots[i] !== null ? renderBlock(slots[i], true, i) : 'Tap a block below, then tap here'}
          </div>
        </div>
      ))}
      <div className="match-pool">
        <span className="pool-label">Answer blocks — tap to select, then tap a slot (or drag)</span>
        {poolBlocks.length === 0 && <span className="muted serif">All blocks placed.</span>}
        {poolBlocks.map((i) => renderBlock(i, false, null))}
      </div>
    </div>
  );
}

/* ---------------- Quiz page ---------------- */
export default function Quiz() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);

  // per-question interaction state
  const [selected, setSelected] = useState(null);          // mcq index / tf boolean
  const [slots, setSlots] = useState([]);                  // matching placements
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [checked, setChecked] = useState(false);

  const [details, setDetails] = useState([]);              // perQuestion results
  const [correctCount, setCorrectCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setQuiz(null);
    setIndex(0);
    setDetails([]);
    setCorrectCount(0);
    api('/api/quiz/start', { method: 'POST', body: { topicId } })
      .then((data) => {
        setQuiz(data);
        resetQuestionState(data.questions[0]);
      })
      .catch((e) => setError(e.message));
  }, [topicId]);

  const resetQuestionState = (q) => {
    setSelected(null);
    setChecked(false);
    setSelectedBlock(null);
    setSlots(q && q.type === 'matching' ? q.pairs.map(() => null) : []);
  };

  const question = quiz?.questions[index];
  const total = quiz?.questions.length || 0;

  const canCheck = useMemo(() => {
    if (!question || checked) return false;
    if (question.type === 'matching') return slots.length > 0 && slots.every((s) => s !== null);
    return selected !== null;
  }, [question, checked, selected, slots]);

  const grade = () => {
    if (!question || !canCheck) return;
    let isCorrect = false;
    let userAnswer = '';
    let correctAnswer = '';

    if (question.type === 'mcq') {
      isCorrect = selected === question.answer;
      userAnswer = `${LETTERS[selected]}. ${question.options[selected]}`;
      correctAnswer = `${LETTERS[question.answer]}. ${question.options[question.answer]}`;
    } else if (question.type === 'truefalse') {
      isCorrect = selected === question.answer;
      userAnswer = selected ? 'True' : 'False';
      correctAnswer = question.answer ? 'True' : 'False';
    } else if (question.type === 'matching') {
      isCorrect = question.pairs.every((p, i) => question.rights[slots[i]] === p.right);
      userAnswer = question.pairs
        .map((p, i) => `${p.left} → ${question.rights[slots[i]]}`)
        .join('; ');
      correctAnswer = question.pairs.map((p) => `${p.left} → ${p.right}`).join('; ');
    }

    setChecked(true);
    if (isCorrect) setCorrectCount((c) => c + 1);
    setDetails((d) => [
      ...d,
      {
        questionIndex: question.qid,
        type: question.type,
        questionText: question.question,
        correct: isCorrect,
        userAnswer,
        correctAnswer,
        explanation: question.explanation || '',
      },
    ]);
  };

  const next = async () => {
    if (index + 1 < total) {
      const nextQ = quiz.questions[index + 1];
      setIndex(index + 1);
      resetQuestionState(nextQ);
      return;
    }
    // finished — submit attempt
    setSubmitting(true);
    const finalCorrect = details.filter((d) => d.correct).length;
    const scorePct = Math.round((finalCorrect / total) * 1000) / 10;
    try {
      await api('/api/attempts', {
        method: 'POST',
        body: { topicId, scorePct, correct: finalCorrect, total, perQuestion: details },
      });
    } catch (e) {
      // Even if saving fails, still show results so the practice flow isn't blocked.
      console.error('Failed to save attempt:', e);
    }
    navigate('/results', {
      state: {
        topicId,
        title: quiz.title,
        scorePct,
        correct: finalCorrect,
        total,
        details,
      },
    });
  };

  if (error) {
    return (
      <>
        <Header />
        <main className="page"><div className="error-box">{error}</div></main>
      </>
    );
  }
  if (!quiz || !question) {
    return (
      <>
        <Header />
        <main className="page"><p className="muted">Preparing your shuffled quiz…</p></main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="page">
        <p className="kicker">{quiz.title}</p>
        {index === 0 && quiz.instructions && !checked && (
          <p className="instructions">{quiz.instructions}</p>
        )}

        <div className="progress-wrap">
          <div className="progress-label">
            <span>Question {index + 1} of {total}</span>
            <span>{correctCount} correct so far</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${((index + (checked ? 1 : 0)) / total) * 100}%` }} />
          </div>
        </div>

        <h2 className="question-text">{question.question}</h2>

        {question.type === 'mcq' && (
          <McqQuestion q={question} checked={checked} selected={selected} onSelect={setSelected} />
        )}
        {question.type === 'truefalse' && (
          <TrueFalseQuestion q={question} checked={checked} selected={selected} onSelect={setSelected} />
        )}
        {question.type === 'matching' && (
          <MatchingQuestion
            q={question}
            checked={checked}
            slots={slots}
            setSlots={setSlots}
            selectedBlock={selectedBlock}
            setSelectedBlock={setSelectedBlock}
          />
        )}

        {checked && (
          <div className="explanation">
            <span className={`tag ${details[details.length - 1]?.correct ? 'ok' : 'bad'}`}>
              {details[details.length - 1]?.correct ? 'Correct' : 'Incorrect'}
            </span>
            {!details[details.length - 1]?.correct && (
              <p><b>Correct answer: </b>{details[details.length - 1]?.correctAnswer}</p>
            )}
            {question.explanation && <p style={{ marginBottom: 0 }}>{question.explanation}</p>}
          </div>
        )}

        <div className="quiz-actions">
          {!checked && (
            <button className="btn primary" disabled={!canCheck} onClick={grade}>
              Check Answer
            </button>
          )}
          {checked && (
            <button className="btn primary" onClick={next} disabled={submitting}>
              {index + 1 < total ? 'Next' : submitting ? 'Saving…' : 'See Results'}
            </button>
          )}
        </div>
      </main>
      <Calculator />
    </>
  );
}
