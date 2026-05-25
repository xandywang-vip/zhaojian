import { trigramByNumber, normalizeMod } from './trigrams';
import { buildHexagramFromTrigrams, computeBianGua, computeHuGua, BuiltHexagram } from './hexagram-build';
import { loadHexagramRecord, HexagramRecord } from './hexagram-data';

export type CastMethod = 'time' | 'number';

export interface CastInput {
  method: CastMethod;
  datetime?: string;
  numbers?: [number, number, number];
}

export interface CastCore {
  upperNumber: number;
  lowerNumber: number;
  dongYao: number;
}

/**
 * 起卦计算轨迹，供 debug 面板展示。
 *
 * 算法（先天八卦时间起卦法）：
 *   a = hour  mod 8（为 0 取 8）→ 上卦
 *   b = minute mod 8（为 0 取 8）→ 下卦
 *   c = (hour + minute) mod 6（为 0 取 6）→ 动爻
 */
export interface CastTrace {
  castAt: string;          // ISO with ms
  hour: number;            // 本地小时 0-23
  minute: number;          // 分钟 0-59
  a: number;               // hour mod 8 → 上卦序号
  b: number;               // minute mod 8 → 下卦序号
  c: number;               // (hour+minute) mod 6 → 动爻
  upperNumber: number;     // 同 a
  lowerNumber: number;     // 同 b
  dongYao: number;         // 同 c
  upperTrigramName: string;
  lowerTrigramName: string;
}

export interface FullHexagram extends BuiltHexagram {
  guaCi: string;
  yaoCi: string[];
  imageText: string;
  keywords: string[];
}

export interface CastResult {
  method: CastMethod;
  input: {
    datetime?: string;
    numbers?: [number, number, number];
  };
  dongYao: number;
  benGua: FullHexagram;
  bianGua: FullHexagram;
  huGua: FullHexagram;
  trace: CastTrace;
}

export interface CastByTimeResult extends CastCore {
  trace: CastTrace;
}

/**
 * 先天八卦时间起卦
 *   上卦 = hour mod 8（0 取 8）
 *   下卦 = minute mod 8（0 取 8）
 *   动爻 = (hour + minute) mod 6（0 取 6）
 */
export function castByTime(input: { datetime?: string } = {}): CastByTimeResult {
  const date = input.datetime ? new Date(input.datetime) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime: ${input.datetime}`);
  }

  // 起卦以北京时间（UTC+8）为准；Render 等服务器在 UTC，getHours() 会差 8 小时
  const CST_OFFSET_MS = 8 * 60 * 60 * 1000;
  const cst    = new Date(date.getTime() + CST_OFFSET_MS);
  const hour   = cst.getUTCHours();
  const minute = cst.getUTCMinutes();

  const a = normalizeMod(hour,          8);   // 上卦序号
  const b = normalizeMod(minute,        8);   // 下卦序号
  const c = normalizeMod(hour + minute, 6);   // 动爻

  return {
    upperNumber: a,
    lowerNumber: b,
    dongYao:     c,
    trace: {
      castAt: date.toISOString(),
      hour,
      minute,
      a,
      b,
      c,
      upperNumber: a,
      lowerNumber: b,
      dongYao:     c,
      upperTrigramName: '',   // filled in expandCore
      lowerTrigramName: '',
    },
  };
}

export function castByNumbers(a: number, b: number, c: number): CastCore {
  if (![a, b, c].every((n) => Number.isFinite(n) && n >= 1 && n <= 99 && Number.isInteger(n))) {
    throw new Error('Numbers must be integers between 1 and 99');
  }
  return {
    upperNumber: normalizeMod(a, 8),
    lowerNumber: normalizeMod(b, 8),
    dongYao:     normalizeMod(a + b + c, 6),
  };
}

function attachData(built: BuiltHexagram): FullHexagram {
  const record: HexagramRecord = loadHexagramRecord(built.id);
  return {
    ...built,
    guaCi:     record.guaCi,
    yaoCi:     record.yaoCi,
    imageText: record.imageText,
    keywords:  record.keywords,
  };
}

export function expandCore(
  core: CastCore,
  trace?: CastTrace,
): { benGua: FullHexagram; bianGua: FullHexagram; huGua: FullHexagram; trace?: CastTrace } {
  const upper = trigramByNumber(core.upperNumber);
  const lower = trigramByNumber(core.lowerNumber);
  const ben  = buildHexagramFromTrigrams(upper.name, lower.name);
  const bian = computeBianGua(ben.yao, core.dongYao);
  const hu   = computeHuGua(ben.yao);
  const filledTrace = trace
    ? { ...trace, upperTrigramName: upper.name, lowerTrigramName: lower.name }
    : undefined;
  return {
    benGua:  attachData(ben),
    bianGua: attachData(bian),
    huGua:   attachData(hu),
    trace:   filledTrace,
  };
}

export function cast(input: CastInput): CastResult {
  let core: CastCore;
  let trace: CastTrace | undefined;
  const inputEcho: CastResult['input'] = {};

  if (input.method === 'number') {
    if (!input.numbers || input.numbers.length !== 3) {
      throw new Error('Three numbers required for method=number');
    }
    const [a, b, c] = input.numbers;
    core = castByNumbers(a, b, c);
    inputEcho.numbers = [a, b, c];
  } else if (input.method === 'time') {
    const result = castByTime({ datetime: input.datetime });
    core  = result;
    trace = result.trace;
    inputEcho.datetime = input.datetime ?? result.trace.castAt;
  } else {
    throw new Error(`Unknown method: ${input.method}`);
  }

  const expanded = expandCore(core, trace);
  return {
    method: input.method,
    input:  inputEcho,
    dongYao: core.dongYao,
    ...expanded,
    trace: expanded.trace!,
  };
}
