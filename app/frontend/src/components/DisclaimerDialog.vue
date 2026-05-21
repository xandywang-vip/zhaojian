<script setup lang="ts">
defineEmits<{ ack: [] }>();
</script>

<template>
  <div class="dialog-mask" role="dialog" aria-modal="true">
    <div class="dialog">
      <h3 class="title">先说几句实话</h3>
      <p class="body">
        观己是一个帮你换角度看待自己的工具，不是算命软件，不预测结果，也不知道你的未来。
      </p>
      <p class="body">
        它能做的：帮你把心里反复想的事从几个角度温柔地梳理一遍。
      </p>
      <p class="body">
        它不能做的：替你做决定，也不能替代专业心理治疗。如果你持续感到痛苦，请联系心理专业人士。
      </p>
      <button class="btn btn-primary btn-block" @click="$emit('ack')">好，明白了</button>
    </div>
  </div>
</template>

<style scoped>
.title {
  margin: 0 0 14px;
  font-weight: 500;
  font-size: 18px;
  letter-spacing: 1px;
  text-align: center;
}
.body {
  font-size: 13px;
  color: var(--c-ink-soft);
  line-height: 1.8;
  margin: 0 0 20px;
}
</style>
