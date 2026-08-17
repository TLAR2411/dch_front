<script setup>
import { computed, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { storeToRefs } from "pinia";
import hasPermission from "@/utils/hasPermission.js";
import { usePartStore } from "@/stores/partStore";
import { PART_DASHBOARD_ROUTES } from "@/utils/partHomeRoutes.js";

const BODY_CLASS = "has-mobile-bottom-nav";
const route = useRoute();
const router = useRouter();
const { mdAndDown } = useDisplay();
const partStore = usePartStore();
const { system_part: systemPart } = storeToRefs(partStore);

const PRIMARY_TABS = [
  {
    key: "dashboard",
    title: "Dashboard",
    icon: "tabler-layout-dashboard",
    permission: "dashboard:view-page",
    // Admin dashboard has no permission gate in nav — always allow in admin part.
    allowWithoutPermissionParts: ["admin"],
    getTo: (part) => ({
      name: PART_DASHBOARD_ROUTES[part] ?? "global-dashboard",
    }),
    matchNames: (part) => [PART_DASHBOARD_ROUTES[part] ?? "global-dashboard"],
  },
  {
    key: "attendance",
    title: "Attendance",
    icon: "tabler-clipboard-check",
    permission: "attendance:view-page",
    getTo: () => ({ name: "global-attendance" }),
    matchNames: () => ["global-attendance", "global-attendance-id"],
  },
  {
    key: "score",
    title: "Score Entry",
    icon: "tabler-edit",
    permission: "student-scores:view-page",
    getTo: () => ({ name: "global-score" }),
    matchNames: () => ["global-score"],
  },
  {
    key: "students",
    title: "Students",
    icon: "tabler-users",
    permission: "students:view-page",
    getTo: (part) =>
      part === "admin"
        ? { name: "admin-students" }
        : { name: "global-student" },
    matchNames: (part) =>
      part === "admin"
        ? ["admin-students", "admin-students-create", "admin-students-edit-id"]
        : ["global-student"],
  },
];

const visibleTabs = computed(() => {
  const part = systemPart.value;
  if (!part) return [];

  return PRIMARY_TABS.filter((tab) => {
    if (tab.allowWithoutPermissionParts?.includes(part)) return true;
    return hasPermission(tab.permission);
  }).map((tab) => ({
    key: tab.key,
    title: tab.title,
    icon: tab.icon,
    to: tab.getTo(part),
    matchNames: tab.matchNames(part),
  }));
});

// Full-screen flows (chat) should not fight the bottom bar for space.
const HIDDEN_ROUTE_NAMES = new Set(["global-chat"]);

const isVisible = computed(
  () =>
    mdAndDown.value &&
    visibleTabs.value.length > 0 &&
    !HIDDEN_ROUTE_NAMES.has(route.name),
);

const activeKey = computed(() => {
  const name = route.name;
  const match = visibleTabs.value.find((tab) =>
    tab.matchNames.includes(name),
  );
  return match?.key ?? null;
});

function goTo(tab) {
  if (!tab?.to) return;
  if (tab.matchNames.includes(route.name)) return;
  router.push(tab.to);
}

watch(
  isVisible,
  (show) => {
    document.body.classList.toggle(BODY_CLASS, show);
  },
  { immediate: true },
);

onUnmounted(() => {
  document.body.classList.remove(BODY_CLASS);
});
</script>

<template>
  <VBottomNavigation
    v-if="isVisible"
    class="mobile-bottom-nav"
    :model-value="activeKey"
    bg-color="surface"
    grow
    height="45"
    mandatory
  >
    <VBtn
      v-for="tab in visibleTabs"
      :key="tab.key"
      :value="tab.key"
      :aria-label="$t(tab.title)"
      class="mobile-bottom-nav__btn"
      density="compact"
      @click="goTo(tab)"
    >
      <VIcon :icon="tab.icon" size="18" />
      <span class="mobile-bottom-nav__label">{{ $t(tab.title) }}</span>
    </VBtn>
  </VBottomNavigation>
</template>

<style lang="scss">
.mobile-bottom-nav.v-bottom-navigation {
  // Below vertical drawer (1003) + overlay (1002) so the menu covers this bar.
  z-index: 1001;
  inset-inline: 0 !important;
  inline-size: 100% !important;
  max-inline-size: 100% !important;
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 0 !important;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);

  .v-bottom-navigation__content {
    display: flex;
    inline-size: 100%;
  }

  .v-btn {
    flex: 1 1 0;
    min-inline-size: 0 !important;
    max-inline-size: none !important;
    block-size: 100% !important;
    margin: 0 !important;
    border-radius: 0 !important;
    padding-block: 2px !important;
    padding-inline: 4px !important;
  }

  .v-btn__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    line-height: 1.1;
  }
}

.mobile-bottom-nav__btn {
  text-transform: none;
  letter-spacing: normal;
  font-size: 0.625rem;
  font-weight: 600;
}

.mobile-bottom-nav__label {
  max-inline-size: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

body.has-mobile-bottom-nav {
  .layout-page-content {
    padding-block-end: 48px;
  }

  .layout-wrapper.layout-content-height-fixed {
    .layout-content-wrapper {
      max-block-size: calc(100dvh - 48px);
    }
  }
}

// Denser sidebar items on phone overlay drawer
@media (max-width: 1279.98px) {
  .layout-vertical-nav.overlay-nav {
    .nav-link > .nav-link-row,
    .nav-link > a,
    .nav-group > .nav-group-label {
      block-size: 2.25rem;
      margin-block-end: 0.25rem;
    }
  }
}
</style>
