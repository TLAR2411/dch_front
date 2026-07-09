<script setup>
import { ref, watch, computed } from "vue";
import { debounce } from "lodash";
import { useI18n } from "vue-i18n";
import formatGender from "@/utils/formater/formatGender";

const { t } = useI18n();

const props = defineProps({
  itemData: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  classData: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  isDialogVisibleStudentClass: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    required: false,
    default: undefined,
  },
});

const emit = defineEmits([
  "onCreateStudentClass",
  "onUpdate",
  "update:isDialogVisibleStudentClass",
]);

const students = ref([]);
const loadingTable = ref(false);
const search = ref("");

const itemData = ref({
  student_id: [],
  //   ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    students.value = newData ?? [];
    itemData.value = {
      student_id: newData?.student_id ?? [],
      ...newData,
    };
  },
  { immediate: true, deep: true },
);

const resetData = () => {
  itemData.value = { student_id: [] };
  search.value = "";
};

const onFormSubmit = debounce(() => {
  console.log("item", itemData.value);
  emit("onCreateStudentClass", itemData.value, (res) => {
    if (res) resetData();
  });
}, 500);

const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisibleStudentClass", false);
};

const selectedCount = computed(() => itemData.value.student_id?.length ?? 0);

const headers = [
  { title: t("Name Kh"), key: "name_kh" },
  { title: t("Name En"), key: "name_en" },
  {
    title: t("Gender"),
    key: "gender",
    visible: true,
    value: (item) => formatGender(item.gender, t),
  },
  {
    title: t("date_of_birth"),
    key: "dob",
    visible: true,
    value: (item) => formatDate(item.dob),
  },
];
</script>

<template>
  <VDialog
    :model-value="isDialogVisibleStudentClass"
    max-width="700"
    @update:model-value="emit('update:isDialogVisibleStudentClass', $event)"
  >
    <VCard class="scd-card">
      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="scd-header">
        <span class="scd-title">
          {{ itemData.id ? t("Update student") : t("Add students to class") }}
          <span class="scd-chip">
            <VIcon icon="tabler-school" size="13" class="scd-chip-icon" />
            {{ props.classData?.name_en }}
          </span>
        </span>
        <button class="scd-close" type="button" @click="onCloseDialog">
          <VIcon icon="tabler-x" size="16" />
        </button>
      </div>

      <!-- ── Body ───────────────────────────────────────────── -->
      <div class="scd-body">
        <!-- Search -->
        <div class="scd-search-wrap">
          <VIcon icon="tabler-search" size="15" class="scd-search-icon" />
          <input
            v-model="search"
            class="scd-search-input"
            :placeholder="t('Search by name…')"
            type="text"
          />
        </div>

        <!-- Table -->
        <div class="scd-table-wrap">
          <VDataTable
            v-model="itemData.student_id"
            :search="search"
            :loading="loadingTable"
            :headers="headers"
            :items="students"
            item-value="id"
            show-select
            hover
            class="scd-table"
          >
            <template #item.gender="{ item }">
              <span
                :class="[
                  'scd-gender',
                  item.gender === 'M' ? 'scd-gender--m' : 'scd-gender--f',
                ]"
              >
                {{ formatGender(item.gender, t) }}
              </span>
            </template>
          </VDataTable>
        </div>
      </div>

      <!-- ── Footer ─────────────────────────────────────────── -->
      <div class="scd-footer">
        <span class="scd-count">
          <strong>{{ selectedCount }}</strong> {{ t("students selected") }}
        </span>
        <div class="scd-actions">
          <button
            class="scd-btn scd-btn--cancel"
            type="button"
            @click="onCloseDialog"
          >
            {{ t("Cancel") }}
          </button>
          <button
            class="scd-btn scd-btn--primary"
            type="button"
            :disabled="props.loading"
            @click="onFormSubmit"
          >
            <VProgressCircular
              v-if="props.loading"
              size="14"
              width="2"
              indeterminate
            />
            <span v-else>{{ t("Save changes") }}</span>
          </button>
        </div>
      </div>
    </VCard>
  </VDialog>
</template>

<style scoped>
/* ── Card shell ─────────────────────────────────────────────── */
.scd-card {
  border-radius: 12px !important;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────── */
.scd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 16px;
  border-bottom: 0.5px solid
    rgba(var(--v-border-color), var(--v-border-opacity));
}

.scd-title {
  font-size: 0.9375rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 1);
}

.scd-close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 0.5px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.55);
  transition: background 0.15s;
}

.scd-close:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

/* ── Class banner ───────────────────────────────────────────── */
.scd-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-bottom: 1px solid;
  margin: 10px 30px;
}

.scd-banner-label {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.scd-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 99px;
  border: 0.5px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-surface), 1);
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.scd-chip-icon {
  color: #4361ee;
}

/* ── Body ───────────────────────────────────────────────────── */
.scd-body {
  padding: 16px 20px;
}

/* Search */
.scd-search-wrap {
  position: relative;
  margin-bottom: 14px;
}

.scd-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(var(--v-theme-on-surface), 0.45);
  pointer-events: none;
}

.scd-search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: 0.5px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  font-size: 0.8125rem;
  background: rgba(var(--v-theme-surface), 1);
  color: rgba(var(--v-theme-on-surface), 0.87);
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.scd-search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.scd-search-input:focus {
  border-color: #4361ee;
  box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.12);
}

/* Table wrapper */
.scd-table-wrap {
  border: 0.5px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
}

.scd-table :deep(th) {
  font-size: 0.6875rem !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  white-space: nowrap;
  background: rgba(var(--v-theme-surface-variant), 0.1) !important;
}

.scd-table :deep(td) {
  font-size: 0.8125rem !important;
}

.scd-table :deep(tr:hover td) {
  background: rgba(var(--v-theme-surface-variant), 0.01);
}

/* Selected row tint */
.scd-table :deep(tr.v-data-table__tr--selected td) {
  background: rgba(28, 77, 15, 0.06) !important;
}

/* Checkbox accent */
.scd-table :deep(.v-checkbox-btn .v-icon) {
  color: #083e14;
}

/* Gender pill */
.scd-gender {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 500;
}

.scd-gender--m {
  background: rgba(67, 97, 238, 0.1);
  color: #4361ee;
}

.scd-gender--f {
  background: rgba(212, 83, 126, 0.1);
  color: #993556;
}

/* ── Footer ─────────────────────────────────────────────────── */
.scd-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 0.5px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.scd-count {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.scd-count strong {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.scd-actions {
  display: flex;
  gap: 8px;
}

.scd-btn {
  padding: 7px 16px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border: 0.5px solid rgba(var(--v-border-color), var(--v-border-opacity));
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.scd-btn--cancel {
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.scd-btn--cancel:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.scd-btn--primary {
  background: #4361ee;
  color: #ffffff;
  border-color: #4361ee;
  min-width: 108px;
  justify-content: center;
}

.scd-btn--primary:hover:not(:disabled) {
  background: #3451d1;
}

.scd-btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
