/**
 * 兜底问题库 —— PRD section 3.5
 *
 * 三层保险的最后一层：AI 生成失败或校验不通过时使用。
 * 共 10 条，按问题角度分组；与用户主题做映射。
 */

export type QuestionType = 'spatial' | 'dynamic' | 'causal' | 'fallback';

export interface FallbackQuestion {
  text: string;
  /** 内部编号（与 PRD 列表对应） */
  id: string;
}

const DEFAULT_Q: FallbackQuestion = {
  id: '01',
  text: '此刻心里最占地方的一件事是什么？',
};

const WAITING: FallbackQuestion[] = [
  { id: '02', text: '你现在在等一个什么消息，或者什么人？' },
  { id: '03', text: '有件事你放在心里多久了，还没有说出口？' },
];

const ACTION: FallbackQuestion[] = [
  { id: '04', text: '有什么事你一直知道该做，却还没有动？' },
  { id: '05', text: '最近让你最难做决定的，是哪件事？' },
  { id: '06', text: '你现在最想放下的，和最放不下的，各是什么？' },
];

const RELATION: FallbackQuestion[] = [
  { id: '07', text: '这件事，你有没有跟任何人说过？' },
  { id: '08', text: '最近有没有一个人，你想联系但一直没联系？' },
];

const SELF: FallbackQuestion[] = [
  { id: '09', text: '有个瞬间，你觉得自己最不像自己，是什么时候？' },
  { id: '10', text: '此刻如果给自己的状态写一个词，你会写什么？' },
];

/**
 * 主题 → 优先候选组（按重要性排序，第一个组作为首选随机源）。
 * 与 spec themeMap 对齐：
 *   工作与压力/选择与犹豫 → action
 *   关系与情感/失落与疗愈 → relation
 *   自我与成长/焦虑与平静 → self
 */
const TOPIC_GROUPS: Record<string, FallbackQuestion[][]> = {
  '工作与压力': [ACTION, WAITING, SELF],
  '关系与情感': [RELATION, WAITING, SELF],
  '自我与成长': [SELF, ACTION, RELATION],
  '选择与犹豫': [ACTION, WAITING, SELF],
  '失落与疗愈': [RELATION, SELF, WAITING],
  '焦虑与平静': [SELF, ACTION, RELATION],
};

/**
 * 按主题挑一个兜底问题。
 * 策略：优先从主题对应的首选组随机；若没匹配，回到 DEFAULT_Q。
 */
export function pickFallbackQuestion(
  topic: string,
): { question: FallbackQuestion; type: QuestionType } {
  const groups = TOPIC_GROUPS[topic];
  if (!groups || groups.length === 0) {
    return { question: DEFAULT_Q, type: 'fallback' };
  }
  const primary = groups[0];
  const pick = primary[Math.floor(Math.random() * primary.length)];
  return { question: pick, type: 'fallback' };
}

/** 导出全部条目便于测试 / 调试 */
export const FALLBACK_LIBRARY = {
  default: DEFAULT_Q,
  waiting: WAITING,
  action: ACTION,
  relation: RELATION,
  self: SELF,
};
