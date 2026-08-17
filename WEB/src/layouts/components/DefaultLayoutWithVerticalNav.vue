<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useNavigation } from "@/navigation/vertical/index.js";
import { themeConfig } from "@themeConfig";
import AdminNavItems from "@/navigation/vertical/admin";
import EnglishNavItems from "@/navigation/vertical/english";
import KhmerNavItems from "@/navigation/vertical/khmer";
import ChineseNavItems from "@/navigation/vertical/chinese";
import NavPartSwitcher from "./NavPartSwitcher.vue";

import { useLayoutConfigStore } from "@layouts/stores/config";

// Components
import Footer from "@/layouts/components/Footer.vue";
import NavBarI18n from "@core/components/I18n.vue";
import NavbarBranches from "./NavbarBranches.vue";
import NavbarChat from "./NavbarChat.vue";

// @layouts plugin
import { VerticalNavLayout } from "@layouts";
import { usePartStore } from "@/stores/partStore";
import { useSettingStore } from "@/stores/settingStore";
import { useChatUnreadStore } from "@/stores/chatUnreadStore";
import NavbarAcademicYear from "./NavbarAcademicYear.vue";
import MobileBottomNav from "./MobileBottomNav.vue";

const navItems = useNavigation();
const configStore = useLayoutConfigStore();
const setting = usePartStore();
const settingStore = useSettingStore();
const chatUnreadStore = useChatUnreadStore();
const { system_part: systemPart } = storeToRefs(setting);
const { branch_id: branchId } = storeToRefs(settingStore);

const isMobileNav = ref(window.innerWidth < 1280);
const updateMobileNav = () => {
  isMobileNav.value = window.innerWidth < 1280;
};
let unreadPollTimer = null;

const resolvedNavItems = computed(() => {
  if (setting.system_part == "admin") return AdminNavItems;
  if (setting.system_part == "khmer") return KhmerNavItems;
  if (setting.system_part == "english") return EnglishNavItems;
  if (setting.system_part == "chinese") return ChineseNavItems;
  return navItems.value;
});

onMounted(() => {
  window.addEventListener("resize", updateMobileNav);
  void chatUnreadStore.refresh();
  unreadPollTimer = setInterval(() => {
    void chatUnreadStore.refresh();
  }, 30000);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateMobileNav);
  if (unreadPollTimer) {
    clearInterval(unreadPollTimer);
    unreadPollTimer = null;
  }
});

watch([systemPart, branchId], () => {
  void chatUnreadStore.refresh();
});
</script>

<template>
  <VerticalNavLayout :nav-items="resolvedNavItems">
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="navbar-toolbar d-flex h-100 align-center">
        <IconBtn
          v-if="isMobileNav"
          id="vertical-nav-toggle-btn"
          aria-label="បើក ឬ បិទ បញ្ជីមុខងារចំហៀង Laptop"
          class="ms-n3 d-lg-none flex-shrink-0"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon size="26" icon="tabler-menu-2" />
        </IconBtn>

        <IconBtn
          v-else
          id="vertical-nav-toggle-btn"
          aria-label="បើក ឬ បិទ បញ្ជីមុខងារចំហៀង Mobile"
          class="ms-n3 flex-shrink-0"
          @click="
            configStore.isVerticalNavCollapsed =
              !configStore.isVerticalNavCollapsed
          "
        >
          <VIcon size="26" icon="tabler-menu-2" />
        </IconBtn>

        <NavbarAcademicYear class="ms-1" />

        <VSpacer />

        <div class="navbar-toolbar-actions d-flex align-center flex-shrink-0">
          <NavbarBranches />
          <NavPartSwitcher class="ms-1" />
          <NavbarChat />
          <NavBarI18n
            class="ms-1"
            v-if="
              themeConfig.app.i18n.enable &&
              themeConfig.app.i18n.langConfig?.length
            "
            :languages="themeConfig.app.i18n.langConfig"
          />
          <TheCustomizer class="ms-1 customizer-in-navbar" />
        </div>
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <MobileBottomNav />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>
  </VerticalNavLayout>
</template>
