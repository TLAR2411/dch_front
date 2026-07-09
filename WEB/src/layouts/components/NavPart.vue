<script setup>
import { usePartStore } from "@/stores/partStore";
import { storeToRefs } from "pinia";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const partStore = usePartStore();
const { system_part } = storeToRefs(partStore);

const partConfig = computed(() => {
  const configs = {
    admin: {
      label: t("Admin System"),
      icon: "tabler-settings",
      color: "primary",
    },
    khmer: {
      label: t("Khmer System"),
      icon: "tabler-folder-open",
      color: "success",
    },
    english: {
      label: t("English System"),
      icon: "tabler-folder-open",
      color: "info",
    },
    chinese: {
      label: t("Chinese System"),
      icon: "tabler-folder-open",
      color: "warning",
    },
  };

  return configs[system_part.value] ?? null;
});
</script>

<template>
  <VChip
    v-if="partConfig"
    class="nav-part-chip ms-2 ms-sm-3"
    :color="partConfig.color"
    variant="tonal"
    size="small"
    pill
    label
    :prepend-icon="partConfig.icon"
  >
    <span class="nav-part-chip__label d-none d-sm-inline">
      {{ partConfig.label }}
    </span>
  </VChip>
</template>

<style scoped>
.nav-part-chip {
  font-weight: 500;
  letter-spacing: 0.01em;
}

.nav-part-chip :deep(.v-chip__prepend) {
  margin-inline-end: 4px;
}

.nav-part-chip__label {
  line-height: 1.2;
}
</style>
