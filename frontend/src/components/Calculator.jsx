import React, { useCallback, useEffect, useRef, useState } from 'react';

/* ---------------- Safe expression parser (recursive descent, no eval) ----------------
   Grammar:
     expr    := term (('+' | '-') term)*
     term    := factor (('*' | '/') factor)*
     factor  := unary ('^' factor)?          // right-associative
     unary   := '-' unary | primary
     primary := number | 'π' | 'e' | 'ans' | fn '(' expr ')' | '(' expr ')'
     fn      := sqrt | log | ln | sin | cos | tan   (trig in degrees)
-------------------------------------------------------------------------------------- */
const FUNCS = {
  sqrt: (x) => Math.sqrt(x),
  log: (x) => Math.log10(x),
  ln: (x) => Math.log(x),
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180),
};

function tokenize(input) {
  const tokens = [];
  let i = 0;
  const isDigit = (c) => c >= '0' && c <= '9';
  while (i < input.length) {
    const c = input[i];
    if (c === ' ') { i++; continue; }
    if (isDigit(c) || c === '.') {
      let num = '';
      while (i < input.length && (isDigit(input[i]) || input[i] === '.')) num += input[i++];
      if ((num.match(/\./g) || []).length > 1 || num === '.') throw new Error('Bad number');
      tokens.push({ t: 'num', v: parseFloat(num) });
      continue;
    }
    if ('+-*/^()'.includes(c)) { tokens.push({ t: c }); i++; continue; }
    if (c === 'π') { tokens.push({ t: 'num', v: Math.PI }); i++; continue; }
    if (/[a-z]/i.test(c)) {
      let word = '';
      while (i < input.length && /[a-z]/i.test(input[i])) word += input[i++];
      const w = word.toLowerCase();
      if (w === 'e') tokens.push({ t: 'num', v: Math.E });
      else if (w === 'ans') tokens.push({ t: 'ans' });
      else if (FUNCS[w]) tokens.push({ t: 'fn', v: w });
      else throw new Error(`Unknown name "${word}"`);
      continue;
    }
    throw new Error(`Unexpected character "${c}"`);
  }
  return tokens;
}

function parse(tokens, ans) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr() {
    let value = parseTerm();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t;
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }
  function parseTerm() {
    let value = parseFactor();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = next().t;
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : value / rhs;
    }
    return value;
  }
  function parseFactor() {
    // unary +/- binds looser than ^, so -3^2 === -(3^2) === -9
    if (peek() && peek().t === '-') { next(); return -parseFactor(); }
    if (peek() && peek().t === '+') { next(); return parseFactor(); }
    return parsePower();
  }
  function parsePower() {
    const base = parsePrimary();
    if (peek() && peek().t === '^') {
      next();
      const exp = parseFactor(); // right associative, allows 2^-3
      return Math.pow(base, exp);
    }
    return base;
  }
  function parsePrimary() {
    const tok = next();
    if (!tok) throw new Error('Unexpected end of expression');
    if (tok.t === 'num') return tok.v;
    if (tok.t === 'ans') return ans;
    if (tok.t === 'fn') {
      const open = next();
      if (!open || open.t !== '(') throw new Error('Expected ( after function');
      const arg = parseExpr();
      const close = next();
      if (!close || close.t !== ')') throw new Error('Missing )');
      return FUNCS[tok.v](arg);
    }
    if (tok.t === '(') {
      const value = parseExpr();
      const close = next();
      if (!close || close.t !== ')') throw new Error('Missing )');
      return value;
    }
    throw new Error('Unexpected token');
  }

  const value = parseExpr();
  if (pos !== tokens.length) throw new Error('Unexpected extra input');
  return value;
}

export function evaluate(expression, ans = 0) {
  return parse(tokenize(expression), ans);
}

function formatNumber(n) {
  if (typeof n !== 'number' || !isFinite(n)) return 'Error';
  const rounded = Math.abs(n) < 1e-12 ? 0 : n;
  let s = parseFloat(rounded.toPrecision(12)).toString();
  return s;
}

/* Find the trailing operand (number, ')' group, constant or ans) ending at end of expr. */
function trailingOperandRange(expr) {
  let end = expr.length;
  while (end > 0 && expr[end - 1] === ' ') end--;
  if (end === 0) return null;
  const last = expr[end - 1];
  if (/[0-9.]/.test(last)) {
    let start = end;
    while (start > 0 && /[0-9.]/.test(expr[start - 1])) start--;
    // include a leading "(-" style unary minus only if directly attached as "(-x)"
    return { start, end };
  }
  if (last === ')') {
    let depth = 0;
    let start = end;
    while (start > 0) {
      start--;
      if (expr[start] === ')') depth++;
      else if (expr[start] === '(') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) return null;
    // include function name directly before the paren, e.g. sqrt(...)
    let fnStart = start;
    while (fnStart > 0 && /[a-z]/i.test(expr[fnStart - 1])) fnStart--;
    const word = expr.slice(fnStart, start).toLowerCase();
    if (FUNCS[word]) start = fnStart;
    return { start, end };
  }
  if (expr.slice(0, end).endsWith('ans')) return { start: end - 3, end };
  if (last === 'π') return { start: end - 1, end };
  // constant e (standalone letter at end)
  if (last === 'e' && (end === 1 || !/[a-z0-9.]/i.test(expr[end - 2]))) return { start: end - 1, end };
  return null;
}

const FN_NAMES = ['sqrt(', 'sin(', 'cos(', 'tan(', 'log(', 'ln('];

export default function Calculator() {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const [ans, setAns] = useState(0);
  const [memory, setMemory] = useState(0);
  const [pos, setPos] = useState(() => ({
    x: Math.max(12, window.innerWidth - 324),
    y: Math.max(12, window.innerHeight - 560),
  }));
  const dragRef = useRef(null);
  const panelRef = useRef(null);

  const applyExpr = (next) => {
    setExpr(next);
    setResult('');
  };

  /* ------- editing primitives ------- */
  const insert = (text) => applyExpr(expr + text);
  const backspace = () => {
    for (const fn of FN_NAMES) {
      if (expr.endsWith(fn)) return applyExpr(expr.slice(0, -fn.length));
    }
    if (expr.endsWith('ans')) return applyExpr(expr.slice(0, -3));
    applyExpr(expr.slice(0, -1));
  };
  const clear = () => { setExpr(''); setResult(''); };

  const wrapTrailing = (wrapper, fallback) => {
    const range = trailingOperandRange(expr);
    if (!range) {
      if (fallback !== undefined) applyExpr(expr + fallback);
      return;
    }
    const target = expr.slice(range.start, range.end);
    applyExpr(expr.slice(0, range.start) + wrapper(target) + expr.slice(range.end));
  };

  const equals = () => {
    if (!expr.trim()) return;
    try {
      const value = parse(tokenize(expr), ans);
      if (!isFinite(value)) throw new Error('Not finite');
      setResult(formatNumber(value));
      setAns(value);
    } catch (e) {
      setResult('Error');
    }
  };

  const negate = () => {
    const range = trailingOperandRange(expr);
    if (!range) { insert('(-'); return; }
    const target = expr.slice(range.start, range.end);
    // toggle an existing "(-x)" wrapper
    if (target.startsWith('(-') && target.endsWith(')')) {
      applyExpr(expr.slice(0, range.start) + target.slice(2, -1) + expr.slice(range.end));
    } else {
      applyExpr(expr.slice(0, range.start) + `(-${target})` + expr.slice(range.end));
    }
  };

  const handle = useCallback((key) => {
    if (/^[0-9.]$/.test(key)) return insert(key);
    switch (key) {
      case '+': case '-': case '*': case '/': case '^': case '(': case ')':
        return insert(key);
      case 'pi': return insert('π');
      case 'euler': return insert('e');
      case 'ans': return insert('ans');
      case 'sqrt': return wrapTrailing((t) => `sqrt(${t})`, 'sqrt(');
      case 'log': return wrapTrailing((t) => `log(${t})`, 'log(');
      case 'ln': return wrapTrailing((t) => `ln(${t})`, 'ln(');
      case 'sin': return wrapTrailing((t) => `sin(${t})`, 'sin(');
      case 'cos': return wrapTrailing((t) => `cos(${t})`, 'cos(');
      case 'tan': return wrapTrailing((t) => `tan(${t})`, 'tan(');
      case 'square': {
        const range = trailingOperandRange(expr);
        if (range) return applyExpr(expr.slice(0, range.end) + '^2' + expr.slice(range.end));
        return;
      }
      case 'recip': return wrapTrailing((t) => `(1/(${t}))`);
      case 'percent': return wrapTrailing((t) => `((${t})/100)`);
      case 'negate': return negate();
      case 'back': return backspace();
      case 'clear': return clear();
      case 'equals': return equals();
      case 'mPlus': {
        try {
          const value = expr.trim() ? parse(tokenize(expr), ans) : 0;
          if (isFinite(value)) setMemory((m) => m + value);
        } catch { /* ignore bad expression */ }
        return;
      }
      case 'mr': return insert(formatNumber(memory));
      case 'mc': return setMemory(0);
      default: return undefined;
    }
  }, [expr, ans, memory]);

  /* ------- physical keyboard ------- */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const k = e.key;
      if (/^[0-9.]$/.test(k)) { e.preventDefault(); handle(k); }
      else if (k === '+' || k === '-' || k === '*' || k === '/' || k === '^' || k === '(' || k === ')') { e.preventDefault(); handle(k); }
      else if (k === 'Enter' || k === '=') { e.preventDefault(); handle('equals'); }
      else if (k === 'Backspace') { e.preventDefault(); handle('back'); }
      else if (k === 'Escape') { e.preventDefault(); handle('clear'); }
      else if (k === '%') { e.preventDefault(); handle('percent'); }
      else if (k === 'p' || k === 'P') { e.preventDefault(); handle('pi'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handle]);

  /* ------- dragging (pointer events = mouse + touch) ------- */
  const onDragStart = (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;
    dragRef.current = { startX, startY };
    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const panel = panelRef.current;
      const w = panel ? panel.offsetWidth : 300;
      const h = panel ? panel.offsetHeight : 400;
      const x = Math.min(Math.max(0, ev.clientX - d.startX), window.innerWidth - w);
      const y = Math.min(Math.max(0, ev.clientY - d.startY), window.innerHeight - h);
      setPos({ x, y });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const pretty = expr
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/-/g, '−')
    .replace(/sqrt\(/g, '√(');

  const keys = [
    ['MC', 'mem', 'mc'], ['MR', 'mem', 'mr'], ['M+', 'mem', 'mPlus'], ['C', 'op', 'clear'], ['⌫', 'op', 'back'],
    ['sin', 'fn', 'sin'], ['cos', 'fn', 'cos'], ['tan', 'fn', 'tan'], ['π', 'fn', 'pi'], ['e', 'fn', 'euler'],
    ['ln', 'fn', 'ln'], ['log', 'fn', 'log'], ['√x', 'fn', 'sqrt'], ['x²', 'fn', 'square'], ['xʸ', 'fn', '^'],
    ['1/x', 'fn', 'recip'], ['%', 'fn', 'percent'], ['(', 'op', '('], [')', 'op', ')'], ['÷', 'op', '/'],
    ['7', '', '7'], ['8', '', '8'], ['9', '', '9'], ['×', 'op', '*'], ['±', 'op', 'negate'],
    ['4', '', '4'], ['5', '', '5'], ['6', '', '6'], ['−', 'op', '-'], ['Ans', 'fn', 'ans'],
    ['1', '', '1'], ['2', '', '2'], ['3', '', '3'], ['+', 'op', '+'], ['.', '', '.'],
    ['0', '', '0'], ['=', 'eq', 'equals'],
  ];

  return (
    <>
      <button
        className="calc-toggle"
        aria-label={open ? 'Close calculator' : 'Open calculator'}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? '×' : '∑'}
      </button>
      {open && (
        <div
          className="calc-panel"
          ref={panelRef}
          style={{ left: pos.x, top: pos.y }}
          role="dialog"
          aria-label="Scientific calculator"
        >
          <div className="calc-head" onPointerDown={onDragStart}>
            <span>Calculator</span>
            <button onClick={() => setOpen(false)} aria-label="Close calculator">×</button>
          </div>
          <div className="calc-display">
            <div className="expr">{pretty || '0'}</div>
            <div className="result">{result !== '' ? `= ${result}` : ''}</div>
          </div>
          <div className="calc-grid">
            {keys.map(([label, cls, action]) => (
              <button key={label + action} className={cls} onClick={() => handle(action)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
