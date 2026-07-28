<script setup>
import { layoutConfig } from "@layouts";
import { can } from "@layouts/plugins/casl";
import { useLayoutConfigStore } from "@layouts/stores/config";
import {
  getComputedNavLinkToProp,
  getDynamicI18nProps,
  isNavLinkActive,
} from "@layouts/utils";
import hasPermission from "@/utils/hasPermission.js";

const props = defineProps({
  item: {
    type: null,
    required: true,
  },
});

const configStore = useLayoutConfigStore();
const hideTitleAndBadge = configStore.isVerticalNavMini();
</script>

<template>
  <li
    v-if="
      can(item.action, item.subject) &&
      (!item.permission || hasPermission(item.permission))
    "
    class="nav-link"
    :class="{
      disabled: item.disable,
      'nav-link--with-create': item.createTo && !hideTitleAndBadge,
    }"
  >
    <div
      class="nav-link-row"
      :class="{
        'router-link-active router-link-exact-active border-md':
          isNavLinkActive(item, $router),
      }"
    >
      <Component
        :is="item.to ? 'RouterLink' : 'a'"
        v-bind="getComputedNavLinkToProp(item)"
        class="nav-link-main"
      >
        <Component
          :is="layoutConfig.app.iconRenderer || 'div'"
          v-bind="item.icon || layoutConfig.verticalNav.defaultNavItemIconProps"
          class="nav-item-icon"
          :style="{
            'color: white !important': isNavLinkActive(item, $router),
          }"
        />
        <TransitionGroup name="transition-slide-x">
          <!-- 👉 Title -->
          <Component
            :is="layoutConfig.app.i18n.enable ? 'i18n-t' : 'span'"
            v-show="!hideTitleAndBadge"
            key="title"
            class="nav-item-title pt-1"
            v-bind="getDynamicI18nProps(item.title, 'span')"
          >
            {{ item.title }}
          </Component>

          <!-- 👉 Badge -->
          <VBadge
            v-if="item.badge?.content"
            :content="item.badge?.content"
            :color="item.badge?.color"
            class="mr-2"
          />
        </TransitionGroup>
      </Component>

      <!-- Create (+) — sibling, not nested inside main link -->
      <RouterLink
        v-if="item.createTo && !hideTitleAndBadge"
        :to="item.createTo"
        class="nav-link-create bg-primary mr-1"
        title="Create"
        @click.stop
      >
        <VIcon icon="tabler-plus" size="18" />
      </RouterLink>
    </div>
  </li>
</template>

<style lang="scss">
.layout-vertical-nav {
  .nav-link {
    .nav-link-row {
      display: flex;
      align-items: center;
      width: 100%;
      min-block-size: inherit;
    }

    .nav-link-main {
      display: flex;
      flex: 1;
      align-items: center;
      min-inline-size: 0;
      color: inherit;
      text-decoration: none;
    }

    .nav-link-create {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      margin-inline-start: 0.25rem;
      border-radius: 0.35rem;
      block-size: 1.75rem;
      inline-size: 1.75rem;
      color: inherit;
      opacity: 0.1;
      height: 100%;
      width: 15%;
      text-decoration: none;
      transition: opacity 0.15s ease, background-color 0.15s ease;

      &:hover,
      &:active,
      &:focus-visible,
      &.router-link-active,
      &.router-link-exact-active {
        opacity: 1;
        background-color: rgba(var(--v-theme-on-surface), 0.08);
      }
    }

    // Active (green) row: keep + readable and in the same bar
    .nav-link-row.router-link-exact-active {
      .nav-link-create {
        color: rgb(var(--v-theme-on-primary));
        opacity: 1;

        &:hover {
          background-color: rgba(var(--v-theme-on-primary), 0.16);
        }
      }
    }

    // Inactive hover (theme usually styles `> a`; row is the interactive child now)
    > .nav-link-row:not(.router-link-exact-active):hover {
      background-color: rgba(var(--v-theme-on-surface), 0.04);
    }
  }
}
</style>
