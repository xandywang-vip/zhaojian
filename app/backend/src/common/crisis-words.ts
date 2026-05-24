// 危机词库 —— 仅用于用户输入检测，不作用于 AI 输出或卦辞原文
// spec 第六节列出 8 个核心词；这里在 spec 基础上扩展，覆盖更多变体表达。
export const CRISIS_WORDS: readonly string[] = [
  // spec 第六节明确列出
  '不想活', '去死', '自杀', '活不下去', '没意义', '结束一切', '不想继续了',
  // "消失" 单独作为危机词容易误伤（"想消失一下"≠真危机），保留更具语境的"消失算了"
  // 自伤/自残相关
  '自伤', '自残', '轻生', '想死', '寻死', '杀死自己', '伤害自己',
  // 具体方式（高危）
  '割腕', '跳楼', '跳桥', '跳河', '上吊', '服药自', '吃药死',
  // 结束类
  '活着没意思', '结束生命', '结束自己', '了结自己', '消失算了', '不想存在了',
];

export function checkCrisisKeywords(text: string): boolean {
  if (!text) return false;
  return CRISIS_WORDS.some((word) => text.includes(word));
}
