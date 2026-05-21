import { trigramByName, trigramByYao, TrigramName } from './trigrams';
import { hexagramByTrigrams, HexagramIndexEntry } from './hexagram-lookup';

export type Yao = 0 | 1;
export type Liuyao = [Yao, Yao, Yao, Yao, Yao, Yao];

export interface BuiltHexagram {
  id: number;
  name: string;
  upper: TrigramName;
  lower: TrigramName;
  yao: Liuyao;
}

function toYao(value: number): Yao {
  return value === 1 ? 1 : 0;
}

export function buildHexagramFromTrigrams(upperName: TrigramName, lowerName: TrigramName): BuiltHexagram {
  const upper = trigramByName(upperName);
  const lower = trigramByName(lowerName);
  const yao: Liuyao = [
    toYao(lower.yao[0]), toYao(lower.yao[1]), toYao(lower.yao[2]),
    toYao(upper.yao[0]), toYao(upper.yao[1]), toYao(upper.yao[2]),
  ];
  const entry = hexagramByTrigrams(upperName, lowerName);
  return { ...entry, yao };
}

export function buildHexagramFromYao(yao: Liuyao): BuiltHexagram {
  const lower = trigramByYao([yao[0], yao[1], yao[2]]);
  const upper = trigramByYao([yao[3], yao[4], yao[5]]);
  const entry: HexagramIndexEntry = hexagramByTrigrams(upper.name, lower.name);
  return { ...entry, yao };
}

export function flipYaoAt(yao: Liuyao, position: number): Liuyao {
  if (position < 1 || position > 6) throw new Error(`Yao position out of range: ${position}`);
  const idx = position - 1;
  const copy = [...yao] as Liuyao;
  copy[idx] = (yao[idx] === 1 ? 0 : 1) as Yao;
  return copy;
}

export function computeBianGua(benYao: Liuyao, dongYao: number): BuiltHexagram {
  return buildHexagramFromYao(flipYaoAt(benYao, dongYao));
}

export function computeHuGua(benYao: Liuyao): BuiltHexagram {
  const huYao: Liuyao = [
    benYao[1], benYao[2], benYao[3],
    benYao[2], benYao[3], benYao[4],
  ];
  return buildHexagramFromYao(huYao);
}
