<script setup lang="ts">
/**
 * 心境墙 —— 展示所有已收进心境墙的解读卡片
 * 每张卡片：日期 + 主题 + 金句 + 用户关怀语（若有）
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { listHistory } from '../api/divination';
import type { PublicDivination } from '../api/types';

const router = useRouter();
const all     = ref<PublicDivination[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    all.value = await listHistory();
  } finally {
    loading.value = false;
  }
});

const saved = computed(() =>
  all.value.filter(it => it.isSaved)
);

function dateLabel(t: string) {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 · 周${weekdays[d.getDay()]}`;
}
</script>

<template>
  <main class="page wall-page">
    <button class="back" @click="router.push('/')">← 返回</button>

    <h2 class="page-title">心境墙</h2>
    <p class="page-sub">你收藏下来的，都是某一刻真实照见自己的瞬间。</p>

    <div v-if="loading" class="muted center" style="padding: 48px 0">读取中…</div>

    <div v-else-if="saved.length === 0" class="empty">
      <p class="empty-text">你还没有保存过卡片。</p>
      <p class="empty-sub">
        开始一次内在梳理，<br>
        给未来的自己留下一点温柔的印记。
      </p>
      <button class="btn btn-primary empty-cta" @click="router.push('/ask')">开始一次内在梳理</button>
    </div>

    <ul v-else class="wall-list">
      <li
        v-for="it in saved"
        :key="it.id"
        class="wall-card"
        @click="router.push(`/result/${it.id}`)"
      >
        <div class="card-meta">
          <span class="card-date">{{ dateLabel(it.savedAt || it.createdAt) }}</span>
          <span class="card-topic">{{ it.topic }}</span>
        </div>

        <!-- 预览文字：优先用户写的一句话，否则用 AI 金句 -->
        <p v-if="it.careNote" class="card-preview is-note">
          <span class="note-mark">「</span>{{ it.careNote }}<span class="note-mark">」</span>
        </p>
        <p v-else class="card-preview is-oneline">{{ it.reading.oneLine }}</p>

        <span class="card-arrow">回看 →</span>
      </li>
    </ul>

    <!-- 全部记录入口（次级，不在主导航） -->
    <p v-if="!loading && saved.length > 0" class="all-link" @click="router.push('/history')">
      查看全部起卦记录 →
    </p>

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
  margin: 4px 0 6px;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 1px;
}
.page-sub {
  font-size: 13px;
  color: var(--c-muted);
  margin: 0 0 24px;
  letter-spacing: 0.3px;
  line-height: 1.7;
}
.center { text-align: center; }

/* 空状态 */
.empty {
  text-align: center;
  padding: 56px 0 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.empty-text {
  font-family: var(--font-serif, serif);
  font-size: 16px;
  color: var(--c-ink);
  letter-spacing: 2px;
  margin: 0;
}
.empty-sub {
  font-size: 13px;
  color: var(--c-muted);
  letter-spacing: 0.5px;
  line-height: 1.85;
  margin: 0;
  max-width: 280px;
}
.empty-cta {
  margin-top: 12px;
  padding-left: 28px;
  padding-right: 28px;
  letter-spacing: 2px;
}

/* 卡片列表 */
.wall-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wall-card {
  position: relative;
  background: var(--c-paper);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  padding: 18px 18px 14px;
  cursor: pointer;
  transition: transform 0.18s, box-shadow 0.18s;
}
.wall-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.card-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.card-date {
  font-size: 11.5px;
  color: var(--c-muted);
  letter-spacing: 1.5px;
}
.card-topic {
  font-size: 11.5px;
  color: var(--c-accent);
  letter-spacing: 1px;
  background: rgba(158, 123, 107, 0.08);
  border-radius: 999px;
  padding: 2px 8px;
}

/* 卡片预览：优先用户写的 careNote，否则用 AI oneLine */
.card-preview {
  margin: 0 0 12px;
  padding-right: 56px;
  font-family: var(--font-serif, serif);
  line-height: 1.75;
  letter-spacing: 0.5px;
}
.card-preview.is-oneline {
  font-size: 15.5px;
  color: var(--c-ink);
}
.card-preview.is-note {
  font-size: 14.5px;
  color: var(--c-ink-soft);
  font-style: italic;
}
.note-mark {
  font-family: var(--font-serif, serif);
  font-style: normal;
  color: var(--c-muted);
}

.card-arrow {
  position: absolute;
  right: 14px;
  bottom: 12px;
  font-size: 11px;
  color: var(--c-muted);
  letter-spacing: 1px;
  background: var(--c-paper);
  padding-left: 8px;
}

/* 全部记录次级入口 */
.all-link {
  margin: 28px 0 8px;
  text-align: center;
  font-size: 12.5px;
  color: #999;
  cursor: pointer;
  letter-spacing: 1px;
  transition: color 0.15s;
}
.all-link:hover { color: var(--c-muted); }
</style>
