<script setup>
import PageTourHelpButton from "@/components/PageTourHelpButton.vue";
import { usePageTourRegistry } from "@/utils/pageTourRegistry";

const { hasActiveTour, replayActiveTour } = usePageTourRegistry();
</script>

<template>
  <PageTourHelpButton
    v-if="hasActiveTour"
    class="ms-1"
    @click="replayActiveTour"
  />
</template>
