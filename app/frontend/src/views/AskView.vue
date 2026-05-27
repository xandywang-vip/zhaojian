<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { TOPICS, type Topic } from '../api/types';

const router = useRouter();
const store = useSessionStore();

// Curated descriptions per topic — purely UI labels, no AI prompt impact
const TOPIC_DESCRIPTIONS: Record<Topic, string> = {
  '工作与压力': '职业方向、效率拖延、倦怠',
  '关系与情感': '亲密关系、家人朋友、人际边界',
  '自我与成长': '自我认同、自信、个人成长',
  '选择与犹豫': '决策犹豫、机会取舍',
  '失落与疗愈': '失恋、低谷、目标受挫',
  '焦虑与平静': '焦虑、过度思考、内在安定',
};

function pickTopic(t: Topic) {
  store.setTopic(t);
  router.push('/ritual');
}
</script>

<template>
  <main class="page">
    <button class="back" @click="router.back()">← 返回</button>
    <h2 class="page-title">此刻最在心里的是哪件事？</h2>
    <p class="muted small">选一个最贴近你当下感受的主题，我们陪你换个视角看看。</p>

    <div class="topic-grid">
      <button
        v-for="t in TOPICS"
        :key="t"
        class="topic-card"
        @click="pickTopic(t)"
      >
        <div class="topic-card__title">{{ t }}</div>
        <div class="topic-card__desc">{{ TOPIC_DESCRIPTIONS[t] }}</div>
      </button>
    </div>
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
  margin: 4px 0 8px;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 1px;
}
.small { font-size: 13px; margin-top: 0; margin-bottom: 14px; line-height: 1.85; }

/* Topic grid */
.topic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.topic-card {
  position: relative;
  overflow: hidden;
  background: var(--c-paper);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  padding: 20px 16px;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  cursor: pointer;
  text-align: left;
  transition: transform 0.15s ease, background 0.15s ease;
  font-family: inherit;
}
.topic-card:hover  { background: #FFFFFF; }
.topic-card:active { transform: scale(0.98); }

/* Mobile: 左侧装饰条用 ::before 贴合圆角 */
@media (max-width: 480px) {
  .topic-card::before {
    content: '';
    position: absolute;
    top: 0; bottom: 0; left: 0;
    width: 3px;
  }
  .topic-card:nth-child(1)::before { background: #8B9BB0; } /* 工作与压力 — 蓝灰 */
  .topic-card:nth-child(2)::before { background: #C4907A; } /* 关系与情感 — 暖陶 */
  .topic-card:nth-child(3)::before { background: #8AA08A; } /* 自我与成长 — 鼠尾草绿 */
  .topic-card:nth-child(4)::before { background: #B8A06A; } /* 选择与犹豫 — 琥珀 */
  .topic-card:nth-child(5)::before { background: #9D92B8; } /* 失落与疗愈 — 薰衣草 */
  .topic-card:nth-child(6)::before { background: #7AA8A0; } /* 焦虑与平静 — 浅青 */
}

.topic-card__title {
  font-size: 16px;
  font-weight: 500;
  color: var(--c-ink);
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.topic-card__desc {
  font-size: 12px;
  color: var(--c-muted);
  letter-spacing: 0.3px;
  line-height: 1.7;
}


</style>
