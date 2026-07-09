<script setup>
import PeopleList from "@/views/accounting/people/PeopleList.vue";

definePage({
  meta: {
    title: "Peoples",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <PeopleList />
</template>
