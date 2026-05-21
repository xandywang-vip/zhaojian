<script setup lang="ts">
/**
 * 全部起卦记录（次级页面，从心境墙 /wall 进入）
 *
 * 展示：日期 + 卦名 + 金句 + 用户写的一句话（若有）前 20 字。
 * 卡片点击进入解读详情 /result/:id。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { listHistory } from '../api/divination';
import type { PublicDivination, Topic } from '../api/types';

const router = useRouter();
const items = ref<PublicDivination[]>([]);
const loading = ref(true);

const filterTopic = ref<Topic | ''>('');

const filtered = computed(() => {
  if (!filterTopic.value) return items.value;
  return items.value.filter(it => it.topic === filterTopic.value);
});

onMounted(async () => {
  try {
    items.value = await listHistory();
  } finally {
    loading.value = false;
  }
});

function dateLabel(t: string) {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`;
}

function answerPreview(text: string | null): string {
  if (!text) return '';
  if (text.length <= 20) return text;
  return text.slice(0, 20) + '…';
}

function hexagramLabel(it: PublicDivination): string {
  return it.benGuaName || it.topic;
}
</script>

<template>
  <main class="page">
    <button class="back" @click="router.push('/wall')">← 返回心境墙</button>
    <h2 class="page-title">全部起卦记录</h2>
    <p class="muted small">这里是你的所有起卦轨迹，包括没保存的。</p>

    <!-- 主题筛选条 -->
    <div v-if="items.length > 0" class="filter-row">
      <button
        class="chip"
        :class="{ 'is-on': filterTopic === '' }"
        @click="filterTopic = ''"
      >全部</button>
      <button
        v-for="t in (['工作与压力','关系与情感','自我与成长','选择与犹豫','失落与疗愈','焦虑与平静'] as Topic[])"
        :key="t"
        class="chip"
        :class="{ 'is-on': filterTopic === t }"
        @click="filterTopic = (filterTopic === t ? '' : t)"
      >{{ t }}</button>
    </div>

    <div v-if="loading" class="muted center" style="padding: 40px 0">读取中…</div>

    <div v-else-if="items.length === 0" class="empty">
      <p>还没有记录。</p>
      <button class="btn btn-primary" @click="router.push('/ask')">去看看今天的视角</button>
    </div>

    <ul v-else class="timeline">
      <li
        v-for="it in filtered"
        :key="it.id"
        class="timeline-item"
        :class="{ 'is-empty': !it.careNote && !it.isSaved }"
        @click="router.push(`/result/${it.id}`)"
      >
        <div class="line-head">
          <span class="date">{{ dateLabel(it.createdAt) }}</span>
          <span class="hex">{{ hexagramLabel(it) }}</span>
          <span v-if="it.isSaved" class="saved-tag">已收藏</span>
        </div>

        <p class="quote">「{{ it.reading.oneLine || '（视角已记录）' }}」</p>

        <p v-if="it.careNote" class="answer-preview">{{ answerPreview(it.careNote) }}</p>

        <span class="chev">查看完整 →</span>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.back {
  border: none;
  background: transparent;
  color: var(--c-muted);
  padding: 0 0 12px;
  cursor: pointer;
  font-size: 14px;
}
.page-title {
  margin: 4px 0 8px;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 1px;
}
.small { font-size: 13px; margin: 0 0 18px; }
.center { text-align: center; }

/* ---- 筛选条 ---- */
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 6px 0 22px;
}
.chip {
  border: 1px solid var(--c-line);
  background: var(--c-paper);
  color: var(--c-ink-soft);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  letter-spacing: 1px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.18s, color 0.18s, border-color 0.18s;
}
.chip:hover { background: var(--c-bg-soft); }
.chip.is-on {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: rgba(158, 123, 107, 0.08);
}

/* ---- 空 ---- */
.empty {
  text-align: center;
  padding: 50px 0 30px;
  color: var(--c-muted);
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
}
.empty p { margin: 0; font-size: 14px; }

/* ---- 时间轴 ---- */
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
}
.timeline-item {
  position: relative;
  padding: 16px 18px;
  background: var(--c-paper);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  margin-bottom: 12px;
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s;
}
.timeline-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}
.timeline-item.is-empty { opacity: 0.78; }

.line-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 8px;
}
.date {
  font-size: 12px;
  color: var(--c-muted);
  letter-spacing: 1.5px;
}
.hex {
  font-family: var(--font-serif, serif);
  font-size: 14px;
  color: var(--c-ink);
  letter-spacing: 2px;
}
.saved-tag {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--c-accent);
  letter-spacing: 1.5px;
  border: 1px solid var(--c-accent);
  border-radius: 999px;
  padding: 1px 7px;
  opacity: 0.85;
}

.quote {
  margin: 0 0 8px;
  font-family: var(--font-serif, serif);
  font-size: 14.5px;
  color: var(--c-ink);
  line-height: 1.7;
  letter-spacing: 0.5px;
}

.answer-preview {
  margin: 0 0 22px;
  padding-right: 4px;
  font-size: 13px;
  color: var(--c-ink-soft);
  line-height: 1.7;
  letter-spacing: 0.3px;
}
.empty-day {
  margin: 0 0 22px;
  font-size: 12px;
  color: var(--c-muted);
  letter-spacing: 1px;
}

.chev {
  position: absolute;
  right: 14px;
  bottom: 12px;
  font-size: 11px;
  color: var(--c-muted);
  letter-spacing: 1px;
  background: var(--c-paper);
  padding-left: 8px;
}
</style>
