<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getDivination,
  sendFeedback,
  saveToWall,
  saveAnswer,
  generateQuestion,
  CrisisDetectedError,
} from '../api/divination';
import type { PublicDivination } from '../api/types';

const route = useRoute();
const router = useRouter();

const data = ref<PublicDivination | null>(null);
const loading = ref(true);
const error = ref('');
const feedback = ref<'up' | 'down' | null>(null);
const toast = ref('');

// 追问 + 心境墙保存（合并为一个动作）
const questionLoading = ref(false);
const answerText      = ref('');
const isSaved         = ref(false);
const saving          = ref(false);

const id = computed(() => String(route.params.id));

function stripPrefix(text: string): string {
  return text.replace(/^\s*(?:此刻|一个转念|可以试试|一句话|此刻的你)\s*[:：]\s*/, '');
}

async function load() {
  loading.value = true;
  try {
    const raw = await getDivination(id.value);
    data.value = {
      ...raw,
      reading: {
        present: stripPrefix(raw.reading.present),
        pivot:   stripPrefix(raw.reading.pivot),
        tryThis: stripPrefix(raw.reading.tryThis),
        oneLine: stripPrefix(raw.reading.oneLine),
      },
    };
    feedback.value = data.value?.feedback ?? null;

    // 同步已保存状态 + 回填用户已写过的回答
    if (data.value?.isSaved) isSaved.value = true;
    if (data.value?.answer) answerText.value = data.value.answer;

    // 后台异步生成追问问题（不阻塞主解读阅读）
    if (!data.value?.question) fetchQuestion();
  } catch (err: any) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function fetchQuestion() {
  if (questionLoading.value) return;
  questionLoading.value = true;
  try {
    const updated = await generateQuestion(id.value);
    if (data.value) {
      data.value = { ...data.value, question: updated.question, questionSource: updated.questionSource };
    }
  } catch {
    // 失败静默，问题区不会展示
  } finally {
    questionLoading.value = false;
  }
}

async function chooseFeedback(value: 'up' | 'down') {
  if (feedback.value === value) return;
  feedback.value = value;
  try {
    await sendFeedback(id.value, value);
    showToast('感谢你的反馈');
  } catch {
    /* best-effort */
  }
}

/** 收进心境墙：先写回答（若有），再标记 saved。命中危机词跳关怀页。 */
async function handleSaveMoment() {
  if (saving.value || isSaved.value) return;
  saving.value = true;
  try {
    const text = answerText.value.trim();
    if (text) {
      // 走 answer 端点（含危机词检测）
      await saveAnswer(id.value, text);
    }
    await saveToWall(id.value);
    isSaved.value = true;
    showToast('已收进心境墙 ✓');
  } catch (err) {
    if (err instanceof CrisisDetectedError) {
      router.push('/care');
      return;
    }
    showToast((err as Error)?.message || '保存失败，请稍后再试');
  } finally {
    saving.value = false;
  }
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(text: string) {
  toast.value = text;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = ''; }, 2200);
}

onMounted(() => { load(); });
</script>

<template>
  <main class="page reading-page">
    <button class="back" @click="router.push('/')">← 回到首页</button>

    <div v-if="loading" class="loading-state">照见浮现中…</div>
    <div v-else-if="error" class="error-text">{{ error }}</div>

    <template v-else-if="data">
      <!-- Top -->
      <div class="topic-hat">今日视角 · {{ data.topic }}</div>

      <!-- 4-section card -->
      <article class="card">
        <section class="section">
          <h3 class="section-title">此刻</h3>
          <p class="section-body">{{ data.reading.present }}</p>
        </section>
        <div class="section-divider" />
        <section class="section">
          <h3 class="section-title">一个转念</h3>
          <p class="section-body">{{ data.reading.pivot }}</p>
        </section>
        <div class="section-divider" />
        <section class="section">
          <h3 class="section-title">可以试试</h3>
          <p class="section-body">{{ data.reading.tryThis }}</p>
        </section>
        <div class="section-divider" />
        <section class="section section--oneline">
          <p class="oneline">{{ data.reading.oneLine }}</p>
        </section>
      </article>

      <!-- Feedback -->
      <div class="feedback">
        <span class="feedback-q">这个视角对你有启发吗？</span>
        <div class="feedback-btns">
          <button class="feedback-btn" :class="{ 'is-active': feedback === 'up' }"   @click="chooseFeedback('up')">👍 有</button>
          <button class="feedback-btn" :class="{ 'is-active': feedback === 'down' }" @click="chooseFeedback('down')">👎 没有</button>
        </div>
      </div>

      <!-- ── 此刻一问（内联，弱化呈现） ── -->
      <section class="ask-block" v-if="data.question || questionLoading">
        <p class="ask-eyebrow">◌ 此刻一问</p>
        <p v-if="questionLoading && !data.question" class="ask-loading">问题生成中…</p>
        <p v-else class="ask-question">{{ data.question }}</p>

        <textarea
          v-if="data.question"
          v-model="answerText"
          class="ask-input"
          placeholder="对自己说点真心话…"
          rows="4"
          maxlength="500"
          :disabled="isSaved || saving"
        />
        <p v-if="!isSaved && answerText.length > 0" class="ask-counter">{{ answerText.length }} / 500</p>
      </section>

      <!-- 单一主 CTA：收进心境墙（写了回答会一并保存） -->
      <button
        class="save-btn"
        :class="{ 'is-saved': isSaved }"
        :disabled="saving || isSaved"
        @click="handleSaveMoment"
      >
        <span v-if="!isSaved">{{ saving ? '保存中…' : '🔖 收进心境墙' }}</span>
        <span v-else class="saved-label">✓ 已收进心境墙</span>
      </button>

      <p v-if="isSaved" class="wall-link" @click="router.push('/wall')">
        去心境墙看看 →
      </p>

      <!-- ── 页脚（温馨提示弱化） ── -->
      <footer class="page-foot">
        <p class="foot-disclaimer">
          仅供参考。若你正经历持续的痛苦，请联系专业的心理援助。
        </p>
        <span class="foot-link" @click="router.push('/')">返回首页 →</span>
      </footer>

      <!-- Debug panel — hexagram inspiration + cast trace -->
      <div v-if="data.benGuaName || data.castTrace" class="debug-panel">
        <div class="debug-label">DEBUG · 起卦过程</div>
        <div v-if="data.benGuaName" class="debug-row">
          <span class="debug-key">结果</span>
          <span class="debug-val">
            {{ data.benGuaName }}卦 {{ data.yaoPosName }}爻动 → {{ data.bianGuaName }}卦
          </span>
        </div>
        <template v-if="data.castTrace">
          <div class="debug-divider" />
          <div class="debug-row">
            <span class="debug-key">起卦时刻</span>
            <span class="debug-val">{{ data.castTrace.castAt }}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">时 / 分</span>
            <span class="debug-val">{{ data.castTrace.hour }} 时  {{ data.castTrace.minute }} 分</span>
          </div>
          <div class="debug-divider" />
          <div class="debug-row">
            <span class="debug-key">上卦 a = hour mod 8</span>
            <span class="debug-val">{{ data.castTrace.hour }} mod 8 = {{ data.castTrace.a }} → {{ data.castTrace.upperTrigramName }}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">下卦 b = minute mod 8</span>
            <span class="debug-val">{{ data.castTrace.minute }} mod 8 = {{ data.castTrace.b }} → {{ data.castTrace.lowerTrigramName }}</span>
          </div>
          <div class="debug-row">
            <span class="debug-key">动爻 c = (hour+minute) mod 6</span>
            <span class="debug-val">({{ data.castTrace.hour }}+{{ data.castTrace.minute }}) mod 6 = {{ data.castTrace.c }}</span>
          </div>
        </template>
      </div>
    </template>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </main>
</template>

<style scoped>
.back {
  display: block;
  border: none;
  background: transparent;
  color: var(--c-muted);
  padding: 0 0 20px;
  cursor: pointer;
  font-size: 14px;
}
.loading-state {
  text-align: center;
  padding: 80px 0;
  color: var(--c-muted);
  letter-spacing: 4px;
}
.error-text { color: var(--c-warn); text-align: center; padding: 30px 0; }

.topic-hat {
  text-align: center;
  font-size: 13px;
  color: var(--c-muted);
  letter-spacing: 2px;
  margin-bottom: 14px;
}

/* Reading card */
.card {
  background: var(--c-paper);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  padding: 24px 22px;
  box-shadow: var(--shadow-soft);
}
.section { padding: 6px 0; }
.section-title {
  font-size: 13px;
  color: #9E7B6B;
  letter-spacing: 4px;
  margin: 0 0 12px;
  font-weight: 500;
}
.section-body {
  margin: 0;
  font-size: 15px;
  line-height: 1.9;
  color: #4B4B4B;
  letter-spacing: 0.3px;
}
.section-divider {
  height: 1px;
  border-top: 1px dashed var(--c-line);
  margin: 16px 0;
}
.section--oneline { padding-top: 0; }
.oneline {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--c-ink);
  text-align: center;
  letter-spacing: 1.5px;
  line-height: 1.8;
  padding: 14px 8px;
}

/* Feedback */
.feedback {
  margin-top: 20px;
  text-align: center;
}
.feedback-q {
  display: block;
  font-size: 12px;
  color: var(--c-muted);
  letter-spacing: 1px;
  margin-bottom: 10px;
}
.feedback-btns { display: inline-flex; gap: 10px; }
.feedback-btn {
  border: 1px solid var(--c-line);
  background: var(--c-paper);
  color: var(--c-ink-soft);
  border-radius: 999px;
  padding: 6px 16px;
  font-size: 12.5px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: background 0.18s, border-color 0.18s, color 0.18s;
  font-family: inherit;
}
.feedback-btn:hover { background: var(--c-bg-soft); }
.feedback-btn.is-active {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: rgba(158, 123, 107, 0.06);
}

/* ── 此刻一问（弱化） ── */
.ask-block {
  margin-top: 28px;
  padding: 18px 18px 16px;
  border-top: 1px dashed var(--c-line);
  border-bottom: 1px dashed var(--c-line);
}
.ask-eyebrow {
  font-size: 11px;
  color: var(--c-muted);
  letter-spacing: 4px;
  margin: 0 0 10px;
}
.ask-loading {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--c-muted);
  letter-spacing: 1.5px;
  font-style: italic;
}
.ask-question {
  margin: 0 0 14px;
  font-size: 15px;
  color: var(--c-ink-soft);
  letter-spacing: 1px;
  line-height: 1.85;
}
.ask-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--c-line);
  background: var(--c-paper);
  color: var(--c-ink);
  border-radius: var(--r-md);
  font-family: inherit;
  font-size: 14.5px;
  padding: 12px 14px;
  line-height: 1.8;
  letter-spacing: 0.3px;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ask-input:focus {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(158,123,107,0.07);
}
.ask-input:disabled { opacity: 0.7; }
.ask-input::placeholder { color: var(--c-muted); letter-spacing: 1px; }
.ask-counter {
  margin: 6px 0 0;
  text-align: right;
  font-size: 11px;
  color: var(--c-muted);
}

/* 主 CTA */
.save-btn {
  display: block;
  width: 100%;
  margin-top: 22px;
  padding: 14px 16px;
  border: 1px solid var(--c-ink);
  background: var(--c-ink);
  color: #F9F5F0;
  border-radius: var(--r-md);
  font-size: 14px;
  letter-spacing: 2px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.25s, color 0.25s, border-color 0.25s, transform 0.2s;
}
.save-btn:hover:not(:disabled):not(.is-saved) { opacity: 0.92; }
.save-btn:disabled { cursor: default; opacity: 0.7; }
.save-btn.is-saved {
  background: var(--c-paper);
  color: var(--c-accent);
  border-color: var(--c-accent);
  animation: savePop 0.28s ease both;
}
.saved-label { letter-spacing: 2px; }
@keyframes savePop {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.97); }
  100% { transform: scale(1); }
}

.wall-link {
  margin: 12px 0 0;
  text-align: center;
  font-size: 12.5px;
  color: var(--c-muted);
  letter-spacing: 1px;
  cursor: pointer;
  transition: color 0.15s;
}
.wall-link:hover { color: var(--c-accent); }

/* 页脚（温馨提示弱化） */
.page-foot {
  margin-top: 36px;
  padding-top: 20px;
  border-top: 1px dashed var(--c-line);
  text-align: center;
}
.foot-disclaimer {
  margin: 0 0 10px;
  font-size: 11px;
  color: var(--c-muted);
  letter-spacing: 0.5px;
  line-height: 1.8;
  opacity: 0.85;
}
.foot-link {
  display: inline-block;
  font-size: 11.5px;
  color: #999;
  letter-spacing: 1px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.15s;
}
.foot-link:hover { color: var(--c-muted); }

/* Debug panel */
.debug-panel {
  margin-top: 24px;
  padding: 14px 16px;
  border: 1px dashed #C4B8AC;
  border-radius: var(--r-md);
  background: rgba(212, 201, 184, 0.12);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.debug-label {
  font-size: 10px;
  letter-spacing: 2px;
  color: #9E7B6B;
  margin-bottom: 8px;
  opacity: 0.7;
}
.debug-divider { border-top: 1px dashed #C4B8AC; margin: 8px 0; opacity: 0.5; }
.debug-row {
  display: flex; gap: 8px; align-items: baseline;
  margin-bottom: 5px; flex-wrap: wrap;
}
.debug-key {
  font-size: 10px; color: #9E7B6B; letter-spacing: 0.5px;
  white-space: nowrap; min-width: 140px; flex-shrink: 0;
}
.debug-val { font-size: 11.5px; color: #6B5848; letter-spacing: 0.5px; word-break: break-all; }

/* Toast */
.toast {
  position: fixed;
  left: 50%; bottom: 64px;
  transform: translateX(-50%);
  background: rgba(40, 30, 20, 0.85);
  color: #F9F5F0;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13px;
  letter-spacing: 1px;
  z-index: 300;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.22s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
