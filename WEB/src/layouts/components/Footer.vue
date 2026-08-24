<script setup>
import { version } from "../../../package.json";
</script>

<template>
  <div
    class="h-100 d-flex align-center justify-md-space-between justify-center flex-wrap gap-2"
  >
    <!-- <span class="d-flex align-center text-medium-emphasis">
      Copyright &copy; 2024-Present&nbsp;By&nbsp;
      <a href="https://web.facebook.com/devphintech">Devphin Tech.</a>
    </span> -->
    <span class="text-disabled text-caption">
      <VChip class="bg-error font-weight-bold">v {{ version }}</VChip>
    </span>
  </div>
</template>
