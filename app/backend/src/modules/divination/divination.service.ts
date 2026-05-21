import { BadRequestException, Injectable } from '@nestjs/common';
import { cast } from '../../engine';
import { loadHexagramRecord } from '../../engine/hexagram-data';
import { DivinationStore, DivinationRecord } from '../../common/store';
import { AiService } from '../ai/ai.service';
import { CastDto } from './divination.dto';
import { canonicalGuaName, yaoPosName } from '../ai/ai.prompt';

@Injectable()
export class DivinationService {
  constructor(private readonly store: DivinationStore, private readonly ai: AiService) {}

  // Daily cast limit: 3 per IP per day (in-memory for MVP)
  private readonly dailyCounts = new Map<string, Map<string, number>>();

  private getDayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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

  async castAndStore(dto: CastDto, clientIp = 'unknown'): Promise<DivinationRecord> {
    this.checkDailyLimit(clientIp);

    // Use the engine to draw a hexagram. Time-based casting.
    const core = cast({ method: 'time' });
    const benGuaName  = canonicalGuaName(core.benGua.name);
    const bianGuaName = canonicalGuaName(core.bianGua.name);
    const posName = yaoPosName(core.dongYao);

    // 读取动爻爻辞原文，供 AI 判断凶/厉/吝
    let dongYaoCi: string | undefined;
    try {
      const benRecord = loadHexagramRecord(core.benGua.id);
      dongYaoCi = benRecord.yaoCi[core.dongYao - 1] ?? undefined;
    } catch (_) { /* 找不到则省略 */ }

    const aiOutcome = await this.ai.generateReading({
      topic: dto.topic,
      benGuaName,
      bianGuaName,
      dongYao: core.dongYao,
      yaoPosName: posName,
      dongYaoCi,
    });

    return this.store.create({
      topic: dto.topic,
      benGuaName,
      bianGuaName,
      dongYao: core.dongYao,
      yaoPosName: posName,
      castTrace: core.trace ?? null,
      aiReading: aiOutcome.reading,
      feedback: null,
    });
  }

  get(id: string): DivinationRecord | undefined {
    return this.store.get(id);
  }

  list(): DivinationRecord[] {
    return this.store.list();
  }

  setFeedback(id: string, feedback: 'up' | 'down'): DivinationRecord | undefined {
    return this.store.update(id, { feedback });
  }

  /**
   * 为一次解读生成追问问题，并落库到 record 上。
   * 已生成过则直接返回；不重复消耗 AI 调用次数。
   */
  async generateAndStoreQuestion(id: string): Promise<DivinationRecord | undefined> {
    const record = this.store.get(id);
    if (!record) return undefined;
    if (record.question) return record;

    const reading = (record.aiReading as any) || {};
    const summary = [reading.present, reading.pivot].filter(Boolean).join(' ').slice(0, 80);

    const outcome = await this.ai.generateQuestion({
      topic: record.topic,
      benGuaName: record.benGuaName || '',
      bianGuaName: record.bianGuaName || '',
      dongYao: record.dongYao || 0,
      yaoPosName: record.yaoPosName || '',
      readingSummary: summary,
    });

    return this.store.update(id, {
      question: outcome.question,
      questionSource: outcome.source,
    });
  }

  /**
   * 保存用户对追问的回答。answer 为 null 表示"跳过"。
   */
  saveAnswer(id: string, answer: string | null): DivinationRecord | undefined {
    return this.store.update(id, {
      answer: answer ?? null,
      answeredAt: new Date().toISOString(),
    });
  }

  /**
   * 把解读收进心境墙（isSaved = true）。
   * 独立于关怀语；点击主 CTA 立即调用，不依赖 careNote 是否填写。
   */
  saveToWall(id: string): DivinationRecord | undefined {
    return this.store.update(id, {
      isSaved: true,
      savedAt: new Date().toISOString(),
    });
  }

  /**
   * 保存可选关怀语（care_note）。
   * 独立于 isSaved；用户写完点"保存这句话"时调用。
   */
  saveCareNote(id: string, careNote: string): DivinationRecord | undefined {
    return this.store.update(id, { careNote });
  }
}
