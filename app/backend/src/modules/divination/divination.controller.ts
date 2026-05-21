import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import { DivinationService } from './divination.service';
import { CastDto } from './divination.dto';
import { checkCrisisKeywords } from '../../common/crisis-words';
import type { DivinationRecord } from '../../common/store';
import type { CastTrace } from '../../engine/casting';

interface PublicReading {
  present: string;
  pivot: string;
  tryThis: string;
  oneLine: string;
}

interface PublicDivination {
  id: string;
  topic: string;
  reading: PublicReading;
  feedback: 'up' | 'down' | null;
  // Hexagram inspiration (debug only)
  benGuaName?: string;
  bianGuaName?: string;
  dongYao?: number;
  yaoPosName?: string;
  // 追问与回答（PRD section 3.5 / 3.6）
  question: string | null;
  questionSource: string | null;
  answer: string | null;
  answeredAt: string | null;
  // 心境墙
  isSaved: boolean;
  savedAt: string | null;
  careNote: string | null;
  createdAt: string;
  // Debug only
  castTrace?: CastTrace | null;
}

function projectReading(record: DivinationRecord): PublicReading {
  const r = (record.aiReading as any) || {};
  return {
    present: r.present ?? '',
    pivot:   r.pivot ?? '',
    tryThis: r.tryThis ?? '',
    oneLine: r.oneLine ?? '',
  };
}

function project(record: DivinationRecord): PublicDivination {
  return {
    id: record.id,
    topic: record.topic,
    reading: projectReading(record),
    feedback: record.feedback ?? null,
    benGuaName:  record.benGuaName,
    bianGuaName: record.bianGuaName,
    dongYao:     record.dongYao,
    yaoPosName:  record.yaoPosName,
    question:       record.question       ?? null,
    questionSource: record.questionSource ?? null,
    answer:         record.answer         ?? null,
    answeredAt:     record.answeredAt     ?? null,
    isSaved:        record.isSaved        ?? false,
    savedAt:        record.savedAt        ?? null,
    careNote:       record.careNote       ?? null,
    createdAt: record.createdAt,
    castTrace: record.castTrace ?? null,
  };
}

@Controller('divination')
export class DivinationController {
  constructor(private readonly service: DivinationService) {}

  @Post('cast')
  async cast(@Body() dto: CastDto, @Req() req: any): Promise<PublicDivination> {
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : null)
      ?? req.ip
      ?? 'unknown';
    const record = await this.service.castAndStore(dto, String(ip).trim());
    return project(record);
  }

  @Post('crisis-check')
  crisisCheck(@Body('text') text: string): { risk: boolean } {
    if (!text || typeof text !== 'string') return { risk: false };
    return { risk: checkCrisisKeywords(text) };
  }

  @Get('history')
  history(): PublicDivination[] {
    return this.service.list().map(project);
  }

  @Get(':id')
  getOne(@Param('id') id: string): PublicDivination {
    const record = this.service.get(id);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  @Post(':id/feedback')
  feedback(
    @Param('id') id: string,
    @Body('value') value: 'up' | 'down',
  ): PublicDivination {
    if (value !== 'up' && value !== 'down') {
      throw new BadRequestException('value must be up or down');
    }
    const record = this.service.setFeedback(id, value);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  /**
   * 生成（或读取已生成）的追问问题。
   * 调用方式：POST /divination/:id/question
   * 注意：内部已做三层保险，调用方无需重试。
   */
  @Post(':id/question')
  async generateQuestion(@Param('id') id: string): Promise<PublicDivination> {
    const record = await this.service.generateAndStoreQuestion(id);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  /**
   * @deprecated 旧"追问真心话"流程已废弃，方案 A 后改用 /care-note。
   * 此端点暂保留用于兼容历史客户端，仅做危机词检测。
   * answer = "" 或 null 表示跳过。命中危机词 → BadRequestException 让前端切到关怀流。
   */
  @Post(':id/answer')
  async saveAnswer(
    @Param('id') id: string,
    @Body('answer') answer: string,
  ): Promise<PublicDivination & { crisis?: boolean }> {
    const text = (answer ?? '').trim();
    // 危机检测前置：不写入，返回 crisis: true 给前端切换关怀流
    if (text && checkCrisisKeywords(text)) {
      throw new BadRequestException({
        crisis: true,
        message: '检测到危机信号，请前往关怀页',
      });
    }
    const record = this.service.saveAnswer(id, text || null);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  /**
   * 把解读收进心境墙（isSaved = true）。
   * 独立于关怀语；点击主 CTA 立即调用。
   */
  @Post(':id/save')
  save(@Param('id') id: string): PublicDivination {
    const record = this.service.saveToWall(id);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  /**
   * 保存可选关怀语。
   * 独立于 isSaved；用户写完点"保存这句话"时调用。
   */
  @Post(':id/care-note')
  careNote(
    @Param('id') id: string,
    @Body('careNote') careNote: string,
  ): PublicDivination {
    if (!careNote || typeof careNote !== 'string') {
      throw new BadRequestException('careNote 不能为空');
    }
    const record = this.service.saveCareNote(id, careNote.trim().slice(0, 100));
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }
}
