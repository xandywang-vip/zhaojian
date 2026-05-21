<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';
import { TOPICS, type Topic } from '../api/types';

const router = useRouter();
const store = useSessionStore();

const selectedTopic = ref<Topic | null>(null);
const modalOpen = ref(false);

// Curated descriptions per topic — purely UI labels, no AI prompt impact
const TOPIC_DESCRIPTIONS: Record<Topic, string> = {
  '工作与压力': '职业方向、效率拖延、倦怠',
  '关系与情感': '亲密关系、家人朋友、人际边界',
  '自我与成长': '自我认同、自信、个人成长',
  '选择与犹豫': '决策犹豫、机会取舍',
  '失落与疗愈': '失恋、低谷、目标受挫',
  '焦虑与平静': '焦虑、过度思考、内在安定',
};

function openModal(t: Topic) {
  selectedTopic.value = t;
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

function proceed() {
  if (!selectedTopic.value) return;
  store.setTopic(selectedTopic.value);
  modalOpen.value = false;
  router.push('/cast');
}
</script>

<template>
  <main class="page">
    <button class="back" @click="router.back()">← 返回</button>
    <h2 class="page-title">此刻你想看看哪一面？</h2>
    <p class="muted small">选一个最贴近你当下感受的主题，我们为你随机生成一个角度。</p>

    <div class="topic-grid">
      <button
        v-for="t in TOPICS"
        :key="t"
        class="topic-card"
        @click="openModal(t)"
      >
        <div class="topic-card__title">{{ t }}</div>
        <div class="topic-card__desc">{{ TOPIC_DESCRIPTIONS[t] }}</div>
      </button>
    </div>

    <p class="disclaimer-text" style="margin-top: 28px">
      慢慢来。选一个你最想停下来看看的方向。
    </p>

    <!-- 心念聚焦 modal -->
    <transition name="fade">
      <div v-if="modalOpen" class="modal-mask" @click.self="closeModal">
        <div class="modal-card">
          <h3 class="modal-title">先给自己一个安静的片刻</h3>
          <p class="modal-body">
            轻轻闭上眼睛，做三次深呼吸。<br>
            不用想具体的事情，只是回到此刻的身体感受。
          </p>
          <button class="btn btn-primary modal-btn" @click="proceed">准备好了</button>
        </div>
      </div>
    </transition>
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
.small { font-size: 13px; margin-top: 0; margin-bottom: 24px; line-height: 1.85; }

/* Topic grid */
.topic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.topic-card {
  background: var(--c-paper);
  border: 1px solid var(--c-line);
  border-radius: var(--r-lg);
  padding: 20px 16px;
  cursor: pointer;
  text-align: left;
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
  font-family: inherit;
}
.topic-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
  border-color: var(--c-accent);
}
.topic-card__title {
  font-size: 16px;
  font-weight: 500;
  color: var(--c-ink);
  letter-spacing: 1.5px;
  margin-bottom: 6px;
}
.topic-card__desc {
  font-size: 12px;
  color: var(--c-muted);
  letter-spacing: 0.3px;
  line-height: 1.7;
}

/* Modal */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(40, 30, 20, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  backdrop-filter: blur(4px);
}
.modal-card {
  background: #F9F5F0;
  border-radius: var(--r-lg);
  padding: 36px 28px 28px;
  max-width: 360px;
  width: 100%;
  text-align: center;
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
}
.modal-title {
  font-size: 18px;
  font-weight: 500;
  color: #3A3A3A;
  letter-spacing: 1.5px;
  margin: 0 0 16px;
}
.modal-body {
  font-size: 14px;
  color: #4B4B4B;
  line-height: 1.95;
  letter-spacing: 0.5px;
  margin: 0 0 28px;
}
.modal-btn {
  letter-spacing: 4px;
  min-width: 160px;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.22s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
