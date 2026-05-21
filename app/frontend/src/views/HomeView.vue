<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const now = new Date();

// Layer 2 — greeting (large) + date (small).
const greeting = computed(() => {
  const h = now.getHours();
  if (h < 5)  return '夜深了，还好吗？';
  if (h < 11) return '早上好，今天感觉如何？';
  if (h < 14) return '午后了，过得还好吗？';
  if (h < 19) return '今天过得还好吗？';
  return '晚上好，今天累了吗？';
});

const dateLine = computed(() => {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${now.getMonth() + 1}月${now.getDate()}日 · ${weekdays[now.getDay()]}`;
});

// Time-of-day icon (top-right). Sun by day, moon by night.
const timeIcon = computed(() => {
  const h = now.getHours();
  return h >= 6 && h < 19 ? '☀' : '☾';
});
</script>

<template>
  <main class="page home">
    <!-- Layer 1 — brand bar -->
    <header class="brand-bar">
      <div class="brand-left">
        <div class="brand-title">照见</div>
        <div class="brand-tag">观己 · 心安</div>
      </div>
      <button class="brand-icon" aria-label="时间">{{ timeIcon }}</button>
    </header>

    <!-- Layer 2 — greeting + date -->
    <section class="greeting-block">
      <h1 class="greeting-q">{{ greeting }}</h1>
      <p class="greeting-date">{{ dateLine }}</p>
    </section>

    <!-- Layer 3 — content card -->
    <article class="hook-card">
      <p class="hook-q">
        <span class="hook-q-lead">有些事，</span><br />
        <span class="hook-q-main">心里转了很久了？</span>
      </p>
      <div class="hook-divider" />
      <p class="hook-hint">不用急着找答案，先安静下来。<br />换一个角度，<em>照见此刻的自己</em>。</p>
    </article>

    <!-- Layer 4 — actions -->
    <button class="btn btn-primary btn-block primary-cta" @click="router.push('/ask')">
      照见此刻
    </button>
    <button class="btn btn-ghost btn-block secondary-cta" @click="router.push('/wall')">
      <span class="cta-main">心境墙</span>
      <span class="cta-sub">你保存过的那些时刻</span>
    </button>

  </main>
</template>

<style scoped>
.home { display: flex; flex-direction: column; min-height: 70vh; }

/* ---------- Layer 1 · brand bar ---------- */
.brand-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-top: 8px;
}
.brand-left { display: flex; flex-direction: column; }
.brand-title {
  font-family: var(--font-serif, 'Noto Serif SC', 'STSong', serif);
  font-size: 28px;
  color: var(--c-ink);
  letter-spacing: 8px;
  line-height: 1;
}
.brand-tag {
  margin-top: 6px;
  color: var(--c-muted);
  font-size: 11.5px;
  letter-spacing: 4px;
}
.brand-icon {
  border: 1px solid var(--c-line);
  background: var(--c-paper);
  color: var(--c-ink-soft);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  font-family: inherit;
}
.brand-icon:hover { background: var(--c-bg-soft); color: var(--c-accent); }

/* ---------- Layer 2 · greeting ---------- */
.greeting-block { margin: 36px 0 22px; }
.greeting-q {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: 2px;
  line-height: 1.5;
}
.greeting-date {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--c-muted);
  letter-spacing: 2px;
}

/* ---------- Layer 3 · hook card ---------- */
.hook-card {
  background: var(--c-paper);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  padding: 22px 22px 20px;
  box-shadow: var(--shadow-soft);
  margin-bottom: 28px;
}
.hook-q {
  margin: 0;
  line-height: 1.6;
  letter-spacing: 0.5px;
}
.hook-q-lead {
  font-size: 15px;
  font-weight: 400;
  color: var(--c-ink-soft);
}
.hook-q-main {
  font-size: 20px;
  font-weight: 600;
  color: var(--c-ink);
  letter-spacing: 1px;
}
.hook-divider {
  border-top: 1px dashed var(--c-line);
  margin: 18px 0 14px;
}
.hook-hint {
  margin: 0;
  font-size: 13px;
  color: var(--c-muted);
  letter-spacing: 0.4px;
  line-height: 1.9;
}
.hook-hint em {
  font-style: normal;
  color: var(--c-ink-soft);
}

/* ---------- Layer 4 · actions ---------- */
.primary-cta { letter-spacing: 2px; }
.secondary-cta {
  margin-top: 12px;
  letter-spacing: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 13px 16px;
}
.cta-main { font-size: 14px; letter-spacing: 2px; }
.cta-sub  { font-size: 11px; letter-spacing: 1px; color: var(--c-muted); }

</style>
