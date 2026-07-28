<script setup>
import { getSubjects, getWeekdays } from "@/services/dataService";
import { listSchedules, createSchedules, updateSchedule, deleteSchedule, deleteSchedulesForClasses } from "@/services/api/schedules";
import { useSettingStore } from "@/stores/settingStore";
import headerReportImage from "@/assets/images/pages/headerReportImage.png";
import FooterRepor from "@/views/global/components/footerRepor.vue";
import { ref, computed, onMounted, onUnmounted, watch } from "vue";

const props = defineProps({
  class_id: {
    type: Number,
  },
  class_name: {
    type: String,
    default: "",
  },
  classes: {
    type: Array,
    default: () => [],
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
const schedules = ref([]);

const selectedDayId = ref(null);
const todayDayId = ref(null);
const transitionDirection = ref("left");

const dialog = ref(false);
const editingId = ref(null);
const form = ref({
  entry_type: "subject", // 'subject' | 'title'
  subject_id: null,
  day_id: 1,
  day_to_id: 1,
  merge_days: false,
  start: "",
  end: "",
  title: "",
  color: "s-teal",
  class_ids: [],
});

const isSaving = ref(false);

const applyDialog = ref(false);
const applyClassIds = ref([]);
const isApplying = ref(false);

const otherClasses = computed(() =>
  (props.classes || []).filter((c) => Number(c.id) !== Number(props.class_id)),
);

const COLOR_OPTIONS = [
  { value: "s-blue", label: "Blue" },
  { value: "s-orange", label: "Orange" },
  { value: "s-green", label: "Green" },
  { value: "s-purple", label: "Purple" },
  { value: "s-red", label: "Red" },
  { value: "s-pink", label: "Pink" },
  { value: "s-teal", label: "Teal" },
  { value: "s-yellow", label: "Yellow" },
  { value: "s-indigo", label: "Indigo" },
  { value: "s-cyan", label: "Cyan" },
  { value: "s-lime", label: "Lime" },
  { value: "s-amber", label: "Amber" },
];

const COLORS = COLOR_OPTIONS.map((c) => c.value);

const JS_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const reportTitle = computed(() => {
  const name = props.class_name?.trim();
  return name ? `Daily Schedule for ${name}` : "Daily Schedule";
});

const printObj = computed(() => ({
  id: "printAreaSchedule",
  popTitle: reportTitle.value,
}));

function handleResize() {
  isMobile.value = window.innerWidth < 600;
}

function getSubjectColor(subject_id) {
  if (!subject_id) return "s-teal";
  if (!subjectColorMap.value[subject_id]) {
    const index = subjects.value.findIndex((s) => s.id === subject_id);
    subjectColorMap.value[subject_id] =
      COLORS[(index >= 0 ? index : 0) % COLORS.length];
  }
  return subjectColorMap.value[subject_id];
}

function slotLabel(s) {
  if (s?.title?.trim()) return s.title.trim();
  return s?.subjects?.name_en || "Untitled";
}

/** Normalize "07:30:00" / "7:30" → "07:30" for time inputs + comparisons. */
function normalizeTime(t) {
  if (!t) return "";
  const parts = String(t).split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const toMin = (t) => {
  const normalized = normalizeTime(t);
  if (!normalized) return 0;
  const [h, m] = normalized.split(":").map(Number);
  return h * 60 + m;
};

/** Grid built from real slot start/end times (fewer rows → fits one print page). */
const TIMES = computed(() => {
  if (!schedules.value.length) return [];

  const points = new Set();
  for (const s of schedules.value) {
    points.add(toMin(s.start));
    points.add(toMin(s.end));
  }

  return [...points]
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((total) => {
      const h = Math.floor(total / 60);
      const m = total % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    });
});

const selectedDay = computed(() =>
  DAYS.value.find((d) => d.id === selectedDayId.value),
);

function dayIndex(dayId) {
  return DAYS.value.findIndex((d) => Number(d.id) === Number(dayId));
}

function slotDayBounds(s) {
  let start = s.day_id;
  let end = s.day_to_id;

  if (s.is_all_days && (start == null || start === undefined)) {
    start = DAYS.value[0]?.id ?? null;
  }
  if (end == null || end === undefined) {
    end = s.is_all_days
      ? (DAYS.value[DAYS.value.length - 1]?.id ?? start)
      : start;
  }

  if (dayIndex(start) > dayIndex(end)) {
    return { start: end, end: start };
  }
  return { start, end };
}

function slotDayStart(s) {
  return slotDayBounds(s).start;
}

function slotDayEnd(s) {
  return slotDayBounds(s).end;
}

function isMergedSlot(s) {
  const { start, end } = slotDayBounds(s);
  return Number(start) !== Number(end);
}

function colSpan(s) {
  const a = dayIndex(slotDayStart(s));
  const b = dayIndex(slotDayEnd(s));
  if (a < 0 || b < 0) return 1;
  return Math.abs(b - a) + 1;
}

function coversDay(s, dayId) {
  const a = dayIndex(slotDayStart(s));
  const b = dayIndex(slotDayEnd(s));
  const d = dayIndex(dayId);
  if (a < 0 || b < 0 || d < 0) return false;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return d >= lo && d <= hi;
}

function dayRangesOverlap(aStart, aEnd, bStart, bEnd) {
  const a0 = dayIndex(aStart);
  const a1 = dayIndex(aEnd ?? aStart);
  const b0 = dayIndex(bStart);
  const b1 = dayIndex(bEnd ?? bStart);
  if (a0 < 0 || a1 < 0 || b0 < 0 || b1 < 0) return false;
  const aLo = Math.min(a0, a1);
  const aHi = Math.max(a0, a1);
  const bLo = Math.min(b0, b1);
  const bHi = Math.max(b0, b1);
  return aLo <= bHi && bLo <= aHi;
}

function schedulesForDay(dayId) {
  return schedules.value
    .filter((s) => coversDay(s, dayId))
    .sort((a, b) => toMin(a.start) - toMin(b.start));
}

function slotCovering(dayId, timeStart) {
  const tMin = toMin(timeStart);
  return (
    schedules.value.find(
      (s) =>
        coversDay(s, dayId) &&
        toMin(s.start) <= tMin &&
        toMin(s.end) > tMin,
    ) || null
  );
}

/** How to render one day cell at a time row: slot | empty | skip (covered by span). */
function cellAction(dayId, time) {
  const slot = slotCovering(dayId, time);
  if (!slot) return { type: "empty" };

  const isStartDay = Number(dayId) === Number(slotDayStart(slot));
  const isStartTime = toMin(slot.start) === toMin(time);

  if (isStartDay && isStartTime) {
    return {
      type: "slot",
      slot,
      colspan: colSpan(slot),
      rowspan: rowSpan(slot),
    };
  }
  return { type: "skip" };
}

function rowSpan(s) {
  const start = toMin(s.start);
  const end = toMin(s.end);
  let count = 0;
  const times = TIMES.value;
  for (let i = 0; i < times.length - 1; i++) {
    const t = toMin(times[i]);
    if (t >= start && t < end) count += 1;
  }
  return Math.max(1, count);
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

function openAdd(day_id = 1) {
  editingId.value = null;
  const day = day_id ?? selectedDayId.value ?? DAYS.value[0]?.id ?? 1;
  form.value = {
    entry_type: "subject",
    subject_id: null,
    day_id: day,
    day_to_id: DAYS.value[DAYS.value.length - 1]?.id ?? day,
    merge_days: false,
    start: "",
    end: "",
    title: "",
    color: "s-teal",
    class_ids: props.class_id != null ? [props.class_id] : [],
  };
  dialog.value = true;
}

function openEdit(s) {
  editingId.value = s.id;
  const startDay = slotDayStart(s);
  const endDay = slotDayEnd(s);
  const hasSubject = !!s.subject_id;
  form.value = {
    entry_type: hasSubject ? "subject" : "title",
    subject_id: s.subject_id ?? null,
    day_id: startDay ?? selectedDayId.value ?? DAYS.value[0]?.id ?? 1,
    day_to_id: endDay ?? startDay,
    merge_days: isMergedSlot(s),
    start: normalizeTime(s.start),
    end: normalizeTime(s.end),
    title: s.title || "",
    color: s.color || "s-teal",
    class_ids: props.class_id != null ? [props.class_id] : [],
  };
  dialog.value = true;
}

function resetCreateForm(keepClassIds = true) {
  const keptClassIds = keepClassIds
    ? [...(form.value.class_ids || [])]
    : props.class_id != null
      ? [props.class_id]
      : [];
  const day = form.value.day_id ?? selectedDayId.value ?? DAYS.value[0]?.id ?? 1;

  form.value = {
    entry_type: form.value.entry_type || "subject",
    subject_id: null,
    day_id: day,
    day_to_id: DAYS.value[DAYS.value.length - 1]?.id ?? day,
    merge_days: false,
    start: "",
    end: "",
    title: "",
    color: "s-teal",
    class_ids: keptClassIds,
  };
}

function selectAllClasses() {
  form.value.class_ids = (props.classes || []).map((c) => c.id);
}

function selectCurrentClassOnly() {
  form.value.class_ids = props.class_id != null ? [props.class_id] : [];
}

function setEntryType(type) {
  form.value.entry_type = type;
  if (type === "subject") {
    form.value.title = "";
  } else {
    form.value.subject_id = null;
    if (!form.value.color) form.value.color = "s-teal";
  }
}

function setFullWeekMerge() {
  form.value.merge_days = true;
  form.value.day_id = DAYS.value[0]?.id ?? 1;
  form.value.day_to_id = DAYS.value[DAYS.value.length - 1]?.id ?? 5;
}

/** Half-open intervals [start, end) — touching edges do not overlap. */
function overlapsTime(aStart, aEnd, bStart, bEnd) {
  const as = toMin(aStart);
  const ae = toMin(aEnd);
  const bs = toMin(bStart);
  const be = toMin(bEnd);
  return as < be && bs < ae;
}

function resolvedFormDayRange() {
  let from = form.value.day_id;
  let to = form.value.merge_days ? form.value.day_to_id : form.value.day_id;
  if (dayIndex(from) > dayIndex(to)) {
    [from, to] = [to, from];
  }
  return { from, to };
}

function isOverlapping() {
  const { from, to } = resolvedFormDayRange();
  return schedules.value.some((s) => {
    if (editingId.value && s.id === editingId.value) return false;
    if (!overlapsTime(form.value.start, form.value.end, s.start, s.end)) {
      return false;
    }
    return dayRangesOverlap(from, to, slotDayStart(s), slotDayEnd(s));
  });
}

function slotOverlapsRange(s, from, to, start, end) {
  if (!overlapsTime(start, end, s.start, s.end)) return false;
  return dayRangesOverlap(from, to, slotDayStart(s), slotDayEnd(s));
}

async function findOverlappingClassIds(classIds, from, to, start, end) {
  const overlapping = [];

  for (const classId of classIds) {
    if (Number(classId) === Number(props.class_id)) {
      if (isOverlapping()) overlapping.push(classId);
      continue;
    }

    let data;
    try {
      data = await listSchedules({ class_id: classId });
    } catch (error) {
      console.log(error);
      continue;
    }

    const hasOverlap = (data || []).some((s) =>
      slotOverlapsRange(s, from, to, start, end),
    );
    if (hasOverlap) overlapping.push(classId);
  }

  return overlapping;
}

function classNameById(classId) {
  const match = (props.classes || []).find(
    (c) => Number(c.id) === Number(classId),
  );
  return match?.name_en || `Class ${classId}`;
}

async function save() {
  form.value.start = normalizeTime(form.value.start);
  form.value.end = normalizeTime(form.value.end);

  if (!form.value.start || !form.value.end) {
    alert("Please set both start and end time.");
    return;
  }

  if (toMin(form.value.end) <= toMin(form.value.start)) {
    alert("End time must be after start time.");
    return;
  }

  const title = (form.value.title || "").trim();
  const isTitleMode = form.value.entry_type === "title";

  if (isTitleMode) {
    if (!title) {
      alert("Please enter a title.");
      return;
    }
  } else if (!form.value.subject_id) {
    alert("Please select a subject.");
    return;
  }

  if (!form.value.day_id) {
    alert("Please select a day.");
    return;
  }

  if (form.value.merge_days && !form.value.day_to_id) {
    alert("Please select the end day for the merge.");
    return;
  }

  const targetClassIds = editingId.value
    ? [props.class_id]
    : [...new Set((form.value.class_ids || []).map(Number).filter(Boolean))];

  if (!targetClassIds.length) {
    alert("Please select at least one class.");
    return;
  }

  const { from, to } = resolvedFormDayRange();
  const overlappingIds = await findOverlappingClassIds(
    targetClassIds,
    from,
    to,
    form.value.start,
    form.value.end,
  );

  if (overlappingIds.length) {
    const names = overlappingIds.map(classNameById).join(", ");
    alert(`This time slot overlaps in: ${names}`);
    return;
  }

  const coversFullWeek =
    dayIndex(from) === 0 && dayIndex(to) === DAYS.value.length - 1;

  const color = isTitleMode
    ? form.value.color || "s-teal"
    : getSubjectColor(form.value.subject_id);

  const payload = {
    subject_id: isTitleMode ? null : form.value.subject_id,
    start: form.value.start,
    end: form.value.end,
    day_id: from,
    day_to_id: from === to ? null : to,
    color,
    is_all_days: coversFullWeek && from !== to,
    title: isTitleMode ? title : null,
  };

  isSaving.value = true;
  try {
    if (editingId.value) {
      try {
        await updateSchedule({ ...payload, id: editingId.value });
      } catch (error) {
        console.log(error);
        alert("Failed to update schedule.");
        return;
      }

      dialog.value = false;
    } else {
      const rows = targetClassIds.map((class_id) => ({
        ...payload,
        class_id,
      }));

      try {
        await createSchedules(rows);
      } catch (error) {
        console.log(error);
        alert("Failed to add schedule.");
        return;
      }

      // Keep dialog open for faster multi-slot entry; keep selected classes.
      resetCreateForm(true);
    }

    await getSchedules();
  } finally {
    isSaving.value = false;
  }
}

async function remove(id) {
  try {
    await deleteSchedule(id);
  } catch (error) {
    alert("Failed to delete schedule.");
    console.log(error);
    return;
  }

  await getSchedules();
}

function openApplyTo() {
  if (!schedules.value.length) {
    alert("This class has no schedule to apply.");
    return;
  }
  if (!otherClasses.value.length) {
    alert("No other classes available.");
    return;
  }
  applyClassIds.value = [];
  applyDialog.value = true;
}

function selectAllApplyClasses() {
  applyClassIds.value = otherClasses.value.map((c) => c.id);
}

async function applyScheduleToClasses() {
  const targetIds = [
    ...new Set((applyClassIds.value || []).map(Number).filter(Boolean)),
  ].filter((id) => Number(id) !== Number(props.class_id));

  if (!targetIds.length) {
    alert("Please select at least one class.");
    return;
  }

  if (!schedules.value.length) {
    alert("This class has no schedule to apply.");
    return;
  }

  const confirmed = window.confirm(
    `Replace the schedule in ${targetIds.length} class(es) with "${props.class_name || "this class"}"?\n\nExisting slots in those classes will be deleted.`,
  );
  if (!confirmed) return;

  const rows = [];
  for (const class_id of targetIds) {
    for (const s of schedules.value) {
      rows.push({
        class_id,
        subject_id: s.subject_id || null,
        title: s.title || null,
        start: normalizeTime(s.start),
        end: normalizeTime(s.end),
        day_id: s.day_id ?? null,
        day_to_id: s.day_to_id ?? null,
        color: s.color || getSubjectColor(s.subject_id),
        is_all_days: !!s.is_all_days,
      });
    }
  }

  isApplying.value = true;
  try {
    try {
      await deleteSchedulesForClasses(targetIds);
    } catch (deleteError) {
      console.log(deleteError);
      alert("Failed to clear target class schedules.");
      return;
    }

    try {
      await createSchedules(rows);
    } catch (insertError) {
      console.log(insertError);
      alert("Failed to apply schedule to other classes.");
      return;
    }

    applyDialog.value = false;
    applyClassIds.value = [];
    alert(`Schedule applied to ${targetIds.length} class(es).`);
  } finally {
    isApplying.value = false;
  }
}

function formatTime(t) {
  const normalized = normalizeTime(t);
  if (!normalized) return "";
  const [h, m] = normalized.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour12}:00 ${period}`
    : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

const getSchedules = async () => {
  try {
    // listSchedules returns the same nested `subjects` and `weekday` objects
    // the PostgREST embed produced.
    const data = await listSchedules({ class_id: props.class_id });
    schedules.value = data.map((s) => ({
      ...s,
      color: s.color || getSubjectColor(s.subject_id),
    }));
  } catch (error) {
    console.log(error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  subjects.value = await getSubjects();
  const weekdays = (await getWeekdays()) || [];
  DAYS.value = weekdays
    .filter((d) => {
      const name = (d.name_en || "").toLowerCase();
      return name !== "saturday" && name !== "sunday";
    })
    .sort((a, b) => Number(a.id) - Number(b.id));
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
    <VCardTitle
      class="d-flex align-center justify-space-between pa-4 flex-wrap gap-2 schedule-no-print"
    >
      <VChip class="rounded-l" color="primary"> Weekly Schedule </VChip>
      <div class="d-flex align-center gap-2 flex-wrap">
        <VBtn
          color="primary"
          variant="tonal"
          size="small"
          prepend-icon="tabler-printer"
          :disabled="!schedules.length"
          v-print="printObj"
        >
          Print / PDF
        </VBtn>
        <VBtn
          color="secondary"
          variant="tonal"
          size="small"
          prepend-icon="tabler-copy"
          :disabled="!schedules.length || !otherClasses.length"
          @click="openApplyTo"
        >
          Apply To
        </VBtn>
        <VBtn
          color="primary"
          size="small"
          prepend-icon="tabler-plus"
          @click="openAdd(selectedDayId)"
        >
          Add slot
        </VBtn>
      </div>
    </VCardTitle>

    <VCardText class="pa-0">
      <!-- ── MOBILE (screen only) ── -->
      <div v-if="isMobile" class="mobile-view schedule-no-print">
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

        <div class="mobile-day-title">
          <span>{{ selectedDay?.name_en }}</span>
          <span v-if="selectedDayId === todayDayId" class="today-badge">
            Today
          </span>
        </div>

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
              <div class="mobile-slot-title">
                {{ slotLabel(s) }}
                <span v-if="isMergedSlot(s)" class="all-days-badge">
                  {{ colSpan(s) }} days
                </span>
              </div>
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

      <!-- ── DESKTOP + PRINT ── -->
      <div
        id="printAreaSchedule"
        class="schedule-print-area"
        :class="{ 'schedule-print-area--mobile-hidden': isMobile }"
      >
        <div class="schedule-report-header">
          <VImg
            :src="headerReportImage"
            alt="Dewey Childcare House"
            class="w-100 schedule-report-logo"
          />
          <div class="schedule-report-title">{{ reportTitle }}</div>
        </div>

        <div class="overflow-x-auto">
          <table class="schedule-table">
            <thead>
              <tr>
                <th v-for="d in DAYS" :key="d.id">{{ d.name_en }}</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="time in TIMES.slice(0, -1)" :key="time">
                <tr>
                  <template v-for="d in DAYS" :key="`${time}-${d.id}`">
                    <template v-for="action in [cellAction(d.id, time)]" :key="`${time}-${d.id}-a`">
                      <td
                        v-if="action.type === 'slot'"
                        :colspan="action.colspan"
                        :rowspan="action.rowspan"
                        class="slot-cell"
                        :class="[
                          action.slot.color,
                          { 'slot-cell-all-days': action.colspan > 1 },
                        ]"
                      >
                        <div
                          class="slot-card"
                          :class="{ 'slot-card-all-days': action.colspan > 1 }"
                          @click="openEdit(action.slot)"
                        >
                          <div class="slot-body">
                            <div class="slot-title">
                              {{ slotLabel(action.slot) }}
                            </div>
                            <div class="slot-meta">
                              {{ formatTime(action.slot.start) }} –
                              {{ formatTime(action.slot.end) }}
                            </div>
                          </div>
                          <VBtn
                            icon
                            size="x-small"
                            variant="text"
                            class="delete-btn schedule-no-print"
                            @click.stop="remove(action.slot.id)"
                          >
                            <VIcon size="14">tabler-trash</VIcon>
                          </VBtn>
                        </div>
                      </td>
                      <td
                        v-else-if="action.type === 'empty'"
                        class="empty-cell"
                        @click="openAdd(d.id)"
                      >
                        <span class="add-label schedule-no-print">
                          <VIcon size="14">tabler-plus</VIcon> Add
                        </span>
                      </td>
                    </template>
                  </template>
                </tr>
              </template>

              <tr v-if="!TIMES.length">
                <td :colspan="DAYS.length || 1" class="text-center pa-6 text-medium-emphasis">
                  No schedule yet. Click Add slot to begin.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <FooterRepor editable />
      </div>
    </VCardText>
  </VCard>

  <!-- ── Dialog ── -->
  <VDialog v-model="dialog" max-width="720" scrollable>
    <VCard class="schedule-dialog">
      <VCardTitle class="d-flex align-center justify-space-between pa-5 pb-2">
        <div>
          <div class="text-h6">
            {{ editingId ? "Edit schedule slot" : "Create schedule slot" }}
          </div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            {{
              editingId
                ? "Update this slot for the current class."
                : "Apply to one class or many classes at once."
            }}
          </div>
        </div>
        <VBtn icon variant="text" @click="dialog = false">
          <VIcon>tabler-x</VIcon>
        </VBtn>
      </VCardTitle>

      <VCardText class="pa-5 pt-3">
        <div v-if="!editingId" class="mb-5">
          <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-2">
            <div class="text-body-2 font-weight-medium">Classes</div>
            <div class="d-flex gap-2">
              <VBtn size="x-small" variant="text" @click="selectCurrentClassOnly">
                This class
              </VBtn>
              <VBtn size="x-small" variant="text" @click="selectAllClasses">
                All classes
              </VBtn>
            </div>
          </div>
          <VSelect
            v-model="form.class_ids"
            :items="classes"
            item-title="name_en"
            item-value="id"
            label="Select class(es)"
            placeholder="Choose one or more classes"
            multiple
            chips
            closable-chips
            clearable
          />
        </div>

        <div class="entry-type-toggle mb-5">
          <button
            type="button"
            class="entry-type-btn"
            :class="{ active: form.entry_type === 'subject' }"
            @click="setEntryType('subject')"
          >
            Subject
          </button>
          <button
            type="button"
            class="entry-type-btn"
            :class="{ active: form.entry_type === 'title' }"
            @click="setEntryType('title')"
          >
            Title / Activity
          </button>
        </div>

        <VRow>
          <VCol cols="12" md="7">
            <VSelect
              v-if="form.entry_type === 'subject'"
              :items="subjects"
              item-title="name_en"
              item-value="id"
              v-model="form.subject_id"
              label="Subject"
              placeholder="Select subject"
              clearable
              class="mb-4"
            />

            <template v-else>
              <VTextField
                v-model="form.title"
                label="Title"
                placeholder="e.g. Line up and Reminders of Rules"
                class="mb-4"
                clearable
              />

              <div class="mb-2 text-body-2 font-weight-medium">Color</div>
              <div class="color-picker mb-4">
                <button
                  v-for="opt in COLOR_OPTIONS"
                  :key="opt.value"
                  type="button"
                  class="color-swatch"
                  :class="[opt.value, { selected: form.color === opt.value }]"
                  :title="opt.label"
                  @click="form.color = opt.value"
                />
              </div>
            </template>

            <VSwitch
              v-model="form.merge_days"
              label="Merge across days"
              color="primary"
              hide-details
              class="mb-3"
            />

            <div v-if="form.merge_days" class="d-flex flex-wrap gap-2 mb-3">
              <VBtn size="small" variant="tonal" @click="setFullWeekMerge">
                Mon – Fri
              </VBtn>
            </div>

            <VSelect
              v-if="!form.merge_days"
              v-model="form.day_id"
              :items="DAYS"
              item-title="name_en"
              item-value="id"
              label="Day"
              class="mb-2"
            />

            <VRow v-else>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="form.day_id"
                  :items="DAYS"
                  item-title="name_en"
                  item-value="id"
                  label="From"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="form.day_to_id"
                  :items="DAYS"
                  item-title="name_en"
                  item-value="id"
                  label="To"
                />
              </VCol>
            </VRow>
          </VCol>

          <VCol cols="12" md="5">
            <div class="time-panel">
              <div class="text-body-2 font-weight-medium mb-3">Time</div>
              <VTextField
                v-model="form.start"
                type="time"
                label="Start"
                step="60"
                class="mb-4"
                hide-details="auto"
              />
              <VTextField
                v-model="form.end"
                type="time"
                label="End"
                step="60"
                hide-details="auto"
              />
              <div class="text-caption text-medium-emphasis mt-3">
                Enter start and end time yourself (no default).
              </div>
            </div>
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions class="pa-5 pt-0 justify-end gap-2">
        <VBtn variant="tonal" size="large" :disabled="isSaving" @click="dialog = false">
          Cancel
        </VBtn>
        <VBtn color="primary" size="large" :loading="isSaving" @click="save">
          {{
            editingId
              ? "Save changes"
              : form.class_ids?.length > 1
                ? `Add to ${form.class_ids.length} classes`
                : "Add slot"
          }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <!-- ── Apply schedule to other classes ── -->
  <VDialog v-model="applyDialog" max-width="520" scrollable>
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between pa-5 pb-2">
        <div>
          <div class="text-h6">Apply schedule to classes</div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            Copy all slots from
            <strong>{{ class_name || "this class" }}</strong>
            to other classes. Existing schedules in those classes will be replaced.
          </div>
        </div>
        <VBtn icon variant="text" :disabled="isApplying" @click="applyDialog = false">
          <VIcon>tabler-x</VIcon>
        </VBtn>
      </VCardTitle>

      <VCardText class="pa-5 pt-3">
        <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-2">
          <div class="text-body-2 font-weight-medium">Target classes</div>
          <VBtn size="x-small" variant="text" @click="selectAllApplyClasses">
            Select all
          </VBtn>
        </div>
        <VSelect
          v-model="applyClassIds"
          :items="otherClasses"
          item-title="name_en"
          item-value="id"
          label="Select class(es)"
          placeholder="Choose one or more classes"
          multiple
          chips
          closable-chips
          clearable
        />
        <div class="text-caption text-medium-emphasis mt-3">
          {{ schedules.length }} slot(s) will be copied to each selected class.
        </div>
      </VCardText>

      <VCardActions class="pa-5 pt-0 justify-end gap-2">
        <VBtn
          variant="tonal"
          size="large"
          :disabled="isApplying"
          @click="applyDialog = false"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          size="large"
          :loading="isApplying"
          :disabled="!applyClassIds.length"
          @click="applyScheduleToClasses"
        >
          {{
            applyClassIds.length > 1
              ? `Apply to ${applyClassIds.length} classes`
              : "Apply schedule"
          }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.schedule-report-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 16px 8px;
}

.schedule-report-logo {
  max-width: 720px;
}

.schedule-report-title {
  margin-top: 12px;
  font-size: 1.15rem;
  font-weight: 700;
  text-align: center;
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.schedule-table th {
  padding: 12px 16px;
  text-align: center;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.schedule-table td {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 5px;
  height: 28px;
  vertical-align: top;
}

.entry-type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.entry-type-btn {
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.65);
  transition: all 0.15s ease;
}

.entry-type-btn.active {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.time-panel {
  height: 100%;
  padding: 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
}

.color-swatch.selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.25);
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
  padding: 0 !important;
  vertical-align: middle;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.slot-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 100%;
  box-sizing: border-box;
  border-radius: 0;
  padding: 6px 8px;
  cursor: pointer;
  background: transparent;
  text-align: center;
}

.slot-card-all-days {
  text-align: center;
  justify-content: center;
}

.slot-card-all-days .slot-body {
  align-items: center;
  width: 100%;
}

.slot-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  width: 100%;
  text-align: center;
}

.slot-title {
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.25;
  margin: 0;
  text-align: center;
  width: 100%;
}

.slot-meta {
  margin-top: 2px;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.2;
  color: #d32f2f;
  opacity: 0.8;
  text-align: center;
  width: 100%;
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

.all-days-badge {
  margin-left: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.08);
  vertical-align: middle;
}

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
  font-weight: 700;
  color: #d32f2f;
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

.slot-cell.s-blue,
.slot-cell.s-orange,
.slot-cell.s-green,
.slot-cell.s-purple,
.slot-cell.s-red,
.slot-cell.s-pink,
.slot-cell.s-teal,
.slot-cell.s-yellow,
.slot-cell.s-indigo,
.slot-cell.s-cyan,
.slot-cell.s-lime,
.slot-cell.s-amber {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
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

.schedule-print-area--mobile-hidden {
  display: none;
}

@media print {
  .schedule-no-print {
    display: none !important;
  }

  .schedule-print-area,
  .schedule-print-area--mobile-hidden {
    display: block !important;
    width: 100% !important;
  }

  .schedule-report-header {
    padding: 0 0 4px !important;
  }

  .schedule-report-logo {
    max-width: 720px !important;
    max-height: none !important;
  }

  .schedule-report-title {
    margin-top: 4px !important;
    margin-bottom: 6px !important;
    font-size: 13pt !important;
    font-weight: 800 !important;
    color: #000 !important;
    letter-spacing: 0.02em;
  }

  .schedule-table {
    width: 100% !important;
  }

  .schedule-table th {
    padding: 4px 3px !important;
    font-size: 10pt !important;
    font-weight: 800 !important;
    color: #000 !important;
    border: 1px solid #000 !important;
    background: #f3f3f3 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .schedule-table td {
    padding: 1px !important;
    height: auto !important;
    min-height: 0 !important;
    vertical-align: middle !important;
    color: #000 !important;
    border: 1px solid #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .slot-cell {
    padding: 0 !important;
    vertical-align: middle !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .slot-card {
    cursor: default;
    padding: 3px 4px !important;
    border-radius: 0 !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 100% !important;
    background: transparent !important;
    justify-content: center !important;
    text-align: center !important;
  }

  .slot-body {
    gap: 0 !important;
    align-items: center !important;
    text-align: center !important;
  }

  .slot-title {
    font-size: 9.5pt !important;
    font-weight: 800 !important;
    line-height: 1.15 !important;
    color: #000 !important;
    text-align: center !important;
  }

  .slot-meta {
    margin-top: 2px !important;
    font-size: 8.5pt !important;
    font-weight: 500 !important;
    line-height: 1.15 !important;
    opacity: 1 !important;
    color: #d32f2f !important;
    text-align: center !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .empty-cell {
    height: 10px !important;
  }
}
</style>

