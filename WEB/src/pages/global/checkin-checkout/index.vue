<script setup>
import CheckinCheckoutList from "@/views/global/checkin-checkout/CheckinCheckoutList.vue";

definePage({
  meta: {
    title: "Checkin Checkout",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-curriculumns",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CheckinCheckoutList />
</template>
