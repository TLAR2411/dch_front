<script setup>
import { ref, computed, watch, provide } from "vue";
import { useRoute } from "vue-router";
import { useElementHover } from "@vueuse/core";
import { debounce } from "lodash";
import {
  VerticalNavGroup,
  VerticalNavLink,
  VerticalNavSectionTitle,
} from "@layouts/components";
import { useLayoutConfigStore } from "@layouts/stores/config";
import { injectionKeyIsVerticalNavHovered } from "@layouts/symbols";
import MianLogo from "@images/logo/main-logo-1.svg?url";
import SmallMianLogo from "@images/logo/main-logo-2.svg?url";
import UserFullProfile from "@/layouts/components/UserFullProfile.vue";

const props = defineProps({
  tag: {
    type: null,
    required: false,
    default: "aside",
  },
  navItems: {
    type: null,
    required: true,
  },
  isOverlayNavActive: {
    type: Boolean,
    required: true,
  },
  toggleIsOverlayNavActive: {
    type: Function,
    required: true,
  },
});

const refNav = ref();
const isHovered = useElementHover(refNav);

provide(injectionKeyIsVerticalNavHovered, isHovered);

const configStore = useLayoutConfigStore();
const hideTitleAndBadge = configStore.isVerticalNavMini();

const resolveNavItemComponent = (item) => {
  if ("heading" in item) return VerticalNavSectionTitle;
  if ("children" in item) return VerticalNavGroup;
  return VerticalNavLink;
};

const route = useRoute();

const isVerticalNavScrolled = ref(false);
const updateIsVerticalNavScrolled = (val) => {
  isVerticalNavScrolled.value = val;
};

const handleNavScroll = (evt) => {
  if (evt && evt.target) {
    isVerticalNavScrolled.value = evt.target.scrollTop > 0;
  }
};

const hideTitleAndIcon = configStore.isVerticalNavMini(isHovered);

// Debounced route watcher
watch(
  () => route.name,
  debounce(() => {
    props.toggleIsOverlayNavActive(false);
  }, 100),
);
</script>

<template>
  <Component
    :is="props.tag"
    ref="refNav"
    data-allow-mismatch
    class="layout-vertical-nav"
    style="background-color: rgb(249, 250, 252)"
    :class="[
      {
        'overlay-nav': configStore.isLessThanOverlayNavBreakpoint,
        hovered: isHovered,
        visible: isOverlayNavActive,
        scrolled: isVerticalNavScrolled,
      },
    ]"
  >
    <!-- 👉 Header -->
    <div class="nav-header mr-0 ml-0">
      <slot name="nav-header">
        <div class="app-logo app-title-wrapper w-100">
          <div class="d-flex flex-column justify-center align-center">
            <img
              class="justify-center align-center"
              :src="MianLogo"
              v-if="!hideTitleAndBadge"
              height="50"
              alt="Devfin Logo"
            />
            <img
              class="justify-center align-center"
              :src="SmallMianLogo"
              v-else
              height="32"
            />
            <!-- <span class="mt-3" v-if="!hideTitleAndBadge" style="color: white;"> {{ themeConfig.app.mainTitle }}</span> -->
          </div>
        </div>
      </slot>
    </div>
    <VDivider />
    <slot name="before-nav-items">
      <div class="vertical-nav-items" />
    </slot>
    <slot
      name="nav-items"
      :update-is-vertical-nav-scrolled="updateIsVerticalNavScrolled"
    >
      <ul
        v-if="navItems && navItems.length"
        class="nav-items"
        @scroll="handleNavScroll"
      >
        <Component
          :is="resolveNavItemComponent(item)"
          v-for="(item, index) in navItems"
          :key="index"
          :item="item"
        />
      </ul>
    </slot>
    <!-- <PerfectScrollbar
      :key="configStore.isAppRTL"
      tag="ul"
      class="nav-items"
      :options="{ wheelPropagation: false }"
      @ps-scroll-y="handleNavScroll"
    >
      <Component
        :is="resolveNavItemComponent(item)"
        v-for="(item, index) in navItems"
        :key="index"
        :item="item"
      />
    </PerfectScrollbar> -->
    <VDivider />
    <slot name="after-nav-items">
      <VCol>
        <UserFullProfile />
        <!-- <UserProfile /> -->
      </VCol>
    </slot>
  </Component>
</template>

<style lang="scss">
@use "@configured-variables" as variables;
@use "@layouts/styles/mixins";

.app-logo {
  display: flex;
  align-items: center;
  column-gap: 0.75rem;
  justify-content: center;

  .app-logo-title {
    font-size: 1.375rem;
    font-weight: 700;
    letter-spacing: 0.25px;
    line-height: 1.5rem;
    text-transform: capitalize;
  }
}

// 👉 Vertical Nav
.layout-vertical-nav {
  position: fixed;
  z-index: variables.$layout-vertical-nav-z-index;
  display: flex;
  flex-direction: column;
  block-size: 100%;
  inline-size: variables.$layout-vertical-nav-width;
  inset-block-start: 0;
  inset-inline-start: 0;
  transition:
    inline-size 0.25s ease-in-out,
    box-shadow 0.25s ease-in-out;
  will-change: transform, inline-size;

  .nav-header {
    display: flex;
    align-items: center;

    .header-action {
      cursor: pointer;

      @at-root {
        #{variables.$selector-vertical-nav-mini} .nav-header .header-action {
          &.nav-pin,
          &.nav-unpin {
            display: none !important;
          }
        }
      }
    }
  }

  .app-title-wrapper {
    margin-inline-end: auto;
  }

  .nav-items {
    block-size: 100%;
    overflow-y: auto;
    overflow-x: hidden;

    // Modern scrollbar styling
    scrollbar-width: thin;
    scrollbar-color: rgba(var(--v-theme-on-surface), 0.12) transparent;

    // Webkit scrollbar styling
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(var(--v-theme-on-surface), 0.12);
      border-radius: 6px;
      transition: background-color 0.2s ease;
    }

    &::-webkit-scrollbar-thumb:hover {
      background-color: rgba(var(--v-theme-on-surface), 0.16);
    }

    &::-webkit-scrollbar-thumb:active {
      background-color: rgba(var(--v-theme-on-surface), 0.24);
    }

    // Smooth scrolling
    scroll-behavior: smooth;

    // Better touch scrolling on mobile
    -webkit-overflow-scrolling: touch;
  }

  .nav-item-title {
    overflow: hidden;
    margin-inline-end: auto;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 👉 Collapsed
  .layout-vertical-nav-collapsed & {
    &:not(.hovered) {
      inline-size: variables.$layout-vertical-nav-collapsed-width;
    }
  }
}

// Small screen vertical nav transition
@media (max-width: 1279px) {
  .layout-vertical-nav {
    &:not(.visible) {
      transform: translateX(-#{variables.$layout-vertical-nav-width});

      @include mixins.rtl {
        transform: translateX(variables.$layout-vertical-nav-width);
      }
    }

    transition: transform 0.25s ease-in-out;
  }
}
</style>
