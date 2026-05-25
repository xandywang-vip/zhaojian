<script setup lang="ts">
import { onMounted, ref } from 'vue';
import DisclaimerDialog from './components/DisclaimerDialog.vue';

const showDisclaimer = ref(false);

onMounted(() => {
  const seen = localStorage.getItem('yijian:disclaimer-seen');
  if (!seen) showDisclaimer.value = true;
});

function acknowledge() {
  localStorage.setItem('yijian:disclaimer-seen', '1');
  showDisclaimer.value = false;
}
</script>

<template>
  <div class="app-shell">
    <router-view v-slot="{ Component, route }">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </router-view>
    <footer class="app-footer">
      让心里转的事，慢一点
    </footer>
    <DisclaimerDialog v-if="showDisclaimer" @ack="acknowledge" />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-footer {
  text-align: center;
  color: var(--c-muted);
  font-size: 12px;
  padding: 18px 16px 28px;
  letter-spacing: 0.4px;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}
.fade-enter-from { opacity: 0; transform: translateY(6px); }
.fade-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
