<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    // ISO string "YYYY-MM-DD", or leave empty/undefined to default to today
    type: String,
    default: "",
  },
  initialDate: {
    type: Date,
    default: () => new Date(),
  },
  showSubmitButton: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue", "submit-date"]);

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n) => String(n).padStart(2, "0");
const toISODate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fromISODate(iso) {
  if (!iso) return new Date(props.initialDate);
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// internal Date object, seeded from v-model (or initialDate if v-model is empty)
const currentDate = ref(fromISODate(props.modelValue));
const draftDate = ref(new Date(currentDate.value));
const menuOpen = ref(false);
const pickerOpen = ref(false);
const status = ref(null); // null | 'saving' | 'saved' | 'error'

// keep parent in sync any time currentDate changes internally
watch(
  currentDate,
  (d) => {
    emit("update:modelValue", toISODate(d));
  },
  { immediate: true },
);

// if parent changes v-model externally, follow it
watch(
  () => props.modelValue,
  (iso) => {
    const next = fromISODate(iso);
    if (toISODate(next) !== toISODate(currentDate.value)) {
      currentDate.value = next;
      draftDate.value = next;
    }
  },
);

function shiftDate(delta) {
  const next = new Date(currentDate.value);
  next.setDate(next.getDate() + delta);
  currentDate.value = next;
  draftDate.value = next;
  status.value = null;
}

function goToToday() {
  const today = new Date();
  currentDate.value = today;
  draftDate.value = today;
  menuOpen.value = false;
  status.value = null;
  pickerOpen.value = false;
}

function openPicker() {
  draftDate.value = currentDate.value;
  pickerOpen.value = true;
  menuOpen.value = false;
}

function handleDraftChange(e) {
  const [y, m, d] = e.target.value.split("-").map(Number);
  if (!y || !m || !d) return;
  draftDate.value = new Date(y, m - 1, d);
}

function handleCancel() {
  draftDate.value = currentDate.value;
  pickerOpen.value = false;
}

function handleGo() {
  currentDate.value = draftDate.value;
  pickerOpen.value = false;
  status.value = null;
}

async function handleSubmit() {
  status.value = "saving";
  const isoDate = toISODate(currentDate.value);
  let settled = false;
  const done = (ok = true) => {
    settled = true;
    status.value = ok ? "saved" : "error";
  };
  emit("submit-date", isoDate, done);
  setTimeout(() => {
    if (!settled) status.value = "saved";
  }, 600);
}

function closeMenuOnOutsideClick() {
  menuOpen.value = false;
}
</script>

<template>
  <div class="date-navigator">
    <div class="date-nav-row">
      <VBtn
        variant="tonal"
        size="sm"
        icon="tabler-caret-left"
        @click="shiftDate(-1)"
      >
      </VBtn>
      <VCard
        variant="tonal"
        class="px-5 py-1 text-center font-weight-bold text-primary"
        @click="openPicker"
      >
        <div>
          {{ dayNames[currentDate.getDay()] }},
          {{ monthNames[currentDate.getMonth()] }}
          {{ currentDate.getDate() }}
        </div>
        <!-- <div>{{ currentDate.getFullYear() }}</div> -->
      </VCard>

      <VBtn
        variant="tonal"
        size="sm"
        icon="tabler-caret-right"
        @click="shiftDate(1)"
      />
      <!-- <VBtn
        variant="tonal"
        size="sm"
        icon="tabler-arrow-back-up"
        @click="goToToday"
      /> -->
    </div>

    <div v-if="pickerOpen" class="picker-panel">
      <input
        type="date"
        class="date-input"
        :value="toISODate(draftDate)"
        @input="handleDraftChange"
      />
      <div class="picker-actions">
        <button type="button" class="btn-ghost" @click="goToToday">
          Cancel
        </button>
        <button type="button" class="btn-primary" @click="handleGo">Go</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.date-navigator {
  max-width: 560px;
}

.date-nav-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.square-btn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--bs-border-color, #3a3a3a);
  border-radius: 0.5rem;
  background: var(--bs-body-bg, #1f1f1f);
  color: var(--bs-body-color, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;

  &:hover {
    background: var(--bs-secondary-bg, #2a2a2a);
  }
}

.date-chip {
  flex: 1;
  min-width: 0;
  background: var(--bs-secondary-bg, #2a2a2a);
  border: none;
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  text-align: center;
  cursor: pointer;

  &:hover {
    filter: brightness(1.1);
  }
}

.chip-main {
  font-size: 1rem;
  font-weight: 600;
  color: var(--bs-body-color, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-sub {
  font-size: 0.8125rem;
  color: var(--bs-secondary-color, #aaa);
  margin-top: 2px;
}

.menu-wrap {
  position: relative;
}

.menu-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: var(--bs-body-bg, #2a2a2a);
  border: 1px solid var(--bs-border-color, #3a3a3a);
  border-radius: 0.5rem;
  min-width: 170px;
  overflow: hidden;
  z-index: 20;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  color: var(--bs-body-color, #fff);
  cursor: pointer;

  &:hover {
    background: var(--bs-secondary-bg, #333);
  }
}

.picker-panel {
  margin-top: 0.625rem;
  background: var(--bs-tertiary-bg, #ffffff);
  border: 1px solid var(--bs-border-color, #3a3a3a);
  border-radius: 0.75rem;
  padding: 0.875rem;
}

.date-input {
  width: 100%;
  font-size: 0.9375rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--bs-border-color, #3a3a3a);
  background: var(--bs-body-bg, #ffffff);
  color: var(--bs-body-color, #000000);
  box-sizing: border-box;
}

.picker-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  justify-content: flex-end;
}

.btn-ghost {
  font-size: 0.8125rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--bs-border-color, #3a3a3a);
  background: var(--bs-body-bg, #1f1f1f);
  color: var(--bs-body-color, #fff);
  cursor: pointer;

  &:hover {
    background: var(--bs-secondary-bg, #2a2a2a);
  }
}

.btn-primary {
  font-size: 0.8125rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--bs-primary, #3b6d11);
  background: var(--bs-primary, #3b6d11);
  color: #fff;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}

.submit-row {
  margin-top: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.submit-btn {
  font-size: 0.8125rem;
  padding: 0.5625rem 1.125rem;
  border-radius: 0.5rem;
  background: var(--bs-primary, #3b6d11);
  color: #fff;
  border: none;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
}

.ok-msg {
  font-size: 0.75rem;
  color: var(--bs-success, #8ecf5a);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.err-msg {
  font-size: 0.75rem;
  color: var(--bs-danger, #e57373);
}

@media (max-width: 420px) {
  .square-btn {
    width: 36px;
    height: 36px;
  }
  .chip-main {
    font-size: 0.875rem;
  }
  .chip-sub {
    font-size: 0.6875rem;
  }
}
</style>
