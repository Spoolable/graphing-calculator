import { type Node, binary, callNode, neg, num, vari } from './ast';
import { MathError } from './errors';
import { FUNCTIONS } from './functions';
import { type Token, type TokenType, tokenize } from './lexer';

export function parse(src: string): Node {
  const tokens = tokenize(src);
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];

  const at = (type: TokenType, value?: string): boolean => {
    const t = tokens[pos];
    return !!t && t.type === type && (value === undefined || t.value === value);
  };

  const unexpectedEnd = (): MathError =>
    new MathError('Unexpected end of expression', src.length);

  function parseExpression(): Node {
    return parseAddSub();
  }

  function parseAddSub(): Node {
    let left = parseMulDiv();
    for (;;) {
      if (at('op', '+')) {
        pos++;
        left = binary('add', left, parseMulDiv());
      } else if (at('op', '-')) {
        pos++;
        left = binary('sub', left, parseMulDiv());
      } else {
        return left;
      }
    }
  }

  function startsImplicitFactor(): boolean {
    return at('number') || at('identifier') || at('lparen');
  }

  function parseMulDiv(): Node {
    let left = parseUnary();
    for (;;) {
      if (at('op', '*')) {
        pos++;
        left = binary('mul', left, parseUnary());
      } else if (at('op', '/')) {
        pos++;
        left = binary('div', left, parseUnary());
      } else if (startsImplicitFactor()) {
        left = binary('mul', left, parseUnary());
      } else {
        return left;
      }
    }
  }

  function parseUnary(): Node {
    if (at('op', '-')) {
      pos++;
      return neg(parseUnary());
    }
    if (at('op', '+')) {
      pos++;
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower(): Node {
    const base = parsePrimary();
    if (at('op', '^')) {
      pos++;
      return binary('pow', base, parseUnary());
    }
    return base;
  }

  function parsePrimary(): Node {
    const t = peek();
    if (!t) throw unexpectedEnd();
    if (t.type === 'number') {
      pos++;
      const value = Number(t.value);
      if (!Number.isFinite(value)) throw new MathError(`Number "${t.value}" is out of range`, t.start);
      return num(value);
    }
    if (t.type === 'identifier') {
      pos++;
      // `sin(x)` is a call, but `x(x+1)` is implicit multiplication: an
      // identifier only becomes a call when it names a known function.
      if (at('lparen') && t.value.toLowerCase() in FUNCTIONS) {
        pos++;
        const args: Node[] = [];
        if (at('rparen')) {
          throw new MathError(`"${t.value}" needs at least one argument`, pos);
        }
        args.push(parseExpression());
        while (at('comma')) {
          pos++;
          args.push(parseExpression());
        }
        if (!at('rparen')) {
          const nxt = peek();
          throw new MathError('Expected ")"', nxt ? nxt.start : src.length);
        }
        pos++;
        return callNode(t.value.toLowerCase(), args, t.start);
      }
      return vari(t.value.toLowerCase(), t.start);
    }
    if (t.type === 'lparen') {
      pos++;
      const inner = parseExpression();
      if (!at('rparen')) {
        const nxt = peek();
        throw new MathError('Expected ")"', nxt ? nxt.start : src.length);
      }
      pos++;
      return inner;
    }
    throw new MathError(`Unexpected "${t.value}"`, t.start);
  }

  const result = parseExpression();
  if (pos < tokens.length) {
    throw new MathError(`Unexpected "${tokens[pos].value}"`, tokens[pos].start);
  }
  return result;
}
