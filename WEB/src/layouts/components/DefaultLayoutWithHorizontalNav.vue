<script setup>
import { computed, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useNavigation } from "@/navigation/vertical/index.js";
import { themeConfig } from "@themeConfig";
import AdminNavItems from "@/navigation/vertical/admin";
import EnglishNavItems from "@/navigation/vertical/english";
import KhmerNavItems from "@/navigation/vertical/khmer";
import ChineseNavItems from "@/navigation/vertical/chinese";
import NavPartSwitcher from "./NavPartSwitcher.vue";

// Components
import Footer from "@/layouts/components/Footer.vue";
import NavBarI18n from "@core/components/I18n.vue";
import NavbarBranches from "./NavbarBranches.vue";
import NavbarChat from "./NavbarChat.vue";
import NavbarAcademicYear from "./NavbarAcademicYear.vue";
import PageTourNavbarButton from "./PageTourNavbarButton.vue";
import NavbarThemeSwitcher from "./NavbarThemeSwitcher.vue";
import NavBarNotifications from "./NavBarNotifications.vue";
import UserProfile from "./UserProfile.vue";

// @layouts plugin
import { HorizontalNavLayout } from "@layouts";
import { VNodeRenderer } from "@layouts/components/VNodeRenderer";
import { usePartStore } from "@/stores/partStore";
import { useSettingStore } from "@/stores/settingStore";
import { useChatUnreadStore } from "@/stores/chatUnreadStore";
import MobileBottomNav from "./MobileBottomNav.vue";

const navItems = useNavigation();
const setting = usePartStore();
const settingStore = useSettingStore();
const chatUnreadStore = useChatUnreadStore();
const { system_part: systemPart } = storeToRefs(setting);
const { branch_id: branchId } = storeToRefs(settingStore);

let unreadPollTimer = null;

const resolvedNavItems = computed(() => {
  if (setting.system_part == "admin") return AdminNavItems;
  if (setting.system_part == "khmer") return KhmerNavItems;
  if (setting.system_part == "english") return EnglishNavItems;
  if (setting.system_part == "chinese") return ChineseNavItems;
  return navItems.value;
});

onMounted(() => {
  void chatUnreadStore.refresh();
  unreadPollTimer = setInterval(() => {
    void chatUnreadStore.refresh();
  }, 30000);
});

onUnmounted(() => {
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
  <HorizontalNavLayout :nav-items="resolvedNavItems">
    <!-- 👉 Top row navbar -->
    <template #navbar>
      <div class="navbar-toolbar d-flex align-center w-100">
        <RouterLink to="/" class="app-logo d-none d-sm-flex align-center gap-x-3 flex-shrink-0">
          <VNodeRenderer :nodes="themeConfig.app.logo" />
        </RouterLink>

        <NavbarAcademicYear class="ms-1 header-year-chip" />

        <VSpacer />

        <div class="navbar-toolbar-actions d-flex align-center flex-shrink-0">
          <NavbarBranches class="header-branch-select" />
          <NavPartSwitcher class="ms-1" />
          <NavbarChat />
          <PageTourNavbarButton />
          <NavBarI18n
            class="ms-1"
            v-if="
              themeConfig.app.i18n.enable && themeConfig.app.i18n.langConfig?.length
            "
            :languages="themeConfig.app.i18n.langConfig"
          />
          <UserProfile class="ms-1 d-none d-sm-flex" />
          <TheCustomizer class="ms-1 customizer-in-navbar" />
        </div>
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- <MobileBottomNav /> -->

    <!-- 👉 Footer -->
    <!-- <template #footer>
      <Footer />
    </template> -->
  </HorizontalNavLayout>
</template>
