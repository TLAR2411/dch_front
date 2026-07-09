<!-- components/StatusChip.vue -->
<template>
  <span class="chip" :class="`chip-${color}`">
    <span class="chip-dot"></span>
    {{ $t(label) }}
  </span>
</template>

<script setup>
defineProps({ color: String, label: String });
</script>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0px 10px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid transparent;
}
.chip-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
}
.chip-success {
  background: #eaf3de;
  color: #3b6d11;
  border-color: #97c459;
}
.chip-success .chip-dot {
  background: #3b6d11;
}

.chip-error {
  background: #fcebeb;
  color: #a32d2d;
  border-color: #f09595;
}
.chip-error .chip-dot {
  background: #a32d2d;
}

.chip-info {
  background: #e6f1fb;
  color: #185fa5;
  border-color: #85b7eb;
}
.chip-info .chip-dot {
  background: #185fa5;
}
</style>
