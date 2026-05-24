<script setup lang="ts">
/**
 * 心境墙卡片详情页 /wall/:id
 *
 * 区块顺序（spec 4.2）：
 *   时刻 + 视角  →  那时的一句话  →  那时被照见到的角度（折叠）
 *   →  那时的一问（仅有回答时显示）  →  今日句子（仅命中白名单时显示）
 *   →  操作区（分享 / 删除 / 返回）
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getWallCard, deleteWallCard } from '../api/divination';
import type { WallFullCard } from '../api/types';

const props = defineProps<{ id: string }>();
const router = useRouter();

const card    = ref<WallFullCard | null>(null);
const loading = ref(true);
const error   = ref('');

// 解读折叠状态
const readingOpen = ref(false);

// 删除二次确认
const deleteConfirm = ref(false);
const deleting      = ref(false);

onMounted(async () => {
  try {
    card.value = await getWallCard(props.id);
  } catch (e: any) {
    error.value = e.message || '加载失败';
  } finally {
    loading.value = false;
  }
});

async function confirmDelete() {
  if (!deleteConfirm.value) {
    deleteConfirm.value = true;
    return;
  }
  deleting.value = true;
  try {
    await deleteWallCard(props.id);
    router.replace('/wall');
  } catch {
    deleteConfirm.value = false;
    deleting.value = false;
  }
}

// 意象 key → 淡色铺底颜色
const IMAGERY_BG: Record<string, string> = {
  heaven:   'linear-gradient(160deg, #F5F3EE 0%, #E8E4DC 100%)',
  earth:    'linear-gradient(160deg, #F0EDE8 0%, #E4DDD4 100%)',
  water:    'linear-gradient(160deg, #EEF1F5 0%, #D8E4EE 100%)',
  fire:     'linear-gradient(160deg, #F5EEE8 0%, #EDD8C8 100%)',
  thunder:  'linear-gradient(160deg, #F2EFF0 0%, #E4DDE2 100%)',
  wind:     'linear-gradient(160deg, #EEFAF0 0%, #D4ECD8 100%)',
  mountain: 'linear-gradient(160deg, #F0EEF0 0%, #E0DCDE 100%)',
  lake:     'linear-gradient(160deg, #EEF4F5 0%, #D4E8EC 100%)',
};

function heroBg(key: string | null): string {
  if (!key) return IMAGERY_BG.heaven;
  const base = key.split('+')[0];
  return IMAGERY_BG[base] ?? IMAGERY_BG.heaven;
}

// 意象标签文字
const IMAGERY_LABEL: Record<string, string> = {
  heaven: '天', earth: '地', water: '水', fire: '火',
  thunder: '雷', wind: '风', mountain: '山', lake: '泽',
};
function imageryText(key: string | null): string {
  if (!key) return '';
  return key.split('+').map(k => IMAGERY_LABEL[k] ?? '').filter(Boolean).join('·');
}
</script>

<template>
  <main class="wall-detail">

    <!-- 加载 / 错误 -->
    <div v-if="loading" class="center muted" style="padding: 80px 0">读取中…</div>
    <div v-else-if="error || !card" class="center muted" style="padding: 80px 0">
      {{ error || '卡片不存在' }}
      <br>
      <button class="btn btn-ghost" style="margin-top: 16px" @click="router.push('/wall')">
        返回心境墙
      </button>
    </div>

    <template v-else>
      <!-- ── 意象铺底头部 ─────────────────────────────────── -->
      <div class="hero" :style="{ background: heroBg(card.primaryImageryKey) }">
        <div class="hero-inner">
          <div class="hero-imagery">{{ imageryText(card.primaryImageryKey) }}</div>
          <div class="hero-date">{{ card.dateLabel }}</div>
          <div class="hero-topic">{{ card.topic }}</div>
        </div>
      </div>

      <div class="content">

        <!-- ── 那时的一句话 ──────────────────────────────── -->
        <section class="section oneliner-section">
          <div class="section-label">那时的一句话</div>
          <blockquote class="oneliner">「{{ card.oneLiner }}」</blockquote>
        </section>

        <div class="divider" />

        <!-- ── 那时被照见到的角度（折叠）────────────────── -->
        <section class="section reading-section">
          <button class="fold-toggle" @click="readingOpen = !readingOpen">
            <span class="section-label">那时被照见到的角度</span>
            <span class="fold-icon">{{ readingOpen ? '▾' : '▸' }}</span>
          </button>

          <transition name="expand">
            <div v-if="readingOpen" class="reading-body">
              <div class="reading-item">
                <div class="reading-tag">此刻</div>
                <p class="reading-text">{{ card.reading.present }}</p>
              </div>
              <div class="reading-item">
                <div class="reading-tag">一个转念</div>
                <p class="reading-text">{{ card.reading.pivot }}</p>
              </div>
              <div class="reading-item">
                <div class="reading-tag">可以试试</div>
                <p class="reading-text">{{ card.reading.tryThis }}</p>
              </div>
              <div class="reading-item">
                <div class="reading-tag">金句</div>
                <p class="reading-text reading-oneline">{{ card.reading.oneLine }}</p>
              </div>
            </div>
          </transition>
        </section>

        <!-- ── 那时的一问（仅有回答时显示）──────────────── -->
        <template v-if="card.answer">
          <div class="divider" />
          <section class="section qa-section">
            <div class="section-label">那时的一问</div>
            <div v-if="card.question" class="qa-question">{{ card.question }}</div>
            <div class="qa-answer">{{ card.answer }}</div>
          </section>
        </template>

        <!-- ── 今日句子（爻辞白名单，仅命中时显示）──────── -->
        <template v-if="card.displayYaoText">
          <div class="divider" />
          <section class="section yao-section">
            <div class="yao-text">{{ card.displayYaoText }}</div>
          </section>
        </template>

        <div class="divider" />

        <!-- ── 操作区 ─────────────────────────────────────── -->
        <section class="action-bar">
          <button class="back-btn" @click="router.push('/wall')">← 返回</button>
          <div class="action-right">
            <button
              class="delete-btn"
              :class="{ confirm: deleteConfirm }"
              :disabled="deleting"
              @click="confirmDelete"
            >
              {{ deleteConfirm ? '确认删除？' : '删除' }}
            </button>
            <button v-if="deleteConfirm" class="cancel-btn" @click="deleteConfirm = false">
              取消
            </button>
          </div>
        </section>

      </div><!-- /content -->
    </template>
  </main>
</template>

<style scoped>
.wall-detail {
  min-height: 100vh;
  background: var(--c-bg);
}

/* ── hero 意象区 ─────────────────────────────────── */
.hero {
  width: 100%;
  padding: 48px 24px 36px;
  box-sizing: border-box;
}
.hero-inner {
  max-width: 480px;
  margin: 0 auto;
}
.hero-imagery {
  font-family: var(--font-serif, serif);
  font-size: 13px;
  color: rgba(80, 60, 40, 0.35);
  letter-spacing: 4px;
  margin-bottom: 20px;
}
.hero-date {
  font-size: 12px;
  color: rgba(60, 45, 30, 0.55);
  letter-spacing: 1.5px;
  margin-bottom: 8px;
}
.hero-topic {
  display: inline-block;
  font-size: 11.5px;
  color: var(--c-accent);
  background: rgba(158, 123, 107, 0.12);
  border-radius: 999px;
  padding: 3px 12px;
  letter-spacing: 0.8px;
}

/* ── 正文区 ──────────────────────────────────────── */
.content {
  max-width: 480px;
  margin: 0 auto;
  padding: 28px 24px 60px;
  box-sizing: border-box;
}

.divider {
  border-top: 1px dashed var(--c-line);
  margin: 24px 0;
}

.section { }
.section-label {
  font-size: 11px;
  color: var(--c-muted);
  letter-spacing: 2px;
  margin-bottom: 12px;
}

/* ── 一句话 ──────────────────────────────────────── */
.oneliner {
  margin: 0;
  padding: 0;
  border: none;
  font-family: var(--font-serif, serif);
  font-size: 20px;
  line-height: 1.65;
  letter-spacing: 1px;
  color: var(--c-ink);
}

/* ── 解读折叠 ────────────────────────────────────── */
.fold-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}
.fold-icon {
  font-size: 13px;
  color: var(--c-muted);
}

.reading-body {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}
.reading-item { }
.reading-tag {
  font-size: 10.5px;
  color: var(--c-muted);
  letter-spacing: 1.5px;
  margin-bottom: 5px;
}
.reading-text {
  margin: 0;
  font-size: 14px;
  color: var(--c-ink-soft);
  line-height: 1.85;
  letter-spacing: 0.3px;
}
.reading-oneline {
  font-family: var(--font-serif, serif);
  color: var(--c-ink);
  font-size: 15px;
}

/* 折叠展开动画 */
.expand-enter-active,
.expand-leave-active { transition: opacity 0.22s, max-height 0.28s ease; max-height: 600px; }
.expand-enter-from,
.expand-leave-to     { opacity: 0; max-height: 0; }

/* ── 追问区 ──────────────────────────────────────── */
.qa-question {
  font-size: 13px;
  color: var(--c-muted);
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  padding-left: 10px;
  border-left: 2px solid var(--c-line);
}
.qa-answer {
  font-size: 15px;
  color: var(--c-ink);
  line-height: 1.8;
  letter-spacing: 0.3px;
}

/* ── 爻辞白名单 ──────────────────────────────────── */
.yao-section {
  padding: 32px 0;
  text-align: center;
}
.yao-text {
  font-family: var(--font-serif, serif);
  font-size: 18px;
  color: #666;
  letter-spacing: 4px;
  line-height: 2;
}

/* ── 操作区 ──────────────────────────────────────── */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
}
.back-btn {
  background: transparent;
  border: none;
  color: var(--c-muted);
  font-size: 14px;
  cursor: pointer;
  letter-spacing: 0.5px;
  font-family: inherit;
  padding: 0;
}
.action-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.delete-btn {
  border: 1px solid #ddd;
  background: transparent;
  color: #aaa;
  font-size: 12.5px;
  border-radius: 6px;
  padding: 6px 14px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.5px;
  transition: border-color 0.15s, color 0.15s;
}
.delete-btn.confirm {
  border-color: #c0392b;
  color: #c0392b;
}
.delete-btn:hover:not(.confirm) {
  border-color: #bbb;
  color: #888;
}
.cancel-btn {
  border: none;
  background: transparent;
  color: var(--c-muted);
  font-size: 12.5px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.5px;
}

.center { text-align: center; }
.muted  { color: var(--c-muted); }
</style>
