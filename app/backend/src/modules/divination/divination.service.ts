import { BadRequestException, Injectable } from '@nestjs/common';
import { cast } from '../../engine';
import { loadHexagramRecord } from '../../engine/hexagram-data';
import { DivinationStore, DivinationRecord } from '../../common/store';
import { AiService } from '../ai/ai.service';
import { CastDto } from './divination.dto';
import { canonicalGuaName, yaoPosName } from '../ai/ai.prompt';
import { buildImageryKey } from '../../common/imagery-map';
import { YAO_WHITELIST } from '../../common/yao-whitelist';

@Injectable()
export class DivinationService {
  constructor(private readonly store: DivinationStore, private readonly ai: AiService) {}

  // Daily cast limit（in-memory，重启自动归零，够 MVP 用）
  private readonly dailyCounts = new Map<string, Map<string, number>>();

  private getDayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private checkDailyLimit(ip: string): void {
    const day = this.getDayKey();
    for (const key of Array.from(this.dailyCounts.keys())) {
      if (key !== day) this.dailyCounts.delete(key);
    }
    let dayMap = this.dailyCounts.get(day);
    if (!dayMap) {
      dayMap = new Map();
      this.dailyCounts.set(day, dayMap);
    }
    const count = dayMap.get(ip) ?? 0;
    if (count >= 50) {
      throw new BadRequestException('今日已达上限，明天再来吧。');
    }
    dayMap.set(ip, count + 1);
  }

  async castAndStore(dto: CastDto, clientIp = 'unknown', userId?: string): Promise<DivinationRecord> {
    this.checkDailyLimit(clientIp);

    const core = cast({ method: 'time' });
    const benGuaName  = canonicalGuaName(core.benGua.name);
    const bianGuaName = canonicalGuaName(core.bianGua.name);
    const posName     = yaoPosName(core.dongYao);

    let dongYaoCi: string | undefined;
    let primaryImageryKey: string | null = null;
    let displayYaoText:    string | null = null;
    try {
      const benRecord = loadHexagramRecord(core.benGua.id);
      dongYaoCi         = benRecord.yaoCi[core.dongYao - 1] ?? undefined;
      primaryImageryKey = buildImageryKey(benRecord.upper, benRecord.lower);

      const hits = YAO_WHITELIST.filter(
        e => e.guaId === core.benGua.id && e.yao === core.dongYao,
      );
      if (hits.length > 0) {
        displayYaoText = hits[Math.floor(Math.random() * hits.length)].text;
      }
    } catch (_) { /* 卦数据找不到则省略 */ }

    const aiOutcome = await this.ai.generateReading({
      topic: dto.topic,
      benGuaName,
      bianGuaName,
      dongYao:    core.dongYao,
      yaoPosName: posName,
      dongYaoCi,
    });

    return this.store.create({
      userId,
      topic: dto.topic,
      benGuaName,
      bianGuaName,
      dongYao:    core.dongYao,
      yaoPosName: posName,
      castTrace:  core.trace ?? null,
      aiReading:  aiOutcome.reading,
      feedback:   null,
      primaryImageryKey,
      displayYaoText,
    });
  }

  async get(id: string): Promise<DivinationRecord | undefined> {
    return this.store.get(id);
  }

  async list(userId?: string): Promise<DivinationRecord[]> {
    return this.store.list(userId);
  }

  async setFeedback(id: string, feedback: 'up' | 'down'): Promise<DivinationRecord | undefined> {
    return this.store.update(id, { feedback });
  }

  async generateAndStoreQuestion(id: string): Promise<DivinationRecord | undefined> {
    const record = await this.store.get(id);
    if (!record) return undefined;
    if (record.question) return record;

    const reading = (record.aiReading as any) || {};

    const outcome = await this.ai.generateQuestion({
      topic:       record.topic,
      benGuaName:  record.benGuaName  || '',
      bianGuaName: record.bianGuaName || '',
      dongYao:     record.dongYao     || 0,
      yaoPosName:  record.yaoPosName  || '',
      reading: {
        present: reading.present || '',
        reframe: reading.pivot   || '',
        tryThis: reading.tryThis || '',
        oneLine: reading.oneLine || '',
      },
    });

    return this.store.update(id, {
      question:       outcome.question,
      questionSource: outcome.source,
    });
  }

  async saveAnswer(id: string, answer: string | null): Promise<DivinationRecord | undefined> {
    return this.store.update(id, {
      answer:     answer ?? null,
      answeredAt: new Date().toISOString(),
    });
  }

  async saveToWall(id: string): Promise<DivinationRecord | undefined> {
    return this.store.update(id, {
      isSaved: true,
      savedAt: new Date().toISOString(),
    });
  }

  async saveCareNote(id: string, careNote: string): Promise<DivinationRecord | undefined> {
    return this.store.update(id, { careNote });
  }
}
