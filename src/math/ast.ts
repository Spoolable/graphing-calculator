export type BinaryKind = 'add' | 'sub' | 'mul' | 'div' | 'pow';

export type Node =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string; pos: number }
  | { kind: 'neg'; arg: Node }
  | { kind: 'binary'; op: BinaryKind; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[]; pos: number };

export const num = (value: number): Node => ({ kind: 'num', value });
export const vari = (name: string, pos: number): Node => ({ kind: 'var', name, pos });
export const neg = (arg: Node): Node => ({ kind: 'neg', arg });
export const binary = (op: BinaryKind, left: Node, right: Node): Node => ({
  kind: 'binary',
  op,
  left,
  right,
});
export const callNode = (name: string, args: Node[], pos: number): Node => ({
  kind: 'call',
  name,
  args,
  pos,
});

export function walk(node: Node, visit: (n: Node) => void): void {
  visit(node);
  switch (node.kind) {
    case 'neg':
      walk(node.arg, visit);
      break;
    case 'binary':
      walk(node.left, visit);
      walk(node.right, visit);
      break;
    case 'call':
      for (const arg of node.args) walk(arg, visit);
      break;
    default:
      break;
  }
}
