<script setup lang="ts">
/**
 * 心境墙概览页 /wall
 * 双列不等高瀑布流 · 主题筛选条 · 空状态
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { listWall } from '../api/divination';
import type { WallCard } from '../api/types';
import { TOPICS } from '../api/types';

const router  = useRouter();
const cards   = ref<WallCard[]>([]);
const loading = ref(true);
const hasMore = ref(false);
const cursor  = ref<string | null>(null);
const selectedTopic = ref<string>('');

async function load(reset = false) {
  if (reset) {
    cards.value = [];
    cursor.value = null;
  }
  loading.value = true;
  try {
    const res = await listWall({
      topic:  selectedTopic.value || undefined,
      before: cursor.value ?? undefined,
      limit:  20,
    });
    cards.value  = reset ? res.items : [...cards.value, ...res.items];
    hasMore.value = res.hasMore;
    cursor.value  = res.nextCursor;
  } finally {
    loading.value = false;
  }
}

onMounted(() => load(true));

function applyFilter(topic: string) {
  selectedTopic.value = topic;
  load(true);
}

// 把卡片分配到两列（左右交替）
const leftCol  = computed(() => cards.value.filter((_, i) => i % 2 === 0));
const rightCol = computed(() => cards.value.filter((_, i) => i % 2 === 1));

// 意象 key → 淡色背景（用于卡片视觉氛围）
const IMAGERY_BG: Record<string, string> = {
  'heaven':   '#F5F3EE',
  'earth':    '#F0EDE8',
  'water':    '#EEF1F5',
  'fire':     '#F5EEE8',
  'thunder':  '#F2EFF0',
  'wind':     '#EEFAF0',
  'mountain': '#F0EEF0',
  'lake':     '#EEF4F5',
};

function cardBg(key: string | null): string {
  if (!key) return '#F5F3EE';
  const base = key.split('+')[0];
  return IMAGERY_BG[base] ?? '#F5F3EE';
}
</script>

<template>
  <main class="page wall-page">
    <div class="wall-header">
      <button class="back" @click="router.push('/')">← 返回</button>
      <h2 class="page-title">心境墙</h2>
      <p class="page-sub">你保存过的那些时刻</p>
    </div>

    <!-- 筛选条 -->
    <div class="filter-bar">
      <button
        class="chip"
        :class="{ active: selectedTopic === '' }"
        @click="applyFilter('')"
      >全部</button>
      <button
        v-for="t in TOPICS"
        :key="t"
        class="chip"
        :class="{ active: selectedTopic === t }"
        @click="applyFilter(t)"
      >{{ t }}</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading && cards.length === 0" class="muted center loading-hint">
      读取中…
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && cards.length === 0" class="empty">
      <div class="empty-icon">◌</div>
      <p class="empty-text">你还没有保存过卡片。</p>
      <p class="empty-sub">
        开始一次内在梳理，<br>
        给未来的自己留下一点温柔的印记。
      </p>
      <button class="btn btn-primary empty-cta" @click="router.push('/ask')">
        开始一次内在梳理
      </button>
    </div>

    <!-- 瀑布流双列 -->
    <div v-else class="masonry">
      <!-- 左列 -->
      <div class="masonry-col">
        <div
          v-for="card in leftCol"
          :key="card.id"
          class="wall-card"
          :style="{ background: cardBg(card.primaryImageryKey) }"
          @click="router.push(`/wall/${card.id}`)"
        >
          <div class="card-date">{{ card.dateLabel }}</div>
          <div class="card-topic">{{ card.topic }}</div>
          <p class="card-oneliner">{{ card.oneLiner }}</p>
        </div>
      </div>

      <!-- 右列（错峰半张卡高度） -->
      <div class="masonry-col right-col">
        <div
          v-for="card in rightCol"
          :key="card.id"
          class="wall-card"
          :style="{ background: cardBg(card.primaryImageryKey) }"
          @click="router.push(`/wall/${card.id}`)"
        >
          <div class="card-date">{{ card.dateLabel }}</div>
          <div class="card-topic">{{ card.topic }}</div>
          <p class="card-oneliner">{{ card.oneLiner }}</p>
        </div>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore && !loading" class="load-more-wrap">
      <button class="btn btn-ghost" @click="load(false)">加载更多</button>
    </div>
    <div v-if="loading && cards.length > 0" class="muted center" style="padding: 16px 0; font-size: 13px;">
      加载中…
    </div>
  </main>
</template>

<style scoped>
.wall-page { padding-bottom: 40px; }

.wall-header { margin-bottom: 0; }
.back {
  border: none; background: transparent;
  color: var(--c-muted); padding: 0 0 10px;
  cursor: pointer; font-size: 14px;
}
.page-title {
  margin: 4px 0 4px;
  font-size: 22px; font-weight: 500; letter-spacing: 1px;
}
.page-sub {
  font-size: 12.5px; color: var(--c-muted);
  margin: 0 0 18px; letter-spacing: 0.5px;
}

/* ── 筛选条 ─────────────────────────────────────────── */
.filter-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 12px;
  scrollbar-width: none;
  margin-bottom: 4px;
}
.filter-bar::-webkit-scrollbar { display: none; }

.chip {
  flex-shrink: 0;
  border: 1px solid var(--c-line);
  background: var(--c-paper);
  border-radius: 999px;
  padding: 5px 13px;
  font-size: 12px;
  color: var(--c-ink-soft);
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  font-family: inherit;
  white-space: nowrap;
}
.chip.active {
  background: var(--c-accent);
  border-color: var(--c-accent);
  color: #fff;
}
.chip:hover:not(.active) {
  border-color: var(--c-accent);
  color: var(--c-accent);
}

/* ── 空状态 ──────────────────────────────────────────── */
.center { text-align: center; }
.loading-hint { padding: 48px 0; }

.empty {
  text-align: center;
  padding: 56px 0 32px;
  display: flex; flex-direction: column;
  align-items: center; gap: 14px;
}
.empty-icon {
  font-size: 36px;
  color: var(--c-muted);
  line-height: 1;
  opacity: 0.5;
}
.empty-text {
  font-family: var(--font-serif, serif);
  font-size: 16px; color: var(--c-ink);
  letter-spacing: 2px; margin: 0;
}
.empty-sub {
  font-size: 13px; color: var(--c-muted);
  letter-spacing: 0.5px; line-height: 1.85;
  margin: 0; max-width: 280px;
}
.empty-cta { margin-top: 8px; padding-left: 28px; padding-right: 28px; letter-spacing: 2px; }

/* ── 瀑布流 ─────────────────────────────────────────── */
.masonry {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: start;
  margin-top: 4px;
}

.masonry-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 右列错峰：顶部偏移约半张卡高度 */
.right-col { margin-top: 20px; }

.wall-card {
  border-radius: 14px;
  padding: 16px 14px 14px;
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s;
  border: 1px solid rgba(0,0,0,0.05);
}
.wall-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.07);
}

.card-date {
  font-size: 10.5px;
  color: var(--c-muted);
  letter-spacing: 0.8px;
  margin-bottom: 6px;
  line-height: 1.4;
}
.card-topic {
  display: inline-block;
  font-size: 10.5px;
  color: var(--c-accent);
  background: rgba(158, 123, 107, 0.1);
  border-radius: 999px;
  padding: 2px 8px;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.card-oneliner {
  margin: 0;
  font-family: var(--font-serif, serif);
  font-size: 14px;
  color: var(--c-ink);
  line-height: 1.75;
  letter-spacing: 0.3px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── 加载更多 ─────────────────────────────────────────── */
.load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>
