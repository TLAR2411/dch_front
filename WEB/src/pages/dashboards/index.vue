<script setup>
import { computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { usePartStore } from "@/stores/partStore";
import { getPartDashboardRoute } from "@/utils/partHomeRoutes";

definePage({
  meta: {
    title: "Dashboards",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
  },
});

const router = useRouter();
const authStore = useAuthStore();
const partStore = usePartStore();

const fallbackPart = computed(() => {
  const permissions = authStore.permissions ?? [];

  if (permissions.includes("allow-part-khmer")) return "khmer";
  if (permissions.includes("allow-part-english")) return "english";
  if (permissions.includes("allow-part-chinese")) return "chinese";
  if (permissions.includes("allow-part-admin")) return "admin";

  return null;
});

const redirectToDashboard = () => {
  const part = partStore.system_part || fallbackPart.value;
  if (!part) return;

  if (partStore.system_part !== part) {
    partStore.setSystemPart(part);
  }

  router.replace({ name: getPartDashboardRoute(part) });
};

onMounted(() => {
  redirectToDashboard();
});

watch(
  () => [partStore.system_part, authStore.permissions],
  () => {
    redirectToDashboard();
  },
  { deep: true },
);
</script>

<template>
  <div class="d-flex align-center justify-center py-12">
    <VProgressCircular indeterminate color="primary" />
  </div>
</template>
