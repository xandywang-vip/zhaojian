<script setup lang="ts">
/**
 * 「按住默念」仪式页
 *
 * 主题选择 → 此页（按住圆点 9 秒，三次呼吸）→ 起卦页
 * 目的：让用户在心里把具体问题想清楚、默念三遍，重建仪式感。
 * 纯前端 UI，不发起任何网络请求。
 */
import { ref, computed, onUnmounted, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';

const router = useRouter();
const store = useSessionStore();

const TOTAL_DURATION  = 9000;  // 9 秒 = 三次呼吸
const MIN_VALID_PRESS = 1000;  // 1 秒以下视为误触

const isPressing       = ref(false);
const pressStartTime   = ref(0);
const elapsed          = ref(0);
const completed        = ref(false);
const showTooEarly     = ref(false);
const showExtraGuide   = ref(false);   // 连续 3 次太早松手后的明确引导
const failedAttempts   = ref(0);

let rafId:          number | null = null;
let completeTimer:  ReturnType<typeof setTimeout> | null = null;
let tooEarlyTimer:  ReturnType<typeof setTimeout> | null = null;

/** 进度环 dasharray：2 * PI * r (r=80 → 502.4) */
const CIRCUMFERENCE = 502.4;
const progressOffset = computed(() => {
  const pct = Math.min(elapsed.value / TOTAL_DURATION, 1);
  return CIRCUMFERENCE * (1 - pct);
});

const currentCountLabel = computed(() => {
  if (elapsed.value < 3000) return '第一次';
  if (elapsed.value < 6000) return '第二次';
  return '第三次';
});

function startPress() {
  if (isPressing.value || completed.value) return;
  isPressing.value = true;
  pressStartTime.value = Date.now();
  elapsed.value = 0;
  showTooEarly.value = false;
  tick();
}

function tick() {
  if (!isPressing.value) return;
  elapsed.value = Date.now() - pressStartTime.value;
  if (elapsed.value >= TOTAL_DURATION) {
    handleComplete();
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function endPress() {
  if (!isPressing.value) return;
  const duration = Date.now() - pressStartTime.value;
  isPressing.value = false;
  if (rafId) cancelAnimationFrame(rafId);

  if (duration >= TOTAL_DURATION) return;  // 已完成路径走 handleComplete

  // 太早松手
  elapsed.value = 0;
  if (duration > MIN_VALID_PRESS) {
    showTooEarly.value = true;
    failedAttempts.value++;
    if (failedAttempts.value >= 3) showExtraGuide.value = true;
    if (tooEarlyTimer) clearTimeout(tooEarlyTimer);
    tooEarlyTimer = setTimeout(() => { showTooEarly.value = false; }, 2500);
  }
}

function handleComplete() {
  if (rafId) cancelAnimationFrame(rafId);
  isPressing.value = false;
  completed.value = true;
  completeTimer = setTimeout(() => {
    router.replace('/cast');
  }, 1800);
}

function skipRitual() {
  if (rafId) cancelAnimationFrame(rafId);
  router.replace('/cast');
}

onMounted(() => {
  // 没选主题直接进来 → 退回选择页
  if (!store.ask.topic) {
    router.replace('/ask');
  }
});

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  if (completeTimer)  clearTimeout(completeTimer);
  if (tooEarlyTimer)  clearTimeout(tooEarlyTimer);
});
</script>

<template>
  <main class="ritual-page">
    <!-- 跳过按钮：极小克制 -->
    <button v-if="!completed" class="skip-btn" @click="skipRitual">跳过此次</button>

    <transition name="fade-content">
      <section v-if="!completed" class="ritual-content" :class="{ pressing: isPressing }">
        <p class="ritual-prompt">
          在心里默默想着你想问的那件事<br>
          按住下方圆点，跟着呼吸默念三遍
        </p>
        <p class="ritual-hint">不必说出口，让它慢慢沉下来</p>

        <div class="ritual-button-wrap">
          <div class="ring ring-1" :class="{ expanded: isPressing }" />
          <div class="ring ring-2" :class="{ expanded: isPressing }" />
          <svg class="progress-ring" viewBox="0 0 160 160" aria-hidden="true">
            <circle
              cx="80" cy="80" r="80"
              fill="none"
              stroke="#A8453E"
              stroke-width="1.5"
              :stroke-dasharray="CIRCUMFERENCE"
              :stroke-dashoffset="progressOffset"
            />
          </svg>
          <button
            class="ritual-btn"
            :class="{ pressing: isPressing }"
            @mousedown="startPress"
            @mouseup="endPress"
            @mouseleave="endPress"
            @touchstart.prevent="startPress"
            @touchend.prevent="endPress"
            @touchcancel.prevent="endPress"
            aria-label="按住开始仪式"
          >
            <span class="dot" />
          </button>
        </div>

        <p class="count" :class="{ show: isPressing }">{{ currentCountLabel }}</p>

        <transition name="fade">
          <p v-if="!isPressing && !showTooEarly" class="stage-hint">按住开始</p>
        </transition>
        <transition name="fade">
          <p v-if="showTooEarly" class="too-early-hint">
            {{ showExtraGuide ? '试试跟着圈圈的呼吸节奏' : '再来一次，跟着呼吸节奏' }}
          </p>
        </transition>
      </section>
    </transition>

    <transition name="fade-content">
      <div v-if="completed" class="complete-stage">
        <p class="complete-text">放下了。<br>为你起一卦。</p>
      </div>
    </transition>
  </main>
</template>

<style scoped>
.ritual-page {
  position: fixed;
  inset: 0;
  background: #F2EFE7;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.skip-btn {
  position: absolute;
  top: env(safe-area-inset-top, 20px);
  right: 24px;
  margin-top: 12px;
  font-size: 12px;
  color: #B5B1A6;
  background: transparent;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 1px;
  z-index: 10;
}
.skip-btn:hover { color: #888780; }

.ritual-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 32px;
  transition: opacity 0.6s ease;
}
.ritual-content.pressing .ritual-prompt,
.ritual-content.pressing .ritual-hint {
  opacity: 0.3;
}

.ritual-prompt {
  text-align: center;
  color: #2C2C2A;
  font-size: 18px;
  line-height: 2;
  margin: 0 0 16px;
  font-family: 'Noto Serif SC', 'Noto Serif CJK SC', '思源宋体', serif;
  font-weight: 500;
  letter-spacing: 0.05em;
  transition: opacity 0.5s ease;
}
.ritual-hint {
  text-align: center;
  color: #888780;
  font-size: 14px;
  line-height: 1.8;
  margin: 0 0 56px;
  font-family: inherit;
  letter-spacing: 1px;
  transition: opacity 0.5s ease;
}

.ritual-button-wrap {
  position: relative;
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 呼吸圈 */
.ring {
  position: absolute;
  border-radius: 50%;
  border: 0.5px solid #C9C3B5;
  transition: transform 3s ease-in-out, opacity 0.4s;
  opacity: 0;
}
.ring-1 { inset: 0; }
.ring-2 { inset: 16px; transition-delay: 0.15s; }
.ring.expanded { opacity: 1; }
.ring.expanded.ring-1 { transform: scale(1.18); }
.ring.expanded.ring-2 { transform: scale(1.12); }

/* 进度环 */
.progress-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}
.progress-ring circle {
  transition: stroke-dashoffset 0.1s linear;
}

/* 主圆点 */
.ritual-btn {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: #FFFCF6;
  border: 0.5px solid #C9C3B5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;
  z-index: 2;
  padding: 0;
}
.ritual-btn.pressing {
  background: #2C2C2A;
  transform: scale(0.96);
}
.ritual-btn .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #A8453E;
  transition: transform 0.3s ease;
}
.ritual-btn.pressing .dot {
  transform: scale(1.5);
}

.count {
  position: absolute;
  bottom: 96px;
  margin: 0;
  font-size: 13px;
  color: #888780;
  font-family: inherit;
  letter-spacing: 0.25em;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.count.show { opacity: 1; }

.stage-hint,
.too-early-hint {
  position: absolute;
  bottom: 40px;
  margin: 0;
  font-size: 13px;
  font-family: inherit;
  letter-spacing: 0.15em;
}
.stage-hint     { color: #B5B1A6; }
.too-early-hint { color: #888780; }

/* 完成态 */
.complete-stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F2EFE7;
}
.complete-text {
  margin: 0;
  color: #2C2C2A;
  font-size: 20px;
  line-height: 2;
  text-align: center;
  font-family: 'Noto Serif SC', 'Noto Serif CJK SC', '思源宋体', serif;
  font-weight: 500;
  letter-spacing: 0.1em;
}

/* 过渡 */
.fade-content-enter-active,
.fade-content-leave-active { transition: opacity 0.8s ease; }
.fade-content-enter-from,
.fade-content-leave-to     { opacity: 0; }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

/* 小屏适配 */
@media (max-width: 320px) {
  .ritual-button-wrap { width: 144px; height: 144px; }
  .ritual-btn { width: 72px; height: 72px; }
  .ritual-prompt { font-size: 16px; }
}
</style>
