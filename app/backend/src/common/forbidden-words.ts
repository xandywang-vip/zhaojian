// 「易见」全站禁词表。覆盖 PRD 11.3 + AI Prompt 红线。
// 用途：扫描 AI 输出文本，命中则触发重试或走兜底。
export const FORBIDDEN_WORDS: readonly string[] = [
  '算命', '占卜', '预测', '卜卦', '运势', '注定', '必然', '一定会',
  '吉', '凶', '悔', '吝', '祸福',
  '血光', '破财', '横财', '转运', '改运', '化解', '开光',
  '法事', '保平安', '消灾', '劫难',
  '缘分', '八字', '五行', '星座', '塔罗', '生辰',
];

export interface RedactionResult {
  ok: boolean;
  hits: string[];
}

export function scanForbidden(text: string): RedactionResult {
  if (!text) return { ok: true, hits: [] };
  const hits: string[] = [];
  for (const word of FORBIDDEN_WORDS) {
    if (text.includes(word)) hits.push(word);
  }
  return { ok: hits.length === 0, hits };
}

export function scanReadingPayload(payload: Record<string, unknown>): RedactionResult {
  const parts: string[] = [];
  for (const key of ['present', 'pivot', 'tryThis', 'oneLine']) {
    const v = payload[key];
    if (typeof v === 'string') parts.push(v);
  }
  return scanForbidden(parts.join('\n'));
}
