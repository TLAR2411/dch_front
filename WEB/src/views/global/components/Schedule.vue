<script setup>
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";
import { getSubjects, getWeekdays } from "@/services/dataService";
import { useSettingStore } from "@/stores/settingStore";
import supabase from "@/utils/supabase";
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

import { useDisplay } from "vuetify";

const { xs } = useDisplay();

const props = defineProps({
  class_id: {
    type: Number,
  },
});

const store = useSettingStore();

watch(
  () => store.branch_id,
  async (newVal) => {
    if (newVal) {
      subjects.value = await getSubjects();
    }
  },
);

const isLoading = ref(true);
const isMobile = ref(false);

const DAYS = ref([]);
const subjects = ref([]);
const subjectColorMap = ref({});
const STEP_MIN = 60;
const schedules = ref([]);

const selectedDayId = ref(null);
const todayDayId = ref(null);
const transitionDirection = ref("left");

const dialog = ref(false);
const editingId = ref(null);
const form = ref({
  subject_id: "",
  day_id: 1,
  start: "",
  end: "",
});

const COLORS = [
  "s-blue",
  "s-orange",
  "s-green",
  "s-purple",
  "s-red",
  "s-pink",
  "s-teal",
  "s-yellow",
  "s-indigo",
  "s-cyan",
  "s-lime",
  "s-amber",
];

const JS_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function handleResize() {
  isMobile.value = window.innerWidth < 600;
}

function getSubjectColor(subject_id) {
  if (!subjectColorMap.value[subject_id]) {
    const index = subjects.value.findIndex((s) => s.id === subject_id);
    subjectColorMap.value[subject_id] = COLORS[index % COLORS.length];
  }
  return subjectColorMap.value[subject_id];
}

const toMin = (t) => {
  if (!t) return 0;
  const parts = t.split(":").map(Number);
  return parts[0] * 60 + parts[1];
};

const TIMES = computed(() => {
  if (!schedules.value.length) return [];

  const starts = schedules.value.map((s) => toMin(s.start));
  const ends = schedules.value.map((s) => toMin(s.end));
  let minStart = Math.min(...starts);
  let maxEnd = Math.max(...ends);

  minStart = Math.floor(minStart / STEP_MIN) * STEP_MIN;
  maxEnd = Math.ceil(maxEnd / STEP_MIN) * STEP_MIN;

  const times = [];
  for (let t = minStart; t <= maxEnd; t += STEP_MIN) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return times;
});

const selectedDay = computed(() =>
  DAYS.value.find((d) => d.id === selectedDayId.value),
);

function schedulesForDay(dayId) {
  return schedules.value
    .filter((s) => s.day_id === dayId)
    .sort((a, b) => toMin(a.start) - toMin(b.start));
}

function slotsAt(dayId, timeStart) {
  const tMin = toMin(timeStart);
  return schedules.value.filter(
    (s) => s.day_id === dayId && toMin(s.start) <= tMin && toMin(s.end) > tMin,
  );
}

function rowSpan(s) {
  return Math.max(1, Math.round((toMin(s.end) - toMin(s.start)) / STEP_MIN));
}

function selectDay(dayId) {
  if (dayId === selectedDayId.value) return;
  const currentIndex = DAYS.value.findIndex(
    (d) => d.id === selectedDayId.value,
  );
  const nextIndex = DAYS.value.findIndex((d) => d.id === dayId);
  transitionDirection.value = nextIndex > currentIndex ? "left" : "right";
  selectedDayId.value = dayId;
}

function openAdd(day_id = 1, time = "08:00", end = "00:00") {
  editingId.value = null;
  form.value = {
    subject_id: "",
    day_id,
    start: time,
    end: end,
  };
  dialog.value = true;
}

function openEdit(s) {
  editingId.value = s.id;
  form.value = { ...s };
  dialog.value = true;
}

function isOverlapping() {
  return schedules.value.some((s) => {
    if (editingId.value && s.id === editingId.value) return false;
    if (s.day_id !== form.value.day_id) return false;
    return (
      toMin(form.value.start) < toMin(s.end) &&
      toMin(form.value.end) > toMin(s.start)
    );
  });
}

async function save() {
  if (form.value.end === "00:00" || toMin(form.value.end) === 0) {
    form.value.end = "12:00";
  }

  if (!form.value.start || !form.value.end) {
    alert("Please set both start and end time.");
    return;
  }

  if (toMin(form.value.end) <= toMin(form.value.start)) {
    alert("End time must be after start time.");
    return;
  }

  if (isOverlapping()) {
    alert("This time slot overlaps with an existing schedule.");
    return;
  }

  if (editingId.value) {
    const color = getSubjectColor(form.value.subject_id);
    const { error } = await supabase
      .from("schedules")
      .update({
        subject_id: form.value.subject_id,
        start: form.value.start,
        end: form.value.end,
        day_id: form.value.day_id,
        color: color,
      })
      .eq("id", editingId.value);

    if (error) {
      console.log(error);
      return;
    }
  } else {
    const color = getSubjectColor(form.value.subject_id);
    const { error } = await supabase.from("schedules").insert({
      subject_id: form.value.subject_id,
      start: form.value.start,
      end: form.value.end,
      day_id: form.value.day_id,
      color: color,
      class_id: props.class_id,
    });

    if (error) {
      console.log(error);
      return;
    }
  }

  dialog.value = false;
  await getSchedules();
}

async function remove(id) {
  const { error } = await supabase.from("schedules").delete().eq("id", id);

  if (error) {
    alert("❌ Failed to delete schedule.");
    console.log(error);
    return;
  }

  await getSchedules();
}

function formatTime(t) {
  if (!t) return "";
  const parts = t.split(":").map(Number);
  const h = parts[0];
  const m = parts[1];
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour12}:00 ${period}`
    : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

const getSchedules = async () => {
  try {
    const { data, error } = await supabase
      .from("schedules")
      .select(
        `
        *,
        subjects (id, name_en),
        weekday (id, name_en)
      `,
      )
      .eq("class_id", props.class_id);
    if (error) throw error;
    schedules.value = data.map((s) => ({
      ...s,
      color: getSubjectColor(s.subject_id),
    }));
  } catch (error) {
    console.log(error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  subjects.value = await getSubjects();
  DAYS.value = await getWeekdays();
  await getSchedules();

  const todayName = JS_DAY_NAMES[new Date().getDay()];
  const match = DAYS.value.find(
    (d) => d.name_en.toLowerCase() === todayName.toLowerCase(),
  );
  todayDayId.value = match ? match.id : (DAYS.value[0]?.id ?? null);
  selectedDayId.value = todayDayId.value;

  handleResize();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <VCard :loading="isLoading">
    <VCardTitle class="d-flex align-center justify-space-between pa-4">
      <VChip class="rounded-l" color="primary"> Weekly Schedule </VChip>
      <VBtn
        color="primary"
        size="small"
        prepend-icon="tabler-plus"
        @click="openAdd(selectedDayId)"
      >
        Add slot
      </VBtn>
    </VCardTitle>

    <VCardText class="pa-0">
      <!-- ── MOBILE ── -->
      <div v-if="isMobile" class="mobile-view">
        <!-- Day picker tabs -->
        <div class="day-tabs">
          <button
            v-for="d in DAYS"
            :key="d.id"
            class="day-tab"
            :class="{ active: selectedDayId === d.id }"
            @click="selectDay(d.id)"
          >
            {{ d.name_en.slice(0, 3) }}
            <span
              v-if="schedulesForDay(d.id).length > 0"
              class="day-badge"
              :class="{ 'day-badge-active': selectedDayId === d.id }"
            >
              {{ schedulesForDay(d.id).length }}
            </span>
          </button>
        </div>

        <!-- Selected day header -->
        <div class="mobile-day-title">
          <span>{{ selectedDay?.name_en }}</span>
          <span v-if="selectedDayId === todayDayId" class="today-badge">
            Today
          </span>
        </div>

        <!-- Slots for selected day — :key forces re-mount to retrigger animation -->
        <div
          :key="selectedDayId"
          class="mobile-slots-list"
          :class="
            transitionDirection === 'left' ? 'drop-in-left' : 'drop-in-right'
          "
        >
          <div
            v-if="schedulesForDay(selectedDayId).length === 0"
            class="no-slots"
          >
            No classes scheduled
          </div>

          <div
            v-for="s in schedulesForDay(selectedDayId)"
            :key="s.id"
            class="mobile-slot"
            :class="s.color"
            @click="openEdit(s)"
          >
            <div class="mobile-slot-info">
              <div class="mobile-slot-title">{{ s.subjects?.name_en }}</div>
              <div class="mobile-slot-time">
                {{ formatTime(s.start) }} – {{ formatTime(s.end) }}
              </div>
            </div>
            <VBtn
              icon
              size="x-small"
              variant="text"
              class="mobile-delete-btn"
              @click.stop="remove(s.id)"
            >
              <VIcon size="16">tabler-trash</VIcon>
            </VBtn>
          </div>
        </div>
      </div>

      <!-- ── DESKTOP: original table ── -->
      <div v-else class="overflow-x-auto">
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="time-col">Time</th>
              <th v-for="d in DAYS" :key="d.id">{{ d.name_en }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(time, ti) in TIMES.slice(0, -1)" :key="time">
              <tr>
                <td class="time-cell">
                  <span v-if="time.endsWith(':00')">{{
                    formatTime(time)
                  }}</span>
                </td>
                <template v-for="d in DAYS" :key="d.id">
                  <template v-if="slotsAt(d.id, time).length">
                    <td
                      v-if="toMin(slotsAt(d.id, time)[0].start) === toMin(time)"
                      :rowspan="rowSpan(slotsAt(d.id, time)[0])"
                      class="slot-cell"
                    >
                      <div
                        class="slot-card"
                        :class="slotsAt(d.id, time)[0].color"
                        @click="openEdit(slotsAt(d.id, time)[0])"
                      >
                        <div class="slot-title">
                          {{ slotsAt(d.id, time)[0].subjects?.name_en }}
                        </div>
                        <div class="slot-meta">
                          {{ formatTime(slotsAt(d.id, time)[0].start) }} -
                          {{ formatTime(slotsAt(d.id, time)[0].end) }}
                        </div>
                        <VBtn
                          icon
                          size="x-small"
                          variant="text"
                          class="delete-btn"
                          @click.stop="remove(slotsAt(d.id, time)[0].id)"
                        >
                          <VIcon size="14">tabler-trash</VIcon>
                        </VBtn>
                      </div>
                    </td>
                  </template>
                  <td v-else @click="openAdd(d.id, time)" class="empty-cell">
                    <span class="add-label">
                      <VIcon size="14">tabler-plus</VIcon> Add
                    </span>
                  </td>
                </template>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </VCardText>
  </VCard>

  <!-- ── Dialog (shared) ── -->
  <VDialog v-model="dialog" max-width="400">
    <VCard title="Schedule slot">
      <VCardText>
        <VSelect
          :items="subjects"
          item-title="name_en"
          item-value="id"
          v-model="form.subject_id"
          label="Subject"
          class="mb-3"
        />

        <VSelect
          v-model="form.day_id"
          :items="DAYS"
          item-title="name_en"
          item-value="id"
          label="Day"
          class="mb-3"
        />

        <VRow>
          <VCol>
            <VTextField
              v-model="form.start"
              type="time"
              label="Start"
              step="1800"
            />
          </VCol>
          <VCol>
            <VTextField
              v-model="form.end"
              type="time"
              label="End"
              step="1800"
            />
          </VCol>
        </VRow>
      </VCardText>
      <VCardActions class="justify-end pa-4">
        <VBtn variant="tonal" @click="dialog = false">Cancel</VBtn>
        <VBtn color="primary" @click="save">
          {{ editingId ? "Save" : "Add" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
/* ── Desktop table ── */
.schedule-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.schedule-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 0.95rem;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.time-col {
  width: 90px;
}

.schedule-table td {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 5px;
  height: 28px;
  vertical-align: top;
}

.time-cell {
  text-align: center;
  padding-right: 8px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  border-left: none;
}

.empty-cell {
  cursor: pointer;
  position: relative;
}

.empty-cell .add-label {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.5);
  height: 100%;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.25);
  border-radius: 6px;
  margin: 2px;
}

.empty-cell:hover .add-label {
  display: flex;
}

.empty-cell:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.03);
}

.slot-cell {
  padding: 2px;
}

.slot-card {
  position: relative;
  height: 100%;
  border-radius: 5px;
  padding: 5px;
  cursor: pointer;
}

.slot-title {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 4px;
}

.slot-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  opacity: 0.8;
  margin-bottom: 2px;
}

.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.slot-card:hover .delete-btn {
  opacity: 1;
}

/* ── Mobile ── */
.mobile-view {
  display: flex;
  flex-direction: column;
}

.day-tabs {
  display: flex;
  overflow-x: auto;
  gap: 4px;
  padding: 10px 12px 0;
  scrollbar-width: none;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.day-tabs::-webkit-scrollbar {
  display: none;
}

.day-tab {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid transparent;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.55);
  transition: all 0.15s;
  margin-bottom: 8px;
}

.day-tab:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.day-tab.active {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border-color: rgb(var(--v-theme-primary));
}

.mobile-day-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 8px;
  font-weight: 600;
  font-size: 1rem;
}

.today-badge {
  font-size: 0.72rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.mobile-slots-list {
  padding: 4px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Drop-in animations ── */
@keyframes dropInFromLeft {
  0% {
    opacity: 0;
    transform: translateY(-18px) translateX(10px);
  }
  60% {
    transform: translateY(4px) translateX(0);
  }
  100% {
    opacity: 1;
    transform: translateY(0) translateX(0);
  }
}

@keyframes dropInFromRight {
  0% {
    opacity: 0;
    transform: translateY(-18px) translateX(-10px);
  }
  60% {
    transform: translateY(4px) translateX(0);
  }
  100% {
    opacity: 1;
    transform: translateY(0) translateX(0);
  }
}

.drop-in-left {
  animation: dropInFromLeft 0.28s cubic-bezier(0.34, 1.3, 0.64, 1) both;
}

.drop-in-right {
  animation: dropInFromRight 0.28s cubic-bezier(0.34, 1.3, 0.64, 1) both;
}

.no-slots {
  padding: 20px 0;
  text-align: center;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-style: italic;
}

.mobile-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: filter 0.15s;
}

.mobile-slot:hover {
  filter: brightness(0.95);
}

.mobile-slot-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.mobile-slot-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.mobile-slot-time {
  font-size: 0.78rem;
  opacity: 0.75;
}

.mobile-delete-btn {
  opacity: 0.45;
  flex-shrink: 0;
}

@media (hover: none) {
  .mobile-delete-btn {
    opacity: 0.6;
  }
  .delete-btn {
    opacity: 0.6;
  }
}

/* ── Subject colors ── */
.s-blue {
  background-color: #dbeafe;
  color: #1e3a8a;
}
.s-orange {
  background-color: #fef3c7;
  color: #92400e;
}
.s-green {
  background-color: #d1fae5;
  color: #065f46;
}
.s-purple {
  background-color: #ede9fe;
  color: #5b21b6;
}
.s-red {
  background-color: #fee2e2;
  color: #991b1b;
}
.s-pink {
  background-color: #fce7f3;
  color: #9d174d;
}
.s-teal {
  background-color: #ccfbf1;
  color: #134e4a;
}
.s-yellow {
  background-color: #fef9c3;
  color: #713f12;
}
.s-indigo {
  background-color: #e0e7ff;
  color: #3730a3;
}
.s-cyan {
  background-color: #cffafe;
  color: #164e63;
}
.s-lime {
  background-color: #ecfccb;
  color: #365314;
}
.s-amber {
  background-color: #fef3c7;
  color: #78350f;
}

.day-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 20px;
  font-size: 0.68rem;
  font-weight: 600;
  margin-left: 5px;
  background: rgba(var(--v-theme-warning), 0.15);
  color: rgb(var(--v-theme-warning));
}

.day-badge-active {
  background: rgba(var(--v-theme-on-warning), 0.25);
  color: rgb(var(--v-theme-on-warning));
}
</style>
