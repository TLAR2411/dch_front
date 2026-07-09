<template>
    <div class="clock">
      {{ time }}
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted } from "vue";
  
  const time = ref("");
  let timer = null;
  
  function updateTime() {
    const now = new Date();
    time.value = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  
  onMounted(() => {
    updateTime();
    timer = setInterval(updateTime, 1000);
  });
  
  onUnmounted(() => {
    clearInterval(timer);
  });
  </script>
  
  <style scoped>
  .clock {
    font-family: "DM Mono", monospace;
    font-size: 13px;
    color: #aaa;
  }
  </style>
  