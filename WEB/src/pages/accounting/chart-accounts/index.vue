<script setup>
import ChartAccountList from "@/views/accounting/chart-accounts/ChartAccountList.vue";
definePage({
  meta: {
    title: "Chart Accounts",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-chart-accounts",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <ChartAccountList />
</template>
