import {
  pgTable, uuid, varchar, text, integer, boolean,
  timestamp, jsonb, index,
} from 'drizzle-orm/pg-core';

export const divinations = pgTable(
  'divinations',
  {
    // 主键：UUID（与原 randomUUID() 保持一致）
    id: uuid('id').primaryKey().defaultRandom(),

    // 用户输入
    topic: varchar('topic', { length: 32 }).notNull(),

    // 卦象参数（存展示名，不存原始 id）
    benGuaName:  varchar('ben_gua_name',  { length: 32 }),
    bianGuaName: varchar('bian_gua_name', { length: 32 }),
    dongYao:     integer('dong_yao'),
    yaoPosName:  varchar('yao_pos_name',  { length: 8 }),
    castTrace:   jsonb('cast_trace'),        // CastTrace | null

    // AI 解读（{ present, pivot, tryThis, oneLine }）
    aiReading: jsonb('ai_reading'),

    // 用户反馈
    feedback: varchar('feedback', { length: 8 }),   // 'up' | 'down' | null

    // 追问
    question:       text('question'),
    questionSource: varchar('question_source', { length: 32 }),
    answer:         text('answer'),
    answeredAt:     timestamp('answered_at', { withTimezone: true }),

    // 心境墙
    isSaved:           boolean('is_saved').notNull().default(false),
    savedAt:           timestamp('saved_at',           { withTimezone: true }),
    careNote:          text('care_note'),

    // 起卦时计算写入的意象字段
    primaryImageryKey: varchar('primary_imagery_key', { length: 32 }),
    displayYaoText:    varchar('display_yao_text',    { length: 64 }),

    // 时间戳
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // 心境墙列表主查询索引
    savedAtIdx: index('idx_saved_at').on(t.isSaved, t.savedAt),
    // 历史记录查询索引
    createdAtIdx: index('idx_created_at').on(t.createdAt),
  }),
);

export type DivinationRow    = typeof divinations.$inferSelect;
export type DivinationInsert = typeof divinations.$inferInsert;
