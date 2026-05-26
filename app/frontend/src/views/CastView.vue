<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { castDivination } from '../api/divination';

const router = useRouter();
const store = useSessionStore();

const countdown = ref(3);
const submitting = ref(false);
const slowNetwork = ref(false);
const error = ref('');
let calmTimer: ReturnType<typeof setInterval> | null = null;
let slowTimer: ReturnType<typeof setTimeout> | null = null;
let castPromise: Promise<string> | null = null;

function startCast() {
  if (!store.ask.topic) return;
  castPromise = castDivination({ topic: store.ask.topic as any })
    .then((res) => res.id);

  // 每 2 秒倒一次：3 → 2 → 1 → 进入
  calmTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      finish();
    }
  }, 2000);
}

async function finish() {
  if (calmTimer) { clearInterval(calmTimer); calmTimer = null; }
  if (!castPromise) return;
  submitting.value = true;
  // 若 8 秒后还没结果，提示用户正在唤醒服务
  slowTimer = setTimeout(() => { slowNetwork.value = true; }, 8000);
  try {
    const id = await castPromise;
    router.replace(`/result/${id}`);
  } catch (err: any) {
    error.value = err?.message || '视角生成失败，请稍后再试';
  } finally {
    submitting.value = false;
    if (slowTimer) { clearTimeout(slowTimer); slowTimer = null; }
    slowNetwork.value = false;
  }
}

onMounted(() => {
  if (!store.ask.topic) {
    router.replace('/ask');
    return;
  }
  startCast();
});

onUnmounted(() => {
  if (calmTimer) clearInterval(calmTimer);
  if (slowTimer) clearTimeout(slowTimer);
});
</script>

<template>
  <main class="page">
    <!-- Full-screen calm overlay -->
    <div v-if="!error && !submitting" class="calm-overlay" @click="finish">
      <!-- 圆圈 + 引导文字贴近 -->
      <div class="calm-top">
        <div class="calm-ring" />
        <p class="calm-guide">三次深呼吸之后开始</p>
      </div>

      <!-- 正文 -->
      <p class="calm-main">让心慢一点，<br>再听自己说话。</p>

      <!-- 纯数字倒计时，淡入淡出 -->
      <transition name="fade-num" mode="out-in">
        <span :key="countdown" class="calm-countdown">{{ countdown }}</span>
      </transition>

      <p class="calm-tap">轻触屏幕跳过</p>
    </div>

    <div v-if="submitting" class="loading-state">
      <p>理一理…</p>
      <p v-if="slowNetwork" class="loading-slow">服务正在唤醒，稍候片刻…</p>
    </div>

    <div v-if="error" class="error-block">
      <p class="error-text">{{ error }}</p>
      <button class="btn btn-ghost" @click="router.push('/ask')">返回选择主题</button>
    </div>
  </main>
</template>

<style scoped>
.calm-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #F9F5F0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  gap: 48px;
}

@keyframes calm-breathe {
  0%, 100% { transform: scale(1); opacity: 0.35; }
  50%       { transform: scale(1.9); opacity: 0.7; }
}

/* 圆圈 + 引导文字紧靠一起 */
.calm-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.calm-ring {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1.5px solid #C8BDB0;
  background: transparent;
  animation: calm-breathe 6s ease-in-out infinite;
  flex-shrink: 0;
}

.calm-guide {
  font-size: 13px;
  color: #9E7B6B;
  letter-spacing: 2px;
  margin: 0;
}

.calm-main {
  font-size: 20px;
  color: #3A3A3A;
  letter-spacing: 1.5px;
  line-height: 1.8;
  margin: 0;
  text-align: center;
}

/* 纯数字倒计时 */
.calm-countdown {
  display: block;
  font-size: 32px;
  color: #C8BDB0;
  font-weight: 300;
  letter-spacing: 0;
  line-height: 1;
}

/* 数字切换：淡入淡出 */
.fade-num-enter-active,
.fade-num-leave-active { transition: opacity 0.35s ease; }
.fade-num-enter-from,
.fade-num-leave-to     { opacity: 0; }

.calm-tap {
  font-size: 12px;
  color: #9E7B6B;
  letter-spacing: 2px;
  opacity: 0.6;
  position: absolute;
  bottom: 48px;
}

.loading-state {
  text-align: center;
  padding: 120px 0;
  color: var(--c-muted);
  letter-spacing: 4px;
}
.loading-slow {
  font-size: 12px;
  letter-spacing: 1.5px;
  margin-top: 16px;
  opacity: 0.6;
}

.error-block { padding: 60px 0; text-align: center; }
.error-text {
  color: var(--c-warn);
  font-size: 14px;
  margin: 0 0 20px;
  line-height: 1.8;
}
</style>
