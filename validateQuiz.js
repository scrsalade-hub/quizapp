// Shared quiz JSON validator. Returns { valid: boolean, errors: string[] }.
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateQuestion(q, index) {
  const errors = [];
  const label = `questions[${index}]`;

  if (q === null || typeof q !== 'object' || Array.isArray(q)) {
    return [`${label}: must be an object`];
  }
  if (q.type !== 'mcq' && q.type !== 'truefalse' && q.type !== 'matching') {
    errors.push(`${label}.type: must be "mcq", "truefalse" or "matching"`);
    return errors; // cannot validate further without a valid type
  }
  if (!isNonEmptyString(q.question)) {
    errors.push(`${label}.question: must be a non-empty string`);
  }
  if (q.explanation !== undefined && typeof q.explanation !== 'string') {
    errors.push(`${label}.explanation: must be a string when provided`);
  }

  if (q.type === 'mcq') {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`${label}.options: must be an array of at least 2 strings`);
    } else {
      q.options.forEach((opt, i) => {
        if (typeof opt !== 'string') {
          errors.push(`${label}.options[${i}]: must be a string`);
        }
      });
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
        errors.push(`${label}.answer: must be an integer index between 0 and options.length - 1`);
      }
    }
  } else if (q.type === 'truefalse') {
    if (typeof q.answer !== 'boolean') {
      errors.push(`${label}.answer: must be a boolean`);
    }
  } else if (q.type === 'matching') {
    if (!Array.isArray(q.pairs) || q.pairs.length < 2) {
      errors.push(`${label}.pairs: must be an array of at least 2 pairs`);
    } else {
      q.pairs.forEach((p, i) => {
        if (p === null || typeof p !== 'object' || Array.isArray(p)) {
          errors.push(`${label}.pairs[${i}]: must be an object {left, right}`);
        } else {
          if (!isNonEmptyString(p.left)) errors.push(`${label}.pairs[${i}].left: must be a non-empty string`);
          if (!isNonEmptyString(p.right)) errors.push(`${label}.pairs[${i}].right: must be a non-empty string`);
        }
      });
    }
  }
  return errors;
}

function validateQuiz(body) {
  const errors = [];
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['body: must be a JSON object'] };
  }
  if (!isNonEmptyString(body.title)) {
    errors.push('title: must be a non-empty string');
  }
  if (body.instructions !== undefined && typeof body.instructions !== 'string') {
    errors.push('instructions: must be a string when provided');
  }
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    errors.push('questions: must be a non-empty array');
  } else {
    body.questions.forEach((q, i) => {
      errors.push(...validateQuestion(q, i));
    });
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { validateQuiz };
