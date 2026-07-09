<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import { auth } from "@/utils/auth";
import { useAuthStore } from "@/stores/authStore";
import { useSettingStore } from "@/stores/settingStore";
import { computed, ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";

const branches = ref(auth()?.branches || []);
const filter = ref({
  branch_id: useSettingStore().branch_id,
});
const { t, locale } = useI18n();

// Helper function to format branches
const formatBranches = (branchList) => {
  if (branchList?.length > 1) {
    const all = [
      {
        name_kh: "គ្រប់សាខា",
        name_en: "All Branch",
        symbol: "AB",
        id: "*",
        province_code: null,
      },
    ];
    return [...all, ...branchList];
  }
  return branchList;
};

const showBranches = computed(() => formatBranches(branches.value));

// Watch for changes in auth().branches
watch(
  () => auth()?.branches,
  (newBranches) => {
    if (newBranches) {
      branches.value = newBranches;
      setBranch();
    }
  },
  { deep: true },
);

onMounted(() => {
  setBranch();
});

const setBranch = () => {
  filter.value.branch_id =
    useSettingStore().branch_id || showBranches?.value[0]?.id || null;

  useSettingStore().setBranchId(filter.value.branch_id);

  const branchSymbol = showBranches.value.find(
    (i) => i.id == filter.value.branch_id,
  )?.symbol;
  const provinceCode = showBranches.value.find(
    (i) => i.id == filter.value.branch_id,
  )?.province_code;

  useSettingStore().setBranchSymbol(branchSymbol);

  useSettingStore().setBranchProvinceCode(provinceCode);
};

const changeBranch = (id) => {
  useSettingStore().setBranchId(id);

  const branchSymbol = showBranches.value.find(
    (i) => i.id == filter.value.branch_id,
  )?.symbol;
  const provinceCode = showBranches.value.find(
    (i) => i.id == id,
  )?.province_code;
  useSettingStore().setBranchSymbol(branchSymbol);
  useSettingStore().setBranchProvinceCode(provinceCode);
};
</script>

<template>
  <VRow class="justify-end">
    <VCol cols="3" sm="6" md="6" lg="5" class="d-flex justify-end">
      <div class="d-flex justify-end">
        <AppAutocomplete
          class="branch-autocomplete"
          :class="{ 'single-branch': branches.length === 1 }"
          v-model="filter.branch_id"
          :items="showBranches"
          :item-title="
            (item) => `${item[locale === 'km' ? 'name_kh' : 'name_en']}`
          "
          item-value="id"
          :readonly="branches.length > 1 ? false : true"
          :disabled="branches.length === 1 ? true : false"
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
