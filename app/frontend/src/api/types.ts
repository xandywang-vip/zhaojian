export const TOPICS = [
  '工作与压力',
  '关系与情感',
  '自我与成长',
  '选择与犹豫',
  '失落与疗愈',
  '焦虑与平静',
] as const;

export type Topic = typeof TOPICS[number];

export interface PublicReading {
  present: string;
  pivot:   string;
  tryThis: string;
  oneLine: string;
}

export interface PublicDivination {
  id: string;
  topic: Topic;
  reading: PublicReading;
  feedback: 'up' | 'down' | null;
  // Hexagram inspiration (debug only — never surfaced in main content)
  benGuaName?: string;
  bianGuaName?: string;
  dongYao?: number;
  yaoPosName?: string;
  // 追问与用户回答（PRD section 3.5 / 3.6）
  question: string | null;
  questionSource: string | null;
  answer: string | null;
  answeredAt: string | null;
  // 心境墙
  isSaved: boolean;
  savedAt: string | null;
  careNote: string | null;
  primaryImageryKey: string | null;
  displayYaoText: string | null;
  createdAt: string;
  // Debug only
  castTrace?: CastTrace | null;
}

/** 起卦计算轨迹（仅 debug 面板使用） */
export interface CastTrace {
  castAt: string;
  hour: number;
  minute: number;
  a: number;
  b: number;
  c: number;
  upperNumber: number;
  lowerNumber: number;
  dongYao: number;
  upperTrigramName: string;
  lowerTrigramName: string;
}

export interface CastBody {
  topic: Topic;
}

// ── 心境墙专用类型 ─────────────────────────────────────────────────────────

export interface WallCard {
  id: string;
  topic: string;
  oneLiner: string;          // 金句（reading.oneLine）
  question: string | null;   // 追问
  answer:   string | null;   // 用户回答
  dateLabel: string;
  primaryImageryKey: string | null;
  createdAt: string;
  savedAt:   string | null;
}

export interface WallFullCard extends WallCard {
  reading: {
    present: string;
    pivot:   string;
    tryThis: string;
    oneLine: string;
  };
  careNote:       string | null;
  displayYaoText: string | null;
}

export interface WallListResponse {
  items:      WallCard[];
  hasMore:    boolean;
  nextCursor: string | null;
}
