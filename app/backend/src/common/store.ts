import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CastTrace } from '../engine/casting';

export interface DivinationRecord {
  id: string;
  topic: string;
  // Hexagram inspiration (kept on the record for debug display only;
  // never surfaced as content to the user).
  benGuaName?:  string;
  bianGuaName?: string;
  dongYao?:     number;
  yaoPosName?:  string;
  castTrace?:   CastTrace | null;
  // 心境墙保存（PRD 改造）
  isSaved?:     boolean;
  savedAt?:     string | null;
  careNote?:    string | null;
  aiReading: unknown | null;
  feedback?: 'up' | 'down' | null;
  // 追问与用户回答（PRD section 3.5 / 3.6）
  question?:     string | null;
  questionSource?: string | null;  // llm / llm-retry-1 / llm-retry-2 / fallback
  answer?:       string | null;    // 用户填写的内容；null = 跳过
  answeredAt?:   string | null;
  createdAt: string;
}

/**
 * In-memory store for MVP. Production should swap this out for MySQL/Postgres.
 */
@Injectable()
export class DivinationStore {
  private readonly records = new Map<string, DivinationRecord>();

  create(partial: Omit<DivinationRecord, 'id' | 'createdAt'>): DivinationRecord {
    const id = randomUUID();
    const record: DivinationRecord = {
      ...partial,
      id,
      createdAt: new Date().toISOString(),
    };
    this.records.set(id, record);
    return record;
  }

  get(id: string): DivinationRecord | undefined {
    return this.records.get(id);
  }

  update(id: string, patch: Partial<DivinationRecord>): DivinationRecord | undefined {
    const existing = this.records.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.records.set(id, updated);
    return updated;
  }

  list(): DivinationRecord[] {
    return Array.from(this.records.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}
