<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import {
  HorizontalNavGroup,
  HorizontalNavLink,
} from '@layouts/components'

const props = defineProps({
  navItems: {
    type: null,
    required: true,
  },
})

const navListRef = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const updateScrollState = () => {
  const el = navListRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 0
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

const scroll = (direction) => {
  const el = navListRef.value
  if (!el) return
  const scrollAmount = el.clientWidth * 0.5
  el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' })
}

const onScroll = () => {
  updateScrollState()
}

const onWheel = (e) => {
  const el = navListRef.value
  if (!el) return
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault()
    el.scrollBy({ left: e.deltaY, behavior: 'smooth' })
  }
}

let resizeObserver = null

watch(() => props.navItems, async () => {
  await nextTick()
  updateScrollState()
}, { deep: true })

onMounted(() => {
  updateScrollState()
  const el = navListRef.value
  if (el) {
    el.addEventListener('wheel', onWheel, { passive: false })
  }
  resizeObserver = new ResizeObserver(() => updateScrollState())
  if (el) resizeObserver.observe(el)
  window.addEventListener('resize', updateScrollState)
})

onUnmounted(() => {
  const el = navListRef.value
  if (el) {
    el.removeEventListener('wheel', onWheel)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', updateScrollState)
})

const dashboardItem = computed(() => {
  const first = props.navItems?.[0]
  if (first && 'to' in first) return first
  return { to: { name: 'root' }, icon: { icon: 'tabler-layout-dashboard' } }
})

const resolveNavItemComponent = item => {
  if ('children' in item)
    return HorizontalNavGroup

  return HorizontalNavLink
}
</script>

<template>
  <div class="horizontal-nav-wrapper">
    <IconBtn
      class="horizontal-nav-scroll-btn horizontal-nav-scroll-left"
      :disabled="!canScrollLeft"
      @click="scroll('left')"
    >
      <VIcon icon="tabler-chevron-left" />
    </IconBtn>

    <!-- <div class="horizontal-nav-dashboard-pill">
      <RouterLink
        :to="dashboardItem.to"
        class="dashboard-pill-link"
      >
        <VIcon :icon="dashboardItem.icon?.icon || 'tabler-layout-dashboard'" />
      </RouterLink>
    </div> -->

    <ul
      ref="navListRef"
      class="nav-items"
      @scroll="onScroll"
    >
      <Component
        :is="resolveNavItemComponent(item)"
        v-for="(item, index) in navItems"
        :key="index"
        data-allow-mismatch
        :item="item"
      />
    </ul>

    <IconBtn
      class="horizontal-nav-scroll-btn horizontal-nav-scroll-right"
      :disabled="!canScrollRight"
      @click="scroll('right')"
    >
      <VIcon icon="tabler-chevron-right" />
    </IconBtn>
  </div>
</template>

<style lang="scss">
.layout-wrapper.layout-nav-type-horizontal {
  .horizontal-nav-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    block-size: 100%;
    min-inline-size: 0;
    flex: 1;
    
  }

  .horizontal-nav-scroll-btn {
    flex-shrink: 0;
    color: rgb(var(--v-theme-on-primary)) !important;
    opacity: 0.7;

    &[disabled] {
      opacity: 0.25;
      pointer-events: none;
    }
  }

  .horizontal-nav-dashboard-pill {
    flex-shrink: 0;

    .dashboard-pill-link {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.15);
      block-size: 2.25rem;
      inline-size: 2.25rem;
      color: rgb(var(--v-theme-on-primary));
      text-decoration: none;
      transition: background 0.2s ease;

      &:hover,
      &.router-link-active {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }

  .nav-items {
    display: flex;
    flex: 1;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    min-inline-size: 0;
    

    &::-webkit-scrollbar {
      display: none;
    }

    > li {
      flex-shrink: 0;
      white-space: nowrap;
    }
  }
}
</style>
