/**
 * DivinationStore — Drizzle + PostgreSQL 实现
 *
 * 接口签名与原 in-memory 版保持一致（方法名不变），
 * 但全部变为 async，调用方需 await。
 */
import { Injectable } from '@nestjs/common';
import { eq, and, desc, lt, gte, isNull, or } from 'drizzle-orm';

// ── 时区工具：所有时间列均存北京时间（无时区） ────────────────────────────────
const CST_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * UTC ISO 字符串 → 北京时间 Date 对象
 * postgres.js 写入 timestamp without timezone 时会忽略 Z，
 * 用时间值本身当作本地时间存入。利用这一特性：
 *   new Date(UTC + 8h).toISOString() = 'YYYY-MM-DDTHH:mm:ssZ'（Z 被忽略）
 *   → DB 存 'YYYY-MM-DD HH:mm:ss'（北京时间）
 */
function utcToCST(utcIso: string): Date {
  return new Date(new Date(utcIso).getTime() + CST_OFFSET_MS);
}

/**
 * DB 读回的 timestamp without timezone Date
 * → 带 +08:00 后缀的 ISO 字符串（供前后端正确解析时区）
 */
function rowDateToCST(d: Date): string {
  return d.toISOString().replace('Z', '+08:00');
}
import { db } from '../db/client';
import { divinations, type DivinationRow } from '../db/schema';
import type { CastTrace } from '../engine/casting';

// ── 业务对象类型（全局复用）─────────────────────────────────────────────────
export interface DivinationRecord {
  id: string;
  userId?: string | null;
  topic: string;
  benGuaName?:  string;
  bianGuaName?: string;
  dongYao?:     number;
  yaoPosName?:  string;
  castTrace?:   CastTrace | null;
  isSaved?:     boolean;
  savedAt?:     string | null;
  careNote?:    string | null;
  /** 八卦意象组合 key，如 "water+mountain"，起卦时写入 */
  primaryImageryKey?: string | null;
  /** 命中爻辞白名单时的展示句子，未命中为 null */
  displayYaoText?: string | null;
  aiReading: unknown | null;
  feedback?: 'up' | 'down' | null;
  question?:       string | null;
  questionSource?: string | null;
  answer?:         string | null;
  answeredAt?:     string | null;
  createdAt: string;
}

// ── 行 → 业务对象转换 ────────────────────────────────────────────────────────
function rowToRecord(row: DivinationRow): DivinationRecord {
  return {
    id:               row.id,
    userId:           row.userId ?? null,
    topic:            row.topic,
    benGuaName:       row.benGuaName  ?? undefined,
    bianGuaName:      row.bianGuaName ?? undefined,
    dongYao:          row.dongYao     ?? undefined,
    yaoPosName:       row.yaoPosName  ?? undefined,
    castTrace:        (row.castTrace  as CastTrace | null) ?? null,
    isSaved:          row.isSaved,
    savedAt:          row.savedAt     ? rowDateToCST(row.savedAt)     : null,
    careNote:         row.careNote    ?? null,
    primaryImageryKey: row.primaryImageryKey ?? null,
    displayYaoText:    row.displayYaoText    ?? null,
    aiReading:        row.aiReading   ?? null,
    feedback:         (row.feedback   as 'up' | 'down' | null) ?? null,
    question:         row.question        ?? null,
    questionSource:   row.questionSource  ?? null,
    answer:           row.answer          ?? null,
    answeredAt:       row.answeredAt ? rowDateToCST(row.answeredAt) : null,
    createdAt:        rowDateToCST(row.createdAt),
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────
@Injectable()
export class DivinationStore {

  async create(
    partial: Omit<DivinationRecord, 'id' | 'createdAt'>,
  ): Promise<DivinationRecord> {
    const [row] = await db.insert(divinations).values({
      userId:            partial.userId ?? null,
      topic:             partial.topic,
      benGuaName:        partial.benGuaName,
      bianGuaName:       partial.bianGuaName,
      dongYao:           partial.dongYao,
      yaoPosName:        partial.yaoPosName,
      castTrace:         partial.castTrace ?? null,
      aiReading:         partial.aiReading ?? null,
      feedback:          partial.feedback  ?? null,
      question:          partial.question  ?? null,
      questionSource:    partial.questionSource ?? null,
      answer:            partial.answer    ?? null,
      answeredAt:        partial.answeredAt ? new Date(partial.answeredAt) : null,
      isSaved:           partial.isSaved   ?? false,
      savedAt:           partial.savedAt   ? new Date(partial.savedAt)   : null,
      careNote:          partial.careNote  ?? null,
      primaryImageryKey: partial.primaryImageryKey ?? null,
      displayYaoText:    partial.displayYaoText    ?? null,
    }).returning();
    return rowToRecord(row);
  }

  async get(id: string): Promise<DivinationRecord | undefined> {
    const [row] = await db.select().from(divinations)
      .where(eq(divinations.id, id)).limit(1);
    return row ? rowToRecord(row) : undefined;
  }

  async update(
    id: string,
    patch: Partial<DivinationRecord>,
  ): Promise<DivinationRecord | undefined> {
    // 构建 set 对象，只允许业务字段（排除 id / createdAt）
    const set: Record<string, unknown> = {};
    const map: Array<[keyof DivinationRecord, string]> = [
      ['topic',             'topic'],
      ['benGuaName',        'benGuaName'],
      ['bianGuaName',       'bianGuaName'],
      ['dongYao',           'dongYao'],
      ['yaoPosName',        'yaoPosName'],
      ['castTrace',         'castTrace'],
      ['aiReading',         'aiReading'],
      ['feedback',          'feedback'],
      ['question',          'question'],
      ['questionSource',    'questionSource'],
      ['answer',            'answer'],
      ['isSaved',           'isSaved'],
      ['careNote',          'careNote'],
      ['primaryImageryKey', 'primaryImageryKey'],
      ['displayYaoText',    'displayYaoText'],
    ];
    for (const [src, dst] of map) {
      if (patch[src] !== undefined) set[dst] = patch[src];
    }
    // timestamp 字段：UTC ISO → 北京时间 Date（列为 timestamp without timezone）
    if (patch.savedAt    !== undefined) set['savedAt']    = patch.savedAt    ? utcToCST(patch.savedAt)    : null;
    if (patch.answeredAt !== undefined) set['answeredAt']  = patch.answeredAt  ? utcToCST(patch.answeredAt)  : null;

    if (Object.keys(set).length === 0) return this.get(id);

    const [row] = await db.update(divinations).set(set)
      .where(eq(divinations.id, id)).returning();
    return row ? rowToRecord(row) : undefined;
  }

  async list(userId?: string): Promise<DivinationRecord[]> {
    // 安全防线：缺 userId 不返回任何记录
    if (!userId) return [];
    const rows = await db.select().from(divinations)
      .where(eq(divinations.userId, userId))
      .orderBy(desc(divinations.createdAt));
    return rows.map(rowToRecord);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(divinations)
      .where(eq(divinations.id, id))
      .returning({ id: divinations.id });
    return result.length > 0;
  }

  /**
   * 心境墙列表（游标分页）
   * 取 limit+1 条：多出一条用来判断 hasMore，不返给前端。
   */
  async listWall(opts: {
    userId?: string;
    topic?:  string;
    before?: string;   // savedAt 游标（ISO string，分页用）
    after?:  string;   // savedAt 下界（ISO string，时间筛选用）
    limit?:  number;
  }): Promise<DivinationRecord[]> {
    // 安全防线：缺 userId 不返回任何卡片，避免跨设备泄露
    if (!opts.userId) return [];

    const limit = (opts.limit ?? 20) + 1;   // +1 for hasMore detection

    const conditions = [
      eq(divinations.isSaved, true),
      eq(divinations.userId, opts.userId),
    ] as any[];
    if (opts.topic)  conditions.push(eq(divinations.topic, opts.topic));
    // cursor/filter 均为 UTC ISO（前端传来），先转成北京时间再与列值比较
    if (opts.before) conditions.push(lt(divinations.savedAt,  utcToCST(opts.before)));
    // savedAt 为 null 时仍保留（NULL >= date 在 PG 里为 FALSE 会漏掉）
    if (opts.after)  conditions.push(
      or(isNull(divinations.savedAt), gte(divinations.savedAt, utcToCST(opts.after))) as any,
    );

    const rows = await db.select().from(divinations)
      .where(and(...conditions))
      .orderBy(desc(divinations.savedAt))
      .limit(limit);

    return rows.map(rowToRecord);
  }
}
