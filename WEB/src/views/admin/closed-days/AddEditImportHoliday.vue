<script setup>
import { ref, watch, computed } from "vue";
import { debounce } from "lodash";

const props = defineProps({
  itemData: {
    type: Array,
    required: false,
    default: () => [],
  },
  isDialogImportHoliday: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
  fetchLoading: {
    type: Boolean,
    required: false,
    default: false,
  },
  importYear: {
    type: [Number, String],
    required: false,
    default: () => new Date().getFullYear(),
  },
});

const emit = defineEmits([
  "onCreateHoliday",
  "update:isDialogImportHoliday",
  "update:importYear",
  "on-load-year",
]);

const selectedHolidays = ref([]);
const localYear = ref(Number(props.importYear) || new Date().getFullYear());

const yearOptions = computed(() => {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current - 2; y <= current + 10; y++) {
    years.push(y);
  }
  // Keep custom typed year in the list if outside the range
  if (localYear.value && !years.includes(Number(localYear.value))) {
    years.unshift(Number(localYear.value));
    years.sort((a, b) => a - b);
  }
  return years;
});

const isAllSelected = computed(
  () =>
    props.itemData.length > 0 &&
    selectedHolidays.value.length === props.itemData.length,
);

const isIndeterminate = computed(
  () =>
    selectedHolidays.value.length > 0 &&
    selectedHolidays.value.length < props.itemData.length,
);

watch(
  () => props.importYear,
  (val) => {
    if (val != null && Number(val) !== Number(localYear.value)) {
      localYear.value = Number(val);
    }
  },
);

watch(
  () => props.isDialogImportHoliday,
  (open) => {
    if (open) {
      selectedHolidays.value = [];
      if (!localYear.value) {
        localYear.value = new Date().getFullYear();
      }
      emit("update:importYear", Number(localYear.value));
      emit("on-load-year", Number(localYear.value));
    }
  },
);

watch(
  () => props.itemData,
  () => {
    selectedHolidays.value = [];
  },
);

const onYearChange = (year) => {
  const nextYear = Number(String(year).trim());
  if (!nextYear || Number.isNaN(nextYear) || nextYear < 1900 || nextYear > 2100) {
    return;
  }
  localYear.value = nextYear;
  selectedHolidays.value = [];
  emit("update:importYear", nextYear);
  emit("on-load-year", nextYear);
};

const toggleAll = () => {
  if (isAllSelected.value) {
    selectedHolidays.value = [];
  } else {
    selectedHolidays.value = [...props.itemData];
  }
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const onCloseDialog = () => {
  selectedHolidays.value = [];
  emit("update:isDialogImportHoliday", false);
};

const onImport = debounce(() => {
  emit(
    "onCreateHoliday",
    {
      holidays: selectedHolidays.value,
      year: Number(localYear.value),
    },
    (res) => {
      if (res) {
        selectedHolidays.value = [];
        emit("update:isDialogImportHoliday", false);
      }
    },
  );
}, 500);
</script>

<template>
  <VDialog
    :model-value="isDialogImportHoliday"
    max-width="680"
    scrollable
    @update:model-value="emit('update:isDialogImportHoliday', $event)"
  >
    <VCard class="hid-card">
      <!-- Header -->
      <div class="hid-header">
        <div class="hid-header-left">
          <div class="hid-icon-wrap">
            <VIcon icon="tabler-calendar-event" size="16" />
          </div>
          <div>
            <div class="hid-title">Import Public Holidays</div>
            <div class="hid-subtitle">Cambodia national holidays</div>
          </div>
        </div>
        <button class="hid-close" type="button" @click="onCloseDialog">
          <VIcon icon="tabler-x" size="15" />
        </button>
      </div>

      <!-- Year picker -->
      <div class="hid-year-bar">
        <div class="hid-year-label">Import year</div>
        <div class="hid-year-controls">
          <AppCombobox
            :model-value="localYear"
            :items="yearOptions"
            
            placeholder="Select or type year"
            density="compact"
            hide-details
            autocomplete="off"
            class="hid-year-select"
            @update:model-value="onYearChange"
          />
          <VBtn
            variant="tonal"
            color="primary"
            density="comfortable"
            prepend-icon="tabler-refresh"
            :loading="fetchLoading"
            :disabled="fetchLoading || !localYear"
            @click="onYearChange(localYear)"
          >
            Load
          </VBtn>
        </div>
      </div>

      <!-- Selection bar -->
      <div class="hid-selection-bar">
        <label class="hid-check-all" @click.prevent="toggleAll">
          <div
            class="hid-checkbox"
            :class="{
              'is-checked': isAllSelected,
              'is-indeterminate': isIndeterminate,
            }"
          >
            <VIcon v-if="isAllSelected" icon="tabler-check" size="11" />
            <VIcon v-else-if="isIndeterminate" icon="tabler-minus" size="11" />
          </div>
          <span>Select all</span>
        </label>
        <span class="hid-count">
          {{ selectedHolidays.length }} / {{ itemData.length }} selected
          <template v-if="localYear"> · {{ localYear }}</template>
        </span>
      </div>

      <!-- Table -->
      <VCardText class="hid-body">
        <div v-if="fetchLoading" class="hid-empty">
          <VProgressCircular indeterminate size="28" width="2" />
          <div class="mt-2">Loading holidays for {{ localYear }}…</div>
        </div>

        <div v-else-if="!itemData.length" class="hid-empty">
          <VIcon icon="tabler-calendar-off" size="28" style="opacity: 0.35" />
          <div class="mt-2">
            No holidays found for {{ localYear || "this year" }}.
          </div>
          <div class="hid-empty-hint">
            Choose a year above, then click Load.
          </div>
        </div>

        <div v-else class="hid-list">
          <div
            v-for="(holiday, index) in itemData"
            :key="`${holiday.date}-${index}`"
            class="hid-row"
            :class="{ 'is-selected': selectedHolidays.includes(holiday) }"
            @click="
              selectedHolidays.includes(holiday)
                ? (selectedHolidays = selectedHolidays.filter(
                    (h) => h !== holiday,
                  ))
                : selectedHolidays.push(holiday)
            "
          >
            <div
              class="hid-checkbox"
              :class="{ 'is-checked': selectedHolidays.includes(holiday) }"
            >
              <VIcon
                v-if="selectedHolidays.includes(holiday)"
                icon="tabler-check"
                size="11"
              />
            </div>
            <div class="hid-row-content">
              <div class="hid-row-name">{{ holiday.name }}</div>
              <div class="hid-row-local">{{ holiday.localName }}</div>
            </div>
            <div class="hid-row-date">
              {{ formatDate(holiday.date) }}
            </div>
          </div>
        </div>
      </VCardText>

      <!-- Footer -->
      <div class="hid-footer">
        <button
          class="hid-btn hid-btn-cancel"
          type="button"
          @click="onCloseDialog"
        >
          Cancel
        </button>
        <button
          class="hid-btn hid-btn-import"
          type="button"
          :disabled="
            selectedHolidays.length === 0 || loading || !localYear
          "
          @click="onImport"
        >
          <VIcon
            v-if="loading"
            icon="tabler-loader-2"
            size="15"
            class="hid-spin"
          />
          <VIcon v-else icon="tabler-download" size="15" />
          Import
          {{
            selectedHolidays.length > 0 ? `(${selectedHolidays.length})` : ""
          }}
        </button>
      </div>
    </VCard>
  </VDialog>
</template>

<style scoped>
.hid-card {
  border-radius: 14px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.hid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}

.hid-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hid-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hid-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 1);
  line-height: 1.3;
}

.hid-subtitle {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
  margin-top: 1px;
}

.hid-close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.45);
  transition: background 0.15s;
  flex-shrink: 0;
}

.hid-close:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.hid-year-bar {
  padding: 12px 20px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}

.hid-year-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.55);
  margin-bottom: 8px;
}

.hid-year-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hid-year-select {
  flex: 1;
  min-width: 0;
}

.hid-selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}

.hid-check-all {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  user-select: none;
}

.hid-count {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.hid-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid
    rgba(var(--v-border-color), calc(var(--v-border-opacity) * 2));
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background 0.12s,
    border-color 0.12s;
  color: #fff;
}

.hid-checkbox.is-checked,
.hid-checkbox.is-indeterminate {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
}

.hid-body {
  padding: 8px 12px !important;
  overflow-y: auto;
  max-height: 420px;
}

.hid-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 36px 16px;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.hid-empty-hint {
  margin-top: 4px;
  font-size: 0.75rem;
  opacity: 0.75;
}

.hid-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hid-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
  border: 1px solid transparent;
}

.hid-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.hid-row.is-selected {
  background: rgba(var(--v-theme-primary), 0.06);
  border-color: rgba(var(--v-theme-primary), 0.15);
}

.hid-row-content {
  flex: 1;
  min-width: 0;
}

.hid-row-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hid-row-local {
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.4);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hid-row-date {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  white-space: nowrap;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.hid-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-shrink: 0;
}

.hid-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition:
    background 0.15s,
    opacity 0.15s;
  border: none;
}

.hid-btn-cancel {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.hid-btn-cancel:hover {
  background: rgba(var(--v-theme-on-surface), 0.1);
}

.hid-btn-import {
  background: rgb(var(--v-theme-primary));
  color: #fff;
}

.hid-btn-import:hover:not(:disabled) {
  opacity: 0.88;
}

.hid-btn-import:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.hid-spin {
  animation: spin 0.8s linear infinite;
}
</style>
