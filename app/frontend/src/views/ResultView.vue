<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getDivination, castDivination, sendFeedback, saveToWall, saveCareNote } from '../api/divination';
import { useSessionStore } from '../stores/session';
import type { PublicDivination, Topic } from '../api/types';

const route = useRoute();
const router = useRouter();
const store = useSessionStore();

const data = ref<PublicDivination | null>(null);
const loading = ref(true);
const error = ref('');
const feedback = ref<'up' | 'down' | null>(null);
const reroll = ref(false);
const toast = ref('');

// 心境墙保存状态
const isSaved    = ref(false);
const saving     = ref(false);
const noteExpanded = ref(false);
const noteText   = ref('');
const noteSaving = ref(false);
const noteSaved  = ref(false);

const id = computed(() => String(route.params.id));

// Strip any leading "此刻：" / "一个转念：" / "可以试试：" / "一句话：" prefixes
// that the AI may include despite the prompt.
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
    // 已保存过则直接进入已保存状态
    if (data.value?.isSaved) {
      isSaved.value = true;
      if (data.value.careNote) noteSaved.value = true;
    }
  } catch (err: any) {
    error.value = err?.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function chooseFeedback(value: 'up' | 'down') {
  if (feedback.value === value) return;
  feedback.value = value;
  try {
    await sendFeedback(id.value, value);
    showToast('感谢你的反馈');
  } catch {
    // best-effort; UI keeps the selection
  }
}

async function reCast() {
  if (!data.value || reroll.value) return;
  reroll.value = true;
  error.value = '';
  try {
    const next = await castDivination({ topic: data.value.topic as Topic });
    router.replace(`/result/${next.id}`);
  } catch (err: any) {
    const msg = err?.message || '换一个视角失败，请稍后再试';
    if (msg.includes('上限')) {
      showToast('今日已达上限，明天再来吧');
    } else {
      showToast(msg);
    }
  } finally {
    reroll.value = false;
  }
}

async function handleSave() {
  if (isSaved.value || saving.value) return;
  saving.value = true;
  try {
    await saveToWall(id.value);
    isSaved.value = true;
    // 展开可选关怀语区域
    noteExpanded.value = true;
  } catch {
    showToast('保存失败，请稍后再试');
  } finally {
    saving.value = false;
  }
}

async function handleSaveNote() {
  const text = noteText.value.trim();
  if (!text || noteSaving.value) return;
  noteSaving.value = true;
  try {
    await saveCareNote(id.value, text);
    noteSaved.value = true;
    noteExpanded.value = false;
  } catch {
    showToast('保存失败，请稍后再试');
  } finally {
    noteSaving.value = false;
  }
}

function handleSkipNote() {
  noteExpanded.value = false;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
function showToast(text: string) {
  toast.value = text;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.value = ''; }, 2200);
}

onMounted(() => {
  load();
  // Keep store.ask.topic populated so a reload doesn't lose the topic chip.
  // (Topic comes back via the API record itself, so no action needed.)
});
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
          <button
            class="feedback-btn"
            :class="{ 'is-active': feedback === 'up' }"
            @click="chooseFeedback('up')"
            aria-label="有启发"
          >👍 有</button>
          <button
            class="feedback-btn"
            :class="{ 'is-active': feedback === 'down' }"
            @click="chooseFeedback('down')"
            aria-label="没有启发"
          >👎 没有</button>
        </div>
      </div>

      <!-- Disclaimer (精简版) -->
      <div class="disclaimer-box">
        <p class="disclaimer-title">💡 温馨提示</p>
        <p class="disclaimer-text">
          这只是一个让你换角度看看的小工具。<br>
          如果你正经历持续的痛苦，请联系专业的心理援助。
        </p>
      </div>

      <!-- Action section -->
      <div class="actions">

        <!-- 主 CTA：保存 / 已保存 -->
        <button
          class="action-btn action-primary save-btn"
          :class="{ 'is-saved': isSaved }"
          :disabled="saving"
          @click="handleSave"
        >
          <span v-if="!isSaved">{{ saving ? '保存中…' : '🔖 把这一刻收进我的心境墙' }}</span>
          <span v-else class="saved-label">✓ 已收进心境墙</span>
        </button>

        <!-- 可选关怀语区域（保存后展开） -->
        <div class="note-area" :class="{ 'is-open': noteExpanded }">
          <div class="note-inner">
            <p class="note-hint">想给现在的自己加一句话吗？一个词也可以。</p>
            <input
              v-model="noteText"
              class="note-input"
              type="text"
              placeholder="比如：松了一点 / 先这样吧 / 看见了……"
              maxlength="50"
              :disabled="noteSaving"
            />
            <div class="note-btns">
              <button
                class="note-btn note-save"
                :disabled="!noteText.trim() || noteSaving"
                @click="handleSaveNote"
              >{{ noteSaving ? '保存中…' : '保存这句话' }}</button>
              <button class="note-btn note-skip" @click="handleSkipNote">跳过</button>
            </div>
          </div>
        </div>

        <!-- 保存后：已记下反馈 + 心境墙入口 -->
        <p v-if="noteSaved" class="noted-feedback">已记下 ✓</p>
        <p v-if="isSaved" class="wall-link" @click="router.push('/wall')">
          随时可在「心境墙」回看这一刻 →
        </p>

        <!-- 次 CTA -->
        <button class="action-btn" :disabled="reroll" @click="reCast">
          {{ reroll ? '生成中…' : '换一个视角' }}
        </button>

        <!-- 三级出口：文字链 -->
        <span class="home-link" @click="router.push('/')">返回首页</span>

      </div>

      <!-- Debug panel — hexagram inspiration + cast trace (dev only) -->
      <div v-if="data.benGuaName || data.castTrace" class="debug-panel">
        <div class="debug-label">DEBUG · 起卦过程</div>

        <!-- 卦象灵感 -->
        <div v-if="data.benGuaName" class="debug-row">
          <span class="debug-key">结果</span>
          <span class="debug-val">
            {{ data.benGuaName }}卦 {{ data.yaoPosName }}爻动 → {{ data.bianGuaName }}卦
          </span>
        </div>

        <!-- 计算轨迹 -->
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

    <!-- Toast -->
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

/* Main card */
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
  margin-top: 22px;
  text-align: center;
}
.feedback-q {
  display: block;
  font-size: 12px;
  color: var(--c-muted);
  letter-spacing: 1px;
  margin-bottom: 10px;
}
.feedback-btns {
  display: inline-flex;
  gap: 10px;
}
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

/* Disclaimer */
.disclaimer-box {
  margin-top: 28px;
  border: 1px dashed var(--c-line);
  border-radius: var(--r-md);
  padding: 16px 18px;
  background: var(--c-bg-soft);
}
.disclaimer-title {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--c-ink-soft);
  letter-spacing: 1.5px;
  font-weight: 500;
}
.disclaimer-text {
  margin: 0;
  font-size: 11.5px;
  color: var(--c-muted);
  line-height: 1.85;
  letter-spacing: 0.3px;
}

/* Action buttons */
.actions {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.action-btn {
  border: 1px solid var(--c-line);
  background: var(--c-paper);
  color: var(--c-ink);
  border-radius: var(--r-md);
  padding: 14px 16px;
  font-size: 14px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s;
  font-family: inherit;
}
.action-btn:hover:not(:disabled) {
  background: var(--c-bg-soft);
  border-color: var(--c-accent);
}
.action-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.action-primary {
  background: var(--c-ink);
  color: #F9F5F0;
  border-color: var(--c-ink);
}
.action-primary:hover:not(:disabled) {
  background: var(--c-ink);
  border-color: var(--c-ink);
  opacity: 0.92;
}

/* 保存主 CTA 状态 */
.save-btn { transition: background 0.25s, color 0.25s, border-color 0.25s, transform 0.2s; }
.save-btn.is-saved {
  background: var(--c-paper);
  color: var(--c-accent);
  border-color: var(--c-accent);
  animation: savePop 0.28s ease both;
}
@keyframes savePop {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.97); }
  100% { transform: scale(1); }
}
.saved-label { letter-spacing: 1.5px; }

/* 可选关怀语区域 */
.note-area {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.25s ease-out, opacity 0.22s ease-out;
  opacity: 0;
}
.note-area.is-open {
  max-height: 200px;
  opacity: 1;
}
.note-inner {
  background: var(--c-bg-soft);
  border: 1px dashed var(--c-line);
  border-radius: var(--r-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.note-hint {
  margin: 0;
  font-size: 12px;
  color: var(--c-muted);
  letter-spacing: 0.5px;
  line-height: 1.6;
}
.note-input {
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  background: var(--c-paper);
  color: var(--c-ink);
  font-family: inherit;
  font-size: 14px;
  padding: 9px 12px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  letter-spacing: 0.3px;
  transition: border-color 0.15s;
}
.note-input:focus { border-color: var(--c-accent); }
.note-input::placeholder { color: var(--c-muted); }
.note-btns {
  display: flex;
  gap: 8px;
}
.note-btn {
  border-radius: var(--r-md);
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.5px;
  transition: background 0.15s, border-color 0.15s;
}
.note-save {
  border: 1px solid var(--c-ink);
  background: var(--c-ink);
  color: #F9F5F0;
  flex: 1;
}
.note-save:disabled { opacity: 0.5; cursor: default; }
.note-skip {
  border: 1px solid var(--c-line);
  background: transparent;
  color: var(--c-muted);
}
.note-skip:hover { background: var(--c-paper); }

/* 已记下 + 心境墙入口 */
.noted-feedback {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--c-accent);
  letter-spacing: 2px;
  animation: fadeInUp 0.3s ease both;
}
.wall-link {
  margin: 0;
  text-align: center;
  font-size: 12.5px;
  color: var(--c-muted);
  letter-spacing: 1px;
  cursor: pointer;
  transition: color 0.15s;
}
.wall-link:hover { color: var(--c-accent); }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 返回首页文字链 */
.home-link {
  display: block;
  text-align: center;
  margin-top: 14px;
  font-size: 12.5px;
  color: #999;
  cursor: pointer;
  letter-spacing: 1px;
  transition: color 0.15s;
}
.home-link:hover { color: var(--c-muted); }

/* Debug panel */
.debug-panel {
  margin-top: 32px;
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
.debug-divider {
  border-top: 1px dashed #C4B8AC;
  margin: 8px 0;
  opacity: 0.5;
}
.debug-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 5px;
  flex-wrap: wrap;
}
.debug-key {
  font-size: 10px;
  color: #9E7B6B;
  letter-spacing: 0.5px;
  white-space: nowrap;
  min-width: 140px;
  flex-shrink: 0;
}
.debug-val {
  font-size: 11.5px;
  color: #6B5848;
  letter-spacing: 0.5px;
  word-break: break-all;
}

/* Toast */
.toast {
  position: fixed;
  left: 50%;
  bottom: 64px;
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
