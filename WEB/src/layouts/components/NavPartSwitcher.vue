<script setup>
import { usePartStore } from "@/stores/partStore";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import hasPermission from "@/utils/hasPermission.js";
import { getPartHomeRoute } from "@/utils/partHomeRoutes";
import { auth } from "@/utils/auth.js";

const { t } = useI18n();
const router = useRouter();
const partStore = usePartStore();
const { system_part } = storeToRefs(partStore);

const PARTS = [
  {
    title: "Khmer System",
    part: "khmer",
    icon: "tabler-folder-open",
    color: "success",
    permission: "allow-part-khmer",
  },
  {
    title: "English System",
    part: "english",
    icon: "tabler-folder-open",
    color: "info",
    permission: "allow-part-english",
  },
  {
    title: "Chinese System",
    part: "chinese",
    icon: "tabler-folder-open",
    color: "warning",
    permission: "allow-part-chinese",
  },
  {
    title: "Admin System",
    part: "admin",
    icon: "tabler-settings",
    color: "primary",
    permission: "allow-part-admin",
  },
];

const systemParts = computed(() =>
  PARTS.filter((p) => hasPermission(p.permission)).map((p) => ({
    ...p,
    active: system_part.value === p.part,
  })),
);

const current = computed(
  () => PARTS.find((p) => p.part === system_part.value) ?? null,
);

// route names that actually exist (matches your nav config)
const switchPart = (part) => {
  if (part === system_part.value) return;
  partStore.setSystemPart(part); // also sets cur_id
  router.push(getPartHomeRoute(part, auth()?.permissions || []));
};

// const switchPart = (newPart) => {
//   if (newPart === system_part.value) return;
//   partStore.setSystemPart(newPart); // also sets cur_id
//   const cur = router.currentRoute.value;
//   const name = cur.name?.toString() ?? "";
//   // which part does the current route belong to? (e.g. "english-teachers" -> "english")
//   const oldPrefix = PART_PREFIXES.find(
//     (p) => name === p || name.startsWith(`${p}-`),
//   );
//   // Not a part-namespaced route -> just stay where we are.
//   if (!oldPrefix) return;
//   // Try the same page under the new part (e.g. english-teachers -> khmer-teachers)
//   const candidate = name.replace(new RegExp(`^${oldPrefix}-`), `${newPart}-`);
//   if (router.hasRoute(candidate)) {
//     router.push({ name: candidate, params: cur.params, query: cur.query });
//     return;
//   }
//   // No equivalent page in the new part (e.g. khmer-students doesn't exist)
//   // -> stay on the current page instead of jumping to a dashboard.
// };
</script>

<template>
  <VBtn
    size="small"
    variant="flat"
    :color="current?.color ?? 'primary'"
    :prepend-icon="current?.icon"
    class="navbar-part-switcher"
  >
    <span class="d-none d-md-inline">
      {{ current ? t(current.title) : t("Switch Part") }}
    </span>
    <VMenu activator="parent" location="bottom end" offset="6" class="pa-0">
      <VList size="small" class="pa-0">
        <VListItem
          size="small"
          class="pa-0"
          v-for="item in systemParts"
          :key="item.part"
          :active="item.active"
          @click="switchPart(item.part)"
        >
          <template #prepend>
            <VIcon :icon="item.icon" size="20" />
          </template>
          <VListItemTitle>{{ t(item.title) }}</VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </VBtn>
</template>
