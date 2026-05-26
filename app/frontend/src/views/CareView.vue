<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <main class="page care-page">
    <button class="back" @click="router.push('/')">← 回到首页</button>

    <div class="care-header">
      <div class="care-icon">◎</div>
    </div>

    <div class="care-message">
      <p>看到你写下的这些，我们很想先停下来，认真地对你说一句：</p>
      <p class="care-emphasis">你现在承受的，真的很不容易。</p>
      <p>理理只是一个帮人换角度想问题的小工具，但此刻的你，值得比这更有力的陪伴。</p>
      <p>如果愿意，可以联系下面的渠道，那一头是真实的、受过专业训练的人，他们会认真听你说。</p>
      <p>你也可以告诉身边一个你还信任的人。你不需要一个人扛。</p>
    </div>

    <div class="hotlines">
      <h3 class="hotlines-title">求助渠道</h3>

      <a href="tel:400-161-9995" class="hotline-item">
        <div class="hotline-name">希望24热线</div>
        <div class="hotline-number">400-161-9995</div>
        <div class="hotline-note">24小时</div>
      </a>

      <a href="tel:400-821-1215" class="hotline-item">
        <div class="hotline-name">生命热线</div>
        <div class="hotline-number">400-821-1215</div>
        <div class="hotline-note">24小时</div>
      </a>

      <a href="tel:010-82951332" class="hotline-item">
        <div class="hotline-name">北京心理危机干预中心</div>
        <div class="hotline-number">010-82951332</div>
        <div class="hotline-note">24小时</div>
      </a>
    </div>

    <p class="hotline-disclaimer">以上热线号码请以官方最新公布信息为准，上线前需逐一核实。</p>

    <div class="care-actions">
      <button class="btn btn-ghost btn-block" @click="router.push('/')">回到首页</button>
    </div>

    <p class="page-disclaimer">如果你正经历持续的痛苦，请联系专业的心理援助。</p>
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

.care-header {
  text-align: center;
  margin: 8px 0 24px;
}
.care-icon {
  font-size: 36px;
  color: var(--c-accent);
  opacity: 0.6;
  letter-spacing: 2px;
}

.care-message {
  background: var(--c-paper);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  padding: 24px 22px;
  margin-bottom: 28px;
  box-shadow: var(--shadow-soft);
}
.care-message p {
  margin: 0 0 14px;
  font-size: 15px;
  color: var(--c-ink-soft);
  line-height: 1.9;
  letter-spacing: 0.4px;
}
.care-message p:last-child { margin-bottom: 0; }
.care-emphasis {
  font-size: 16px !important;
  font-weight: 500;
  color: var(--c-ink) !important;
  letter-spacing: 1px !important;
}

.hotlines {
  margin-bottom: 16px;
}
.hotlines-title {
  font-size: 12px;
  color: var(--c-muted);
  letter-spacing: 3px;
  margin: 0 0 14px;
  font-weight: 400;
}
.hotline-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: var(--c-paper);
  border: 1px solid var(--c-line);
  border-radius: var(--r-md);
  margin-bottom: 10px;
  text-decoration: none;
  color: inherit;
  transition: background 0.18s;
}
.hotline-item:hover { background: var(--c-bg-soft); }
.hotline-name {
  flex: 1;
  font-size: 14px;
  color: var(--c-ink-soft);
}
.hotline-number {
  font-size: 16px;
  font-weight: 500;
  color: var(--c-accent);
  letter-spacing: 0.5px;
}
.hotline-note {
  font-size: 11px;
  color: var(--c-muted);
}

.hotline-disclaimer {
  font-size: 11px;
  color: var(--c-muted);
  text-align: center;
  margin: 0 0 28px;
  line-height: 1.7;
}

.care-actions {
  margin-bottom: 24px;
}

.page-disclaimer {
  font-size: 11.5px;
  color: var(--c-muted);
  text-align: center;
  letter-spacing: 0.5px;
  line-height: 1.8;
  margin-top: 12px;
}
</style>
