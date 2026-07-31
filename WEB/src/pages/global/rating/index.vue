<script setup>
import { onBeforeMount } from "vue";
import { useRouter } from "vue-router";

definePage({
  meta: {
    title: "Behavior & Rating",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const router = useRouter();

onBeforeMount(() => {
  router.replace({ name: "global-behavior", query: { tab: "rating" } });
});
</script>

<template>
  <div />
</template>
