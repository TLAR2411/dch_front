<script setup>
import { useNavigation } from "@/navigation/vertical/index.js";
import { themeConfig } from "@themeConfig";
import AdminNavItems from "@/navigation/vertical/admin";
import EnglishNavItems from "@/navigation/vertical/english";
import KhmerNavItems from "@/navigation/vertical/khmer";
import ChineseNavItems from "@/navigation/vertical/chinese";
import NavPart from "./NavPart.vue";
import NavPartSwitcher from "./NavPartSwitcher.vue";

import { useLayoutConfigStore } from "@layouts/stores/config";

// Components
import Footer from "@/layouts/components/Footer.vue";
import NavBarI18n from "@core/components/I18n.vue";
import NavbarBranches from "./NavbarBranches.vue";

// @layouts plugin
import { VerticalNavLayout } from "@layouts";
import { useRoute } from "vue-router";
import NavbarQrScan from "./NavbarQrScan.vue";
import { usePartStore } from "@/stores/partStore";
import NavbarAcademicYear from "./NavbarAcademicYear.vue";
const navItems = useNavigation();
const configStore = useLayoutConfigStore();

const isMobileNav = ref(window.innerWidth < 1280);
const updateMobileNav = () => {
  isMobileNav.value = window.innerWidth < 1280;
};
const route = useRoute();

const setting = usePartStore();

onMounted(() => {
  window.addEventListener("resize", updateMobileNav);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateMobileNav);
});
</script>

<template>
  <VerticalNavLayout
    :nav-items="
      setting.system_part == 'admin'
        ? AdminNavItems
        : setting.system_part == 'khmer'
          ? KhmerNavItems
          : setting.system_part == 'english'
            ? EnglishNavItems
            : setting.system_part == 'chinese'
              ? ChineseNavItems
              : navItems
    "
  >
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center justify-end">
        <!--Navbar -->

        <IconBtn
          v-if="isMobileNav"
          id="vertical-nav-toggle-btn"
          aria-label="បើក ឬ បិទ បញ្ជីមុខងារចំហៀង Laptop"
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon size="26" icon="tabler-menu-2" />
        </IconBtn>

        <IconBtn
          v-else
          id="vertical-nav-toggle-btn"
          aria-label="បើក ឬ បិទ បញ្ជីមុខងារចំហៀង Mobile"
          class="ms-n3"
          @click="
            configStore.isVerticalNavCollapsed =
              !configStore.isVerticalNavCollapsed
          "
        >
          <VIcon size="26" icon="tabler-menu-2" />
        </IconBtn>
        <NavbarAcademicYear />

        <VSpacer />

        <!-- <AppClock /> -->

        <NavbarBranches />

        <NavPartSwitcher class="ml-3" />

        <NavBarI18n
          style="margin-left: 12px"
          v-if="
            themeConfig.app.i18n.enable &&
            themeConfig.app.i18n.langConfig?.length
          "
          :languages="themeConfig.app.i18n.langConfig"
        />

        <!-- <NavbarQrScan class="ml-1" /> -->
        <!-- <NavbarThemeSwitcher class="mr-10" /> -->
        <!-- <NavbarReload /> -->

        <!-- <UserProfile /> -->
      </div>
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <TheCustomizer />
  </VerticalNavLayout>
</template>
