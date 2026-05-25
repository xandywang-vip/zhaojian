/**
 * 心境墙 API — /api/wall
 *
 * GET    /wall        概览列表（仅已保存卡片，游标分页）
 * GET    /wall/:id    卡片详情
 * DELETE /wall/:id    删除（不可恢复）
 */
import {
  Controller, Delete, Get,
  NotFoundException, Param, Query, Req,
} from '@nestjs/common';
import { DivinationStore, DivinationRecord } from '../../common/store';

// ── 卡片"金句"取值（always 取 reading.oneLine）─────────────────────────────
function getCardOneLine(r: DivinationRecord): string {
  try {
    const reading = r.aiReading as any;
    if (reading?.oneLine?.trim()) return reading.oneLine.trim();
  } catch {}
  return '一次照见。';
}

// ── 日期标签：YYYY.MM.DD · 周X{时段} ─────────────────────────────────────────
// 以北京时间（UTC+8）为准；UI 只展示时段词，不暴露精确分钟
function dateLabel(iso: string): string {
  const d   = new Date(iso);
  // 转 CST
  const cst = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const y   = cst.getUTCFullYear();
  const m   = String(cst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(cst.getUTCDate()).padStart(2, '0');
  const h   = cst.getUTCHours();
  const wd  = weekdays[cst.getUTCDay()];

  const period =
    h < 5  ? '深夜'  :
    h < 8  ? '清晨'  :
    h < 12 ? '上午'  :
    h < 14 ? '午后'  :
    h < 18 ? '下午'  :
    h < 20 ? '傍晚'  :
    h < 23 ? '晚上'  : '深夜';

  return `${y}.${m}.${day} · 周${wd}${period}`;
}

// ── DTO ────────────────────────────────────────────────────────────────────
interface WallCard {
  id: string;
  topic: string;
  oneLiner: string;                  // 金句（reading.oneLine）
  question: string | null;           // 追问
  answer:   string | null;           // 用户回答
  dateLabel: string;
  primaryImageryKey: string | null;
  createdAt: string;
  savedAt:   string | null;
}

interface WallFullCard extends WallCard {
  reading: { present: string; pivot: string; tryThis: string; oneLine: string };
  careNote:       string | null;
  displayYaoText: string | null;
}

function toCard(r: DivinationRecord): WallCard {
  return {
    id:                r.id,
    topic:             r.topic,
    oneLiner:          getCardOneLine(r),
    question:          r.question ?? null,
    answer:            r.answer   ?? null,
    dateLabel:         dateLabel(r.createdAt),   // 起卦时间
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
    @Req()           req:       any,
    @Query('topic')  topic?:    string,
    @Query('before') before?:   string,
    @Query('after')  after?:    string,
    @Query('limit')  limitStr?: string,
  ): Promise<{ items: WallCard[]; hasMore: boolean; nextCursor: string | null }> {
    const limit  = Math.min(Number(limitStr) || 20, 50);
    const userId = req.headers?.['x-device-id'] as string | undefined;

    // listWall 内部取 limit+1 来判断 hasMore
    const rows = await this.store.listWall({ userId, topic, before, after, limit });

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
