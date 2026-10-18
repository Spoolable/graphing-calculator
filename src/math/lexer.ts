export type TokenType = 'number' | 'identifier' | 'op' | 'lparen' | 'rparen' | 'comma';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

import { MathError } from './errors';

const DIGIT = /[0-9]/;
const IDENT_START = /[a-zA-Z_\u03C0\u03B8\u03C4]/; // letters, _, π, θ, τ
const IDENT_PART = /[a-zA-Z0-9_\u03C0\u03B8\u03C4]/;
const OP_CHARS = '+-*/^';
const NORMALIZE: Record<string, string> = {
  '\u00D7': '*', // ×
  '\u00B7': '*', // ·
  '\u00F7': '/', // ÷
  '\u2212': '-', // −
  '\u2013': '-', // –
  '\u2014': '-', // —
  '\uFF08': '(', // （
  '\uFF09': ')', // ）
};

const NUMBER_RE = /^([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?$/;

export function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const raw = src[i];
    const c = NORMALIZE[raw] ?? raw;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (c === '=') {
      throw new MathError('Type just the expression — no "=" needed', i);
    }
    if (DIGIT.test(c) || (c === '.' && DIGIT.test(src[i + 1] ?? ''))) {
      const start = i;
      let seenDot = false;
      if (c === '.') {
        seenDot = true;
        i++;
      }
      while (i < src.length && DIGIT.test(src[i])) i++;
      if (!seenDot && src[i] === '.') {
        i++;
        while (i < src.length && DIGIT.test(src[i])) i++;
      }
      if (src[i] === 'e' || src[i] === 'E') {
        let j = i + 1;
        const next = src[j];
        const signed = (next === '+' || next === '-') && DIGIT.test(src[j + 1] ?? '');
        if (DIGIT.test(next ?? '') || signed) {
          j++;
          if (src[j] === '+' || src[j] === '-') j++;
          while (j < src.length && DIGIT.test(src[j])) j++;
          i = j;
        }
      }
      const text = src.slice(start, i);
      if (!NUMBER_RE.test(text)) {
        throw new MathError(`Malformed number "${text}"`, start);
      }
      tokens.push({ type: 'number', value: text, start, end: i });
      continue;
    }
    if (IDENT_START.test(c)) {
      const start = i;
      while (i < src.length && IDENT_PART.test(src[i])) i++;
      tokens.push({ type: 'identifier', value: src.slice(start, i), start, end: i });
      continue;
    }
    if (OP_CHARS.includes(c)) {
      tokens.push({ type: 'op', value: c, start: i, end: i + 1 });
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'lparen', value: '(', start: i, end: i + 1 });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen', value: ')', start: i, end: i + 1 });
      i++;
      continue;
    }
    if (c === ',') {
      tokens.push({ type: 'comma', value: ',', start: i, end: i + 1 });
      i++;
      continue;
    }
    throw new MathError(`Unexpected character "${raw}"`, i);
  }
  return tokens;
}
