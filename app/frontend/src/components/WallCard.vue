<template>
  <article class="wall-card" @click="$emit('open', card.id)">
    <!-- 意象背景：右上角淡色装饰，opacity 0.11 -->
    <svg
      class="wall-card__imagery"
      viewBox="0 0 100 100"
      aria-hidden="true"
      v-html="imagerySvg"
    />

    <!-- 卡片内容 -->
    <div class="wall-card__body">
      <p class="wall-card__time">{{ card.dateLabel }}</p>
      <p class="wall-card__oneliner">{{ card.oneLiner }}</p>
      <div class="wall-card__meta">
        <span class="wall-card__topic">{{ card.topic }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { TRIGRAM_IMAGERY, getMainImagery } from '@/composables/imagery';
import type { WallCard } from '@/api/types';

const props = defineProps<{
  card: WallCard;
}>();

defineEmits<{
  open: [id: string];
}>();

// 取意象 SVG（只用上卦）
const imagerySvg = computed(() => {
  const key = getMainImagery(props.card.primaryImageryKey);
  return TRIGRAM_IMAGERY[key];
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

.wall-card:active {
  transform: scale(0.99);
}

/* 意象背景 SVG：右上角溢出，淡色装饰 */
.wall-card__imagery {
  position: absolute;
  right: -20px;
  top: -20px;
  width: 120px;
  height: 120px;
  opacity: 0.11;
  pointer-events: none;
}

.wall-card__body {
  position: relative;
}

/* 时刻：弱化为辅助信息 */
.wall-card__time {
  font-size: 11px;
  color: #888780;
  margin: 0 0 14px;
  letter-spacing: 0.3px;
}

/* 一句话：视觉中心 */
.wall-card__oneliner {
  font-size: 16px;
  line-height: 1.65;
  color: #2C2C2A;
  margin: 0 0 16px;
  font-weight: 400;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* 底部元数据行 */
.wall-card__meta {
  display: flex;
  align-items: center;
}

/* 主题：次要信息，灰字不彩色 */
.wall-card__topic {
  font-size: 11px;
  color: #6B6B65;
}
</style>
