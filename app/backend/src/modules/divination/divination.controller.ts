import {
  BadRequestException, Body, Controller, Get,
  NotFoundException, Param, Post, Req,
} from '@nestjs/common';
import { DivinationService } from './divination.service';
import { CastDto } from './divination.dto';
import { checkCrisisKeywords } from '../../common/crisis-words';
import type { DivinationRecord } from '../../common/store';
import type { CastTrace } from '../../engine/casting';

interface PublicReading {
  present: string;
  pivot:   string;
  tryThis: string;
  oneLine: string;
}

interface PublicDivination {
  id:       string;
  topic:    string;
  reading:  PublicReading;
  feedback: 'up' | 'down' | null;
  benGuaName?:  string;
  bianGuaName?: string;
  dongYao?:     number;
  yaoPosName?:  string;
  question:       string | null;
  questionSource: string | null;
  answer:         string | null;
  answeredAt:     string | null;
  isSaved:           boolean;
  savedAt:           string | null;
  careNote:          string | null;
  primaryImageryKey: string | null;
  displayYaoText:    string | null;
  createdAt: string;
  castTrace?: CastTrace | null;
}

function projectReading(record: DivinationRecord): PublicReading {
  const r = (record.aiReading as any) || {};
  return {
    present: r.present ?? '',
    pivot:   r.pivot   ?? '',
    tryThis: r.tryThis ?? '',
    oneLine: r.oneLine ?? '',
  };
}

function project(record: DivinationRecord): PublicDivination {
  return {
    id:       record.id,
    topic:    record.topic,
    reading:  projectReading(record),
    feedback: record.feedback ?? null,
    benGuaName:   record.benGuaName,
    bianGuaName:  record.bianGuaName,
    dongYao:      record.dongYao,
    yaoPosName:   record.yaoPosName,
    question:          record.question          ?? null,
    questionSource:    record.questionSource    ?? null,
    answer:            record.answer            ?? null,
    answeredAt:        record.answeredAt        ?? null,
    isSaved:           record.isSaved           ?? false,
    savedAt:           record.savedAt           ?? null,
    careNote:          record.careNote          ?? null,
    primaryImageryKey: record.primaryImageryKey ?? null,
    displayYaoText:    record.displayYaoText    ?? null,
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
      ?? req.ip ?? 'unknown';
    const userId = req.headers?.['x-device-id'] as string | undefined;
    const record = await this.service.castAndStore(dto, String(ip).trim(), userId);
    return project(record);
  }

  @Post('crisis-check')
  crisisCheck(@Body('text') text: string): { risk: boolean } {
    if (!text || typeof text !== 'string') return { risk: false };
    return { risk: checkCrisisKeywords(text) };
  }

  @Get('history')
  async history(@Req() req: any): Promise<PublicDivination[]> {
    const userId = req.headers?.['x-device-id'] as string | undefined;
    const records = await this.service.list(userId);
    return records.map(project);
  }

  @Get(':id')
  async getOne(@Param('id') id: string): Promise<PublicDivination> {
    const record = await this.service.get(id);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  @Post(':id/feedback')
  async feedback(
    @Param('id') id: string,
    @Body('value') value: 'up' | 'down',
  ): Promise<PublicDivination> {
    if (value !== 'up' && value !== 'down') {
      throw new BadRequestException('value must be up or down');
    }
    const record = await this.service.setFeedback(id, value);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  @Post(':id/question')
  async generateQuestion(@Param('id') id: string): Promise<PublicDivination> {
    const record = await this.service.generateAndStoreQuestion(id);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  @Post(':id/answer')
  async saveAnswer(
    @Param('id') id: string,
    @Body('answer') answer: string,
  ): Promise<PublicDivination & { crisis?: boolean }> {
    const text = (answer ?? '').trim();
    if (text && checkCrisisKeywords(text)) {
      throw new BadRequestException({ crisis: true, message: '检测到危机信号，请前往关怀页' });
    }
    const record = await this.service.saveAnswer(id, text || null);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  @Post(':id/save')
  async save(@Param('id') id: string): Promise<PublicDivination> {
    const record = await this.service.saveToWall(id);
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }

  @Post(':id/care-note')
  async careNote(
    @Param('id') id: string,
    @Body('careNote') careNote: string,
  ): Promise<PublicDivination> {
    if (!careNote || typeof careNote !== 'string') {
      throw new BadRequestException('careNote 不能为空');
    }
    const record = await this.service.saveCareNote(id, careNote.trim().slice(0, 100));
    if (!record) throw new NotFoundException('记录不存在');
    return project(record);
  }
}
