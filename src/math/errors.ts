export class MathError extends Error {
  readonly pos: number;

  constructor(message: string, pos: number) {
    super(message);
    this.name = 'MathError';
    this.pos = pos;
  }
}
