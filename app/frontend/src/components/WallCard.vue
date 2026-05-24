<template>
  <article class="wall-card" @click="$emit('open', card.id)">
    <!-- 意象背景：上卦右上（主），下卦左下（辅） -->
    <div class="wall-card__imagery wall-card__imagery--upper" v-html="upperSvg" aria-hidden="true" />
    <div
      v-if="lowerSvg"
      class="wall-card__imagery wall-card__imagery--lower"
      v-html="lowerSvg"
      aria-hidden="true"
    />

    <!-- 卡片内容 -->
    <div class="wall-card__body">
      <p class="wall-card__time">{{ card.dateLabel }}</p>

      <!-- 金句（始终显示） -->
      <p class="wall-card__oneliner">{{ card.oneLiner }}</p>

      <!-- 追问 + 回答（都存在才展示） -->
      <div v-if="card.question && card.answer" class="wall-card__qa">
        <p class="wall-card__qa-question">Q · {{ card.question }}</p>
        <p class="wall-card__qa-answer">A · {{ card.answer }}</p>
      </div>

      <div class="wall-card__meta">
        <span class="wall-card__topic">{{ card.topic }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { TRIGRAM_IMAGERY, type TrigramKey } from '@/composables/imagery';
import type { WallCard } from '@/api/types';

const props = defineProps<{
  card: WallCard;
}>();

defineEmits<{
  open: [id: string];
}>();

/**
 * 把 trigram path 字符串包成完整 <svg>，让浏览器在 SVG 命名空间里解析。
 * 直接在 <svg> 上用 v-html 不可靠，包装在 div 里更稳。
 */
function wrapSvg(paths: string): string {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

function getTrigram(part: string | undefined): TrigramKey | null {
  if (!part) return null;
  return (part in TRIGRAM_IMAGERY) ? (part as TrigramKey) : null;
}

const upperSvg = computed(() => {
  const k = getTrigram(props.card.primaryImageryKey?.split('+')[0]) ?? 'heaven';
  return wrapSvg(TRIGRAM_IMAGERY[k]);
});

const lowerSvg = computed(() => {
  const k = getTrigram(props.card.primaryImageryKey?.split('+')[1]);
  return k ? wrapSvg(TRIGRAM_IMAGERY[k]) : null;
});
</script>

<style scoped>
.wall-card {
  position: relative;
  background: #FFFCF6;
  border-radius: 12px;
  padding: 16px 14px 14px;
  border: 0.5px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.wall-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.wall-card:active { transform: scale(0.99); }

/* 意象 SVG 装饰，opacity 控制氛围感 */
.wall-card__imagery {
  position: absolute;
  pointer-events: none;
}
.wall-card__imagery :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.wall-card__imagery--upper {
  right: -20px;
  top: -20px;
  width: 120px;
  height: 120px;
  opacity: 0.13;
}
.wall-card__imagery--lower {
  left: -16px;
  bottom: -16px;
  width: 80px;
  height: 80px;
  opacity: 0.08;
}

.wall-card__body { position: relative; }

/* 起卦时间：YYYY.MM.DD 周X HH:MM */
.wall-card__time {
  font-size: 11px;
  color: #888780;
  margin: 0 0 14px;
  letter-spacing: 0.3px;
}

/* 金句：视觉中心 */
.wall-card__oneliner {
  font-size: 16px;
  line-height: 1.65;
  color: #2C2C2A;
  margin: 0 0 12px;
  font-weight: 400;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* 追问与回答 */
.wall-card__qa {
  margin: 0 0 12px;
  padding: 10px 12px;
  background: rgba(95, 107, 76, 0.04);
  border-left: 2px solid rgba(95, 107, 76, 0.25);
  border-radius: 4px;
}
.wall-card__qa-question,
.wall-card__qa-answer {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.7;
  letter-spacing: 0.2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
.wall-card__qa-question { color: #6B6B65; margin-bottom: 4px; }
.wall-card__qa-answer   { color: #2C2C2A; }

.wall-card__meta {
  display: flex;
  align-items: center;
}

.wall-card__topic {
  font-size: 11px;
  color: #6B6B65;
}
</style>
