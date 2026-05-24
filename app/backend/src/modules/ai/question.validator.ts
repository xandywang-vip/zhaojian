/**
 * 追问后置校验 —— PRD section 3.5
 *
 * 三层保险的第二层：AI 输出后必须通过这里才算合格。
 * 不合格 → 由上层决定重试 / fallback。
 */

/** 禁词列表（覆盖预测、诊断、引导、正式问询语气） */
export const QUESTION_FORBIDDEN_WORDS = [
  // 预测类
  '会', '将', '能否', '结果', '成功', '转机', '注定', '命中',
  // 诊断类
  '焦虑症', '抑郁', '障碍', '症状',
  // 引导性判断
  '是不是', '应该', '对不对',
  // 正式问询
  '请问', '您',
] as const;

export type QuestionValidation =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * 校验追问文本。
 * 失败时返回原因，便于日志追踪。
 */
export function validateQuestion(raw: string): QuestionValidation {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, reason: 'empty' };
  }
  // 清洗：去掉首尾空白 + 末尾可能的标点重复
  const q = raw.trim();

  // 长度：spec 要求 10–20 字（含问号）。
  // 容忍 AI 微小偏差：下限放到 6，上限严格按 spec 卡 20。
  if (q.length < 6) return { ok: false, reason: `too short (${q.length})` };
  if (q.length > 20) return { ok: false, reason: `too long (${q.length})` };

  // 不能以"为什么"开头
  if (q.startsWith('为什么')) {
    return { ok: false, reason: 'starts with 为什么' };
  }

  // 禁词
  for (const w of QUESTION_FORBIDDEN_WORDS) {
    if (q.includes(w)) {
      return { ok: false, reason: `forbidden word: ${w}` };
    }
  }

  // 必须是疑问句（结尾问号 或 含疑问标志词）
  const hasQuestionMark = /[？?]$/.test(q);
  const hasQWord = /(吗|呢|哪|什么|多少|几|怎样|怎么)/.test(q);
  if (!hasQuestionMark && !hasQWord) {
    return { ok: false, reason: 'not a question' };
  }

  return { ok: true };
}

/**
 * 清洗 AI 输出：去掉可能的引号包裹、前缀（"问题："等）。
 *
 * @deprecated 仍保留单行清洗，但建议使用 parseQuestionOutput 同时拿到角度+问题。
 */
export function cleanQuestionOutput(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  s = s.split(/\r?\n/)[0].trim();
  s = s.replace(/^["'「『]+|["'」』]+$/g, '');
  s = s.replace(/^(问题|追问|提问)\s*[:：]\s*/, '');
  return s.trim();
}

/** AI 输出按 spec 解析后的类型 */
export type ParsedQuestionType = 'spatial' | 'dynamic' | 'causal';

export interface ParsedQuestionOutput {
  question: string;
  /** AI 自标的角度；若识别不出会留空，由上层 fallback 决定 */
  type: ParsedQuestionType | null;
}

const ANGLE_MAP: Record<string, ParsedQuestionType> = {
  空间型: 'spatial',
  动力型: 'dynamic',
  因果型: 'causal',
};

/**
 * 按 spec 解析两行输出：
 *   第一行 = 角度（空间型 / 动力型 / 因果型）
 *   第二行 = 问题
 *
 * 容错：
 *   - 若只有一行，整行当作问题，type=null。
 *   - 若 AI 把"角度："前缀写出来，会被剥掉。
 *   - 若第一行不是合法角度，第一行也当作问题候选（取两行中更像问题的）。
 */
export function parseQuestionOutput(raw: string): ParsedQuestionOutput {
  if (!raw) return { question: '', type: null };
  const lines = raw
    .split(/\r?\n/)
    .map((l) =>
      l
        .trim()
        .replace(/^["'「『]+|["'」』]+$/g, '')
        .replace(/^(角度|分类|类型|问题|追问|提问)\s*[:：]\s*/, ''),
    )
    .filter(Boolean);

  if (lines.length === 0) return { question: '', type: null };
  if (lines.length === 1) {
    // 只一行：可能直接给了问题
    const only = lines[0];
    const angle = ANGLE_MAP[only];
    if (angle) return { question: '', type: angle }; // 只有角度没有问题，无效
    return { question: only, type: null };
  }

  // 两行及以上：第一行试做角度
  const first = lines[0];
  const angle = ANGLE_MAP[first] || null;
  const question = angle ? lines[1] : lines.find((l) => /[？?]/.test(l)) || lines[1];
  return { question: question || '', type: angle };
}
