<template>
  <div>正在进入到AR环境...</div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  // 直接重定向到 basic.html
  window.location.href = '/examples/basic.html'
})
</script>
