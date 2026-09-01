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

      <div
        v-if="isAppBootstrapping"
        class="app-bootstrap-loader"
      >
        <div class="loading-logo">
          <img
            src="/logo/main-logo-2.svg"
            alt="Dewey"
            width="80"
          />
        </div>
        <div class="loading">
          <div class="effect-1 effects" />
          <div class="effect-2 effects" />
          <div class="effect-3 effects" />
        </div>
      </div>

      <RouterView v-slot="{ Component }">
        <component :is="Component" v-if="Component" />
      </RouterView>

      <!-- <ScrollToTop /> -->
    </VApp>
  </VLocaleProvider>
</template>

<style scoped>
.app-bootstrap-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: var(--initial-loader-bg, #fff);
}

.loading {
  position: relative;
  box-sizing: border-box;
  border: 3px solid transparent;
  border-radius: 50%;
  block-size: 55px;
  inline-size: 55px;
}

.loading .effect-1,
.loading .effect-2,
.loading .effect-3 {
  position: absolute;
  box-sizing: border-box;
  border: 3px solid transparent;
  border-radius: 50%;
  block-size: 100%;
  border-inline-start: 3px solid var(--initial-loader-color, #123764);
  inline-size: 100%;
}

.loading .effect-1 {
  animation: app-bootstrap-rotate 1s ease infinite;
}

.loading .effect-2 {
  animation: app-bootstrap-rotate-opacity 1s ease infinite 0.1s;
}

.loading .effect-3 {
  animation: app-bootstrap-rotate-opacity 1s ease infinite 0.2s;
}

@keyframes app-bootstrap-rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(1turn);
  }
}

@keyframes app-bootstrap-rotate-opacity {
  0% {
    opacity: 0.1;
    transform: rotate(0deg);
  }

  100% {
    opacity: 1;
    transform: rotate(1turn);
  }
}

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
