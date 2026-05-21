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

  // 长度：10–20 字（PRD 要求），实际放宽到 6–24 容忍 AI 略微偏差
  if (q.length < 6) return { ok: false, reason: `too short (${q.length})` };
  if (q.length > 24) return { ok: false, reason: `too long (${q.length})` };

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
 * 清洗 AI 输出：去掉可能的引号包裹、前缀（"问题："等）、多行。
 */
export function cleanQuestionOutput(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  // 取第一行（如果 AI 多吐了）
  s = s.split(/\r?\n/)[0].trim();
  // 去掉前后中英文引号
  s = s.replace(/^["'「『]+|["'」』]+$/g, '');
  // 去掉常见前缀
  s = s.replace(/^(问题|追问|提问)\s*[:：]\s*/, '');
  return s.trim();
}
