<script setup>
import AccountingDashboard from "@/views/accounting/dashboards/AccountingDashboard.vue";

definePage({
  meta: {
    title: "Dashboards",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
  },
});
</script>

<template>
  <AccountingDashboard />
</template>
