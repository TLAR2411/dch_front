<script setup>
import CurrenciesList from "@/views/admin/currencies/CurrenciesList.vue";

definePage({
  meta: {
    title: "Currencies",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-currencies",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CurrenciesList />
</template>
