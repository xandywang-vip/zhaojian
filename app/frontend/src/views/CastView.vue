<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { castDivination } from '../api/divination';

// 倒计时遮罩已移除：RitualView（按住默念）已承担预热职能

const router = useRouter();
const store = useSessionStore();

const submitting = ref(false);
const slowNetwork = ref(false);
const error = ref('');
let slowTimer: ReturnType<typeof setTimeout> | null = null;

async function startCast() {
  if (!store.ask.topic) return;
  submitting.value = true;
  // 若 8 秒后还没结果，提示用户正在唤醒服务
  slowTimer = setTimeout(() => { slowNetwork.value = true; }, 8000);
  try {
    const res = await castDivination({ topic: store.ask.topic as any });
    router.replace(`/result/${res.id}`);
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
  if (slowTimer) clearTimeout(slowTimer);
});
</script>

<template>
  <main class="page">
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
