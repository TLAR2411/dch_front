<script setup>
import RoomsList from "@/views/global/rooms/RoomsList.vue";

definePage({
  meta: {
    title: "Rooms",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-positions",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <RoomsList />
</template>
