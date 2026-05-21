// 危机词库 —— 仅用于用户输入检测，不作用于 AI 输出或卦辞原文
export const CRISIS_WORDS: readonly string[] = [
  '自杀', '自伤', '自残', '轻生', '想死', '去死', '寻死',
  '不想活', '活不下去', '活着没意思', '结束生命', '结束自己',
  '割腕', '跳楼', '跳桥', '跳河', '上吊', '服药自', '吃药死',
  '了结自己', '消失算了', '不想存在了',
  '杀死自己', '伤害自己',
];

export function checkCrisisKeywords(text: string): boolean {
  if (!text) return false;
  return CRISIS_WORDS.some((word) => text.includes(word));
}
