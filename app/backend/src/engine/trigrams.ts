export type TrigramName = '乾' | '兑' | '离' | '震' | '巽' | '坎' | '艮' | '坤';

export interface Trigram {
  name: TrigramName;
  symbol: string;
  xianTianNumber: number;
  yao: [number, number, number];
}

export const TRIGRAMS: Trigram[] = [
  { name: '乾', symbol: '☰', xianTianNumber: 1, yao: [1, 1, 1] },
  { name: '兑', symbol: '☱', xianTianNumber: 2, yao: [1, 1, 0] },
  { name: '离', symbol: '☲', xianTianNumber: 3, yao: [1, 0, 1] },
  { name: '震', symbol: '☳', xianTianNumber: 4, yao: [1, 0, 0] },
  { name: '巽', symbol: '☴', xianTianNumber: 5, yao: [0, 1, 1] },
  { name: '坎', symbol: '☵', xianTianNumber: 6, yao: [0, 1, 0] },
  { name: '艮', symbol: '☶', xianTianNumber: 7, yao: [0, 0, 1] },
  { name: '坤', symbol: '☷', xianTianNumber: 8, yao: [0, 0, 0] },
];

const BY_NUMBER = new Map<number, Trigram>(TRIGRAMS.map((t) => [t.xianTianNumber, t]));
const BY_NAME = new Map<TrigramName, Trigram>(TRIGRAMS.map((t) => [t.name, t]));
const BY_YAO = new Map<string, Trigram>(TRIGRAMS.map((t) => [t.yao.join(''), t]));

export function trigramByNumber(n: number): Trigram {
  const t = BY_NUMBER.get(n);
  if (!t) throw new Error(`Invalid trigram number: ${n}`);
  return t;
}

export function trigramByName(name: TrigramName): Trigram {
  const t = BY_NAME.get(name);
  if (!t) throw new Error(`Invalid trigram name: ${name}`);
  return t;
}

export function trigramByYao(yao: [number, number, number]): Trigram {
  const key = yao.join('');
  const t = BY_YAO.get(key);
  if (!t) throw new Error(`Invalid trigram yao: ${key}`);
  return t;
}

export function normalizeMod(value: number, modulus: number): number {
  const r = value % modulus;
  return r === 0 ? modulus : r;
}
