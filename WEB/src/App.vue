<script setup>
import "@fonts/font.css";
import { useTheme } from "vuetify";
import initCore from "@core/initCore";
import { initConfigStore, useConfigStore } from "@core/stores/config";
import { hexToRgb } from "@core/utils/colorConverter";
import { computed, onMounted } from "vue";
import { Notifications } from "@kyvg/vue3-notification";
import GlobalDialog from "@/components/GlobalDialog.vue";
import { defineAsyncComponent } from "vue";

import { useDialog } from "@/composable/useDialog";
import { useAuthStore } from "@/stores/authStore";
import { getAccessToken } from "@/utils/accessToken";

const ScrollToTop = defineAsyncComponent(
  () => import("@core/components/ScrollToTop.vue"),
);
// const GlobalDialog = defineAsyncComponent(
//   () => import("@/components/GlobalDialog.vue"),
// );
const { global } = useTheme();
const configStore = useConfigStore();

const globalDialog = ref(null);
const { initializeDialog } = useDialog();

// initCore();
// initConfigStore();

const auth = useAuthStore();
initCore();
initConfigStore();

// Full-app loader while refresh re-verifies the session and loads app data
const isAppBootstrapping = computed(
  () => Boolean(getAccessToken()) && !auth.isBootstrapped,
);

onMounted(() => {
  initializeDialog(globalDialog.value);
  document.body.style.setProperty(
    "--v-global-theme-primary",
    hexToRgb(global.current.value.colors.primary),
  );
});
</script>

<template>
  <!-- Mount here once -->
  <Notifications :pauseOnHover="true" />
  <VLocaleProvider :rtl="configStore.isAppRTL">
    <VApp
      :style="`--v-global-theme-primary: ${hexToRgb(
        global.current.value.colors.primary,
      )}`"
    >
      <GlobalDialog ref="globalDialog" />

      <VOverlay
        :model-value="isAppBootstrapping"
        persistent
        class="align-center justify-center"
        scrim="rgba(255, 255, 255, 0.85)"
      >
        <div class="d-flex flex-column align-center gap-3">
          <VProgressCircular
            indeterminate
            color="primary"
            size="48"
            aria-label="Loading application"
            role="progressbar"
          />
          <span class="text-medium-emphasis">{{ $t("Loading…") }}</span>
        </div>
      </VOverlay>

      <RouterView v-slot="{ Component }">
        <component :is="Component" v-if="Component" />
      </RouterView>

      <!-- <ScrollToTop /> -->
    </VApp>
  </VLocaleProvider>
</template>

<style scoped>
.my-notification {
  margin: 0 5px 5px;
  padding: 10px;
  font-size: 16px;
  color: #ffffff;
  background: #44a4fc;
  border-left: 5px solid #187fe7;

  &.success {
    background: #68cd86;
    border-left-color: #42a85f;
  }

  &.warn {
    background: #ffb648;
    border-left-color: #f48a06;
  }

  &.error {
    background: #e54d42;
    border-left-color: #b82e24;
  }
}
</style>
