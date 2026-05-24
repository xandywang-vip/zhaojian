/**
 * 心境墙 API — /api/wall
 *
 * GET    /wall        概览列表（仅已保存卡片，游标分页）
 * GET    /wall/:id    卡片详情
 * DELETE /wall/:id    删除（不可恢复）
 */
import {
  Controller, Delete, Get,
  NotFoundException, Param, Query,
} from '@nestjs/common';
import { DivinationStore, DivinationRecord } from '../../common/store';

// ── 卡片"一句话"取值逻辑（spec 第 2 节）────────────────────────────────────
function getCardOneLiner(r: DivinationRecord): string {
  if (r.careNote?.trim()) return r.careNote.trim();
  if (r.answer?.trim())   return r.answer.trim();
  try {
    const reading = r.aiReading as any;
    if (reading?.oneLine?.trim()) return reading.oneLine.trim();
  } catch {}
  return '一次照见。';
}

// ── 时段词（spec 3.2）────────────────────────────────────────────────────────
function timePeriod(iso: string): string {
  const h = new Date(iso).getHours();
  if (h >= 5  && h < 7)  return '清晨';
  if (h >= 7  && h < 11) return '上午';
  if (h >= 11 && h < 14) return '午后';
  if (h >= 14 && h < 17) return '下午';
  if (h >= 17 && h < 19) return '傍晚';
  if (h >= 19 && h < 23) return '夜';
  return '深夜';
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day} 周${weekdays[d.getDay()]}${timePeriod(iso)}`;
}

// ── DTO ────────────────────────────────────────────────────────────────────
interface WallCard {
  id: string;
  topic: string;
  oneLiner: string;
  dateLabel: string;
  primaryImageryKey: string | null;
  createdAt: string;
  savedAt:   string | null;
}

interface WallFullCard extends WallCard {
  reading: { present: string; pivot: string; tryThis: string; oneLine: string };
  question:       string | null;
  answer:         string | null;
  careNote:       string | null;
  displayYaoText: string | null;
}

function toCard(r: DivinationRecord): WallCard {
  const ts = r.savedAt || r.createdAt;
  return {
    id:                r.id,
    topic:             r.topic,
    oneLiner:          getCardOneLiner(r),
    dateLabel:         dateLabel(ts),
    primaryImageryKey: r.primaryImageryKey ?? null,
    createdAt:         r.createdAt,
    savedAt:           r.savedAt ?? null,
  };
}

function toFullCard(r: DivinationRecord): WallFullCard {
  const aiR = (r.aiReading as any) || {};
  return {
    ...toCard(r),
    reading: {
      present: aiR.present ?? '',
      pivot:   aiR.pivot   ?? '',
      tryThis: aiR.tryThis ?? '',
      oneLine: aiR.oneLine ?? '',
    },
    question:       r.question       ?? null,
    answer:         r.answer         ?? null,
    careNote:       r.careNote       ?? null,
    displayYaoText: r.displayYaoText ?? null,
  };
}

// ── Controller ────────────────────────────────────────────────────────────
@Controller('wall')
export class WallController {
  constructor(private readonly store: DivinationStore) {}

  /**
   * GET /api/wall
   * 游标分页：before = 上一页最末条 savedAt（ISO string）
   */
  @Get()
  async list(
    @Query('topic')  topic?:    string,
    @Query('before') before?:   string,
    @Query('limit')  limitStr?: string,
  ): Promise<{ items: WallCard[]; hasMore: boolean; nextCursor: string | null }> {
    const limit = Math.min(Number(limitStr) || 20, 50);

    // listWall 内部取 limit+1 来判断 hasMore
    const rows = await this.store.listWall({ topic, before, limit });

    const hasMore = rows.length > limit;
    const page    = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore
      ? (page[page.length - 1].savedAt ?? page[page.length - 1].createdAt)
      : null;

    return { items: page.map(toCard), hasMore, nextCursor };
  }

  /** GET /api/wall/:id */
  @Get(':id')
  async getOne(@Param('id') id: string): Promise<WallFullCard> {
    const r = await this.store.get(id);
    if (!r || !r.isSaved) throw new NotFoundException('卡片不存在');
    return toFullCard(r);
  }

  /**
   * DELETE /api/wall/:id
   * 硬删，前端已做二次确认
   */
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: boolean }> {
    const r = await this.store.get(id);
    if (!r || !r.isSaved) throw new NotFoundException('卡片不存在');
    await this.store.delete(id);
    return { ok: true };
  }
}
