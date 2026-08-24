<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import { useAuthStore } from "@/stores/authStore";
import { useSettingStore } from "@/stores/settingStore";
import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { useI18n } from "vue-i18n";

const authStore = useAuthStore();
const settingStore = useSettingStore();
const filter = ref({ branch_id: settingStore.branch_id });
const { locale } = useI18n();
const { smAndDown } = useDisplay();
const canAccessAllBranches = computed(() => Number(authStore.user?.manage_branch) === 3);
const canSwitchBranch = computed(() => showBranches.value.length > 1);

const normalizeBranchId = (id) => {
  if (id == null || id === "") return null;
  if (id === "*") return "*";
  const n = Number(id);
  return Number.isFinite(n) ? n : id;
};

const branchTitle = (branch) => {
  if (locale.value === "km") {
    return branch.name_kh || branch.name_en || "";
  }
  return branch.name_en || branch.name_kh || "";
};

const normalizeBranches = (branchList = []) => {
  const mapped = branchList.map((branch) => ({
    ...branch,
    id: normalizeBranchId(branch.id),
    title: branchTitle(branch),
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

const selectedBranch = computed(() =>
  showBranches.value.find(
    (item) => String(item.id) === String(filter.value.branch_id),
  ),
);

const resolveDefaultBranchId = () => {
  const items = showBranches.value;
  if (!items.length) return null;

  // Always return the item's id (canonical type) so AppAutocomplete/VSelect
  // can match item-value and show the branch name, not the raw stored id.
  const findItemId = (id) => {
    const item = items.find((entry) => String(entry.id) === String(id));
    return item ? item.id : null;
  };

  // Prefer the branch already selected (persisted) so refresh keeps Battambang etc.
  if (settingStore.branch_id != null) {
    const matched = findItemId(settingStore.branch_id);
    if (matched != null) return matched;
  }

  if (authStore.user?.branch_id != null) {
    const matched = findItemId(authStore.user.branch_id);
    if (matched != null) return matched;
  }

  if (canAccessAllBranches.value) {
    const matched = findItemId("*");
    if (matched != null) return matched;
  }

  return items[0]?.id ?? null;
};

const setBranch = () => {
  // Branches load async after persist hydrates. If we resolve against an empty
  // list we get null and wipe the saved branch (e.g. Battambang → All Branch
  // on every refresh).
  if (!showBranches.value.length) return;

  const nextId = resolveDefaultBranchId();
  if (nextId == null) return;

  filter.value.branch_id = nextId;
  if (String(settingStore.branch_id) !== String(nextId)) {
    settingStore.setBranchId(nextId);
  } else if (settingStore.branch_id !== nextId) {
    // Same branch, but type may still be string "1" from API/localStorage.
    settingStore.setBranchId(nextId);
  }

  const selected = showBranches.value.find(
    (item) => String(item.id) === String(nextId),
  );

  settingStore.setBranchSymbol(selected?.symbol ?? null);
  settingStore.setBranchProvinceCode(selected?.province_code ?? null);
};

const changeBranch = (id) => {
  if (id == null || id === "") return;

  const nextId = normalizeBranchId(id);
  if (nextId == null) return;

  // Compare against the store, not filter.branch_id. AppAutocomplete's v-model
  // updates filter first, so comparing to filter always early-returns and the
  // store stays on "*" (All Branch). Refresh then restores All Branch and
  // scoped pages never reload.
  if (String(nextId) === String(settingStore.branch_id)) {
    filter.value.branch_id = nextId;
    if (settingStore.branch_id !== nextId) {
      settingStore.setBranchId(nextId);
    }
    return;
  }

  filter.value.branch_id = nextId;
  settingStore.setBranchId(nextId);

  const selected = showBranches.value.find(
    (item) => String(item.id) === String(nextId),
  );

  settingStore.setBranchSymbol(selected?.symbol ?? null);
  settingStore.setBranchProvinceCode(selected?.province_code ?? null);
};

watch(
  () => [authStore.branches, authStore.user?.branch_id, settingStore.branch_id, locale.value],
  () => {
    setBranch();
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <!-- Mobile: building icon only -->
  <IconBtn
    v-if="smAndDown"
    class="navbar-branch-icon-btn flex-shrink-0"
    :aria-label="selectedBranch?.title || $t('Branch')"
    :disabled="!canSwitchBranch"
  >
    <VIcon size="24" icon="tabler-building" />
    <VMenu
      v-if="canSwitchBranch"
      activator="parent"
      location="bottom end"
      offset="6"
      class="pa-0"
    >
      <VList size="small" class="py-1 navbar-branch-menu">
        <VListItem
          v-for="item in showBranches"
          :key="item.id"
          size="small"
          :active="String(item.id) === String(filter.branch_id)"
          @click="changeBranch(item.id)"
        >
          <VListItemTitle>{{ item.title }}</VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </IconBtn>

  <!-- Desktop: autocomplete -->
  <AppAutocomplete
    v-else
    class="branch-autocomplete navbar-branch-select"
    :class="{ 'single-branch': !canSwitchBranch }"
    v-model="filter.branch_id"
    :items="showBranches"
    item-title="title"
    item-value="id"
    density="compact"
    hide-details
    :readonly="!canSwitchBranch"
    :disabled="!canSwitchBranch"
    @update:model-value="(value) => changeBranch(value)"
    autocomplete="off"
  />
</template>

<style scoped>
.navbar-branch-select {
  flex-shrink: 1;
  min-inline-size: 72px;
  max-inline-size: 160px;
  inline-size: 140px;
}

.branch-autocomplete.single-branch :deep(.v-field.v-field--disabled) {
  background-color: transparent !important;
  color: inherit !important;
  opacity: 1 !important;
  cursor: default !important;
}
</style>
