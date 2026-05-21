<script setup lang="ts">
const props = defineProps<{
  yao: number[];
  dongYao?: number;
  size?: 'sm' | 'md' | 'lg';
}>();

// 渲染顺序：上爻在最上方，初爻在最下方。yao 数组自下而上 (PRD 4.0)。
const lines = () => props.yao.slice().reverse().map((v, idxFromTop) => {
  const positionFromBottom = props.yao.length - idxFromTop;
  return { value: v, position: positionFromBottom };
});
</script>

<template>
  <div class="gua-figure" :class="[size ? `gua-${size}` : 'gua-md']">
    <div
      v-for="line in lines()"
      :key="line.position"
      class="yao"
      :class="{ yin: line.value === 0, dong: dongYao === line.position }"
    />
  </div>
</template>

<style scoped>
/* sm — history list, supplementary figures */
.gua-figure.gua-sm {
  --yao-h:   7px;
  --yao-r:   4px;
  --yao-gap: 5px;
  --yin-gap: 9px;
  width: 52px;
}

/* md — panel cards, standalone contexts */
.gua-figure.gua-md {
  --yao-h:   10px;
  --yao-r:   5px;
  --yao-gap: 8px;
  --yin-gap: 13px;
  width: 82px;
}

/* lg — hero display */
.gua-figure.gua-lg {
  --yao-h:    14px;
  --yao-r:    7px;
  --yao-gap:  10px;
  --yin-gap:  18px;
  width: 124px;
}
</style>
