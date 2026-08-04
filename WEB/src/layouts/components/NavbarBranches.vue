<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import { useAuthStore } from "@/stores/authStore";
import { useSettingStore } from "@/stores/settingStore";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const authStore = useAuthStore();
const settingStore = useSettingStore();
const filter = ref({ branch_id: settingStore.branch_id });
const { locale } = useI18n();
const canAccessAllBranches = computed(() => Number(authStore.user?.manage_branch) === 3);

const normalizeBranches = (branchList = []) => {
  const mapped = branchList.map((branch) => ({
    ...branch,
    title: locale.value === "km" ? branch.name_kh : branch.name_en,
    symbol: branch.symbol ?? null,
    province_code: branch.province_code ?? null,
  }));

  if (mapped.length > 1 && canAccessAllBranches.value) {
    return [
      {
        id: "*",
        name_kh: "គ្រប់សាខា",
        name_en: "All Branch",
        title: locale.value === "km" ? "គ្រប់សាខា" : "All Branch",
        symbol: "AB",
        province_code: null,
      },
      ...mapped,
    ];
  }

  return mapped;
};

const showBranches = computed(() => normalizeBranches(authStore.branches || []));

const resolveDefaultBranchId = () => {
  const items = showBranches.value;
  if (!items.length) return null;

  const hasItem = (id) => items.some((item) => String(item.id) === String(id));

  if (canAccessAllBranches.value && hasItem("*")) {
    return "*";
  }

  if (settingStore.branch_id != null && hasItem(settingStore.branch_id)) {
    return settingStore.branch_id;
  }

  if (authStore.user?.branch_id != null && hasItem(authStore.user.branch_id)) {
    return authStore.user.branch_id;
  }

  return items[0]?.id ?? null;
};

const setBranch = () => {
  filter.value.branch_id = resolveDefaultBranchId();
  settingStore.setBranchId(filter.value.branch_id);

  const selectedBranch = showBranches.value.find(
    (item) => String(item.id) === String(filter.value.branch_id),
  );

  settingStore.setBranchSymbol(selectedBranch?.symbol ?? null);
  settingStore.setBranchProvinceCode(selectedBranch?.province_code ?? null);
};

const changeBranch = (id) => {
  filter.value.branch_id = id;
  settingStore.setBranchId(id);

  const selectedBranch = showBranches.value.find(
    (item) => String(item.id) === String(id),
  );

  settingStore.setBranchSymbol(selectedBranch?.symbol ?? null);
  settingStore.setBranchProvinceCode(selectedBranch?.province_code ?? null);
};

watch(
  () => [authStore.branches, authStore.user?.branch_id, locale.value],
  () => {
    setBranch();
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <VRow class="justify-end">
    <VCol cols="3" sm="6" md="6" lg="5" class="d-flex justify-end">
      <div class="d-flex justify-end">
        <AppAutocomplete
          class="branch-autocomplete"
          :class="{ 'single-branch': showBranches.length === 1 }"
          v-model="filter.branch_id"
          :items="showBranches"
          item-title="title"
          item-value="id"
          :readonly="showBranches.length > 1 ? false : true"
          :disabled="showBranches.length === 1 ? true : false"
          @update:model-value="(value) => changeBranch(value)"
          autocomplete="off"
          style="width: 100%; max-width: 230px; min-width: 100px"
        />
      </div>
    </VCol>
  </VRow>
</template>

<style scoped>
.branch-autocomplete.single-branch :deep(.v-field.v-field--disabled) {
  background-color: transparent !important;
  color: inherit !important;
  opacity: 1 !important;
  cursor: default !important;
}
</style>
