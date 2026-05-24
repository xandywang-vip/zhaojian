/**
 * 八卦意象 key 映射
 * 用于心境墙详情页背景图渲染。
 * 起卦时根据本卦的上下卦三字名计算 primary_imagery_key 并一次性写入记录。
 */

export type ImageryBase =
  | 'heaven' | 'earth' | 'water' | 'fire'
  | 'thunder' | 'wind' | 'mountain' | 'lake';

/** 八卦（三字名）→ 意象 slug */
export const TRIGRAM_TO_IMAGERY: Record<string, ImageryBase> = {
  '乾': 'heaven',
  '坤': 'earth',
  '坎': 'water',
  '离': 'fire',
  '震': 'thunder',
  '巽': 'wind',
  '艮': 'mountain',
  '兑': 'lake',
};

/**
 * 由本卦上下卦名生成复合意象 key，格式为 `upper+lower`。
 * 例：水山蹇（坎上艮下）→ `water+mountain`
 */
export function buildImageryKey(upper: string, lower: string): string {
  const u = TRIGRAM_TO_IMAGERY[upper] ?? 'heaven';
  const l = TRIGRAM_TO_IMAGERY[lower] ?? 'earth';
  return `${u}+${l}`;
}

/** 意象 key → 中文标题（用于前端 alt / 无图兜底文字） */
export const IMAGERY_LABEL: Record<string, string> = {
  heaven:   '天',
  earth:    '地',
  water:    '水',
  fire:     '火',
  thunder:  '雷',
  wind:     '风',
  mountain: '山',
  lake:     '泽',
};
