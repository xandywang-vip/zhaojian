<script setup lang="ts">
defineEmits<{ ack: [] }>();
</script>

<template>
  <div class="dialog-mask" role="dialog" aria-modal="true">
    <div class="dialog">
      <h3 class="title">写在前面</h3>
      <p class="body">
        照见是一个让你换个角度看自己的小工具。当你心里反复想着一件事，它换一个视角，陪你温柔地梳理一遍。
      </p>
      <p class="body">
        它不预测未来，也不替你做决定。如果你正经历持续的痛苦，请记得身边专业的人可以帮你。
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
