<template>
  <div class="wall-view">
    <!-- 顶部导航 -->
    <header class="wall-view__header">
      <button class="wall-view__back" @click="$router.back()">← 返回</button>
      <h1 class="wall-view__title">心境墙</h1>
      <p class="wall-view__subtitle">你保存过的那些时刻</p>
    </header>

    <!-- 主题筛选 chip -->
    <div class="wall-view__filters">
      <button
        class="wall-view__chip"
        :class="{ 'is-active': activeTopic === '' }"
        @click="setTopic('')"
      >全部</button>
      <button
        v-for="t in TOPICS"
        :key="t"
        class="wall-view__chip"
        :class="{ 'is-active': activeTopic === t }"
        @click="setTopic(t)"
      >{{ t }}</button>
    </div>

    <!-- 加载中（首次） -->
    <div v-if="loading && cards.length === 0" class="wall-view__loading">
      读取中…
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && cards.length === 0" class="wall-view__empty">
      <div class="wall-view__empty-icon">◌</div>
      <p>你还没有保存过卡片。</p>
      <p>开始一次内在梳理，<br>给未来的自己留下一点温柔的印记。</p>
      <button class="wall-view__cta" @click="$router.push('/ask')">
        开始一次内在梳理
      </button>
    </div>

    <!-- 卡片网格（双列瀑布流） -->
    <div v-else class="wall-view__grid">
      <WallCard
        v-for="card in cards"
        :key="card.id"
        :card="card"
        @open="openDetail"
      />
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore && cards.length > 0" class="wall-view__loadmore">
      <button @click="loadMore" :disabled="loading">
        {{ loading ? '加载中…' : '加载更多' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import WallCard from '@/components/WallCard.vue';
import { listWall } from '@/api/divination';
import { TOPICS } from '@/api/types';
import type { WallCard as WallCardType } from '@/api/types';

const router = useRouter();

const cards       = ref<WallCardType[]>([]);
const activeTopic = ref<string>('');
const nextCursor  = ref<string | null>(null);
const hasMore     = ref(false);
const loading     = ref(false);

async function loadList(reset = false) {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await listWall({
      topic:  activeTopic.value || undefined,
      before: reset ? undefined : (nextCursor.value ?? undefined),
      limit:  20,
    });
    cards.value   = reset ? res.items : [...cards.value, ...res.items];
    nextCursor.value = res.nextCursor;
    hasMore.value    = res.hasMore;
  } finally {
    loading.value = false;
  }
}

function setTopic(topic: string) {
  if (activeTopic.value === topic) return;
  activeTopic.value = topic;
  nextCursor.value  = null;
  hasMore.value     = false;
  loadList(true);
}

function loadMore() {
  loadList(false);
}

function openDetail(id: string) {
  router.push(`/wall/${id}`);
}

onMounted(() => loadList(true));
</script>

<style scoped>
.wall-view {
  padding: 24px 20px 48px;
  max-width: 720px;
  margin: 0 auto;
  background: #F2EFE7;
  min-height: 100vh;
}

/* ── 顶部 ─────────────────────────────── */
.wall-view__header {
  margin-bottom: 24px;
}

.wall-view__back {
  background: none;
  border: none;
  font-size: 13px;
  color: #888780;
  cursor: pointer;
  padding: 0;
  margin-bottom: 8px;
  font-family: inherit;
}

.wall-view__title {
  font-size: 24px;
  font-weight: 500;
  margin: 0 0 4px;
  color: #2C2C2A;
  letter-spacing: 1px;
}

.wall-view__subtitle {
  font-size: 13px;
  color: #888780;
  margin: 0;
}

/* ── 筛选条（自适应换行） ─────────────── */
.wall-view__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.wall-view__chip {
  flex: 0 0 auto;
  font-size: 13px;
  padding: 6px 14px;
  background: #FFFCF6;
  color: #5F5E5A;
  border: 0.5px solid #D3D1C7;
  border-radius: 999px;
  white-space: nowrap;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.wall-view__chip.is-active {
  background: #5F6B4C;
  color: #FFFFFF;
  border-color: #5F6B4C;
}

/* ── 加载 / 空状态 ───────────────────── */
.wall-view__loading {
  text-align: center;
  padding: 64px 0;
  color: #888780;
  font-size: 14px;
}

.wall-view__empty {
  text-align: center;
  padding: 64px 24px;
  color: #888780;
  font-size: 14px;
  line-height: 2;
}
.wall-view__empty-icon {
  font-size: 36px;
  opacity: 0.4;
  margin-bottom: 16px;
}
.wall-view__empty p { margin: 0; }

.wall-view__cta {
  display: inline-block;
  margin-top: 24px;
  padding: 12px 28px;
  background: #5F6B4C;
  color: #FFFFFF;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  letter-spacing: 0.5px;
}

/* ── 双列瀑布流 ──────────────────────── */
.wall-view__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}

@media (max-width: 480px) {
  .wall-view__grid {
    grid-template-columns: 1fr;
  }
}

/* ── 加载更多 ────────────────────────── */
.wall-view__loadmore {
  text-align: center;
  margin-top: 24px;
}
.wall-view__loadmore button {
  background: none;
  border: 0.5px solid #D3D1C7;
  color: #5F5E5A;
  padding: 8px 24px;
  border-radius: 999px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}
.wall-view__loadmore button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
