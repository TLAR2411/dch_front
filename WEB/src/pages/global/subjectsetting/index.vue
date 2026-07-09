<script setup>
import SubjectSettingList from "@/views/global/subjectsetting/SubjectSettingList.vue";

definePage({
  meta: {
    title: "Subjects Setting",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-positions",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <SubjectSettingList />
</template>
