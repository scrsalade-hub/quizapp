// Quiz shuffling: Fisher-Yates for question order, option order (with answer
// index remapping) and matching right-side block order.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildShuffledQuiz(topic) {
  const order = shuffle(topic.questions.map((_, i) => i));
  const questions = order.map((origIndex) => {
    const q = topic.questions[origIndex];
    const out = { qid: origIndex, type: q.type, question: q.question };
    if (q.explanation !== undefined) out.explanation = q.explanation;

    if (q.type === 'mcq') {
      // shuffle options and remap the answer index
      const optOrder = shuffle(q.options.map((_, i) => i));
      out.options = optOrder.map((i) => q.options[i]);
      out.answer = optOrder.indexOf(q.answer);
    } else if (q.type === 'truefalse') {
      out.answer = q.answer;
    } else if (q.type === 'matching') {
      // keep lefts fixed in pair order, shuffle right-side block order
      const rightOrder = shuffle(q.pairs.map((_, i) => i));
      out.pairs = q.pairs.map((p) => ({ left: p.left, right: p.right }));
      out.rights = rightOrder.map((i) => q.pairs[i].right);
    }
    return out;
  });
  return { title: topic.title, instructions: topic.instructions || '', questions };
}

module.exports = { shuffle, buildShuffledQuiz };
