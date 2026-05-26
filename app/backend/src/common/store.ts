/**
 * DivinationStore — Drizzle + PostgreSQL 实现
 *
 * 接口签名与原 in-memory 版保持一致（方法名不变），
 * 但全部变为 async，调用方需 await。
 */
import { Injectable } from '@nestjs/common';
import { eq, and, desc, lt, gte } from 'drizzle-orm';
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
    savedAt:          row.savedAt     ? row.savedAt.toISOString()     : null,
    careNote:         row.careNote    ?? null,
    primaryImageryKey: row.primaryImageryKey ?? null,
    displayYaoText:    row.displayYaoText    ?? null,
    aiReading:        row.aiReading   ?? null,
    feedback:         (row.feedback   as 'up' | 'down' | null) ?? null,
    question:         row.question        ?? null,
    questionSource:   row.questionSource  ?? null,
    answer:           row.answer          ?? null,
    answeredAt:       row.answeredAt ? row.answeredAt.toISOString() : null,
    createdAt:        row.createdAt.toISOString(),
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
    // timestamp 字段需转 Date
    if (patch.savedAt   !== undefined) set['savedAt']   = patch.savedAt   ? new Date(patch.savedAt)   : null;
    if (patch.answeredAt !== undefined) set['answeredAt'] = patch.answeredAt ? new Date(patch.answeredAt) : null;

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
    if (opts.before) conditions.push(lt(divinations.savedAt, new Date(opts.before)));
    if (opts.after)  conditions.push(gte(divinations.savedAt, new Date(opts.after)));

    const rows = await db.select().from(divinations)
      .where(and(...conditions))
      .orderBy(desc(divinations.savedAt))
      .limit(limit);

    return rows.map(rowToRecord);
  }
}
