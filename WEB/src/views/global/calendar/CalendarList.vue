<script setup>
import supabase from "@/utils/supabase";
import { ref, onMounted, computed } from "vue";
import { usePartStore } from "@/stores/partStore";
import { useSettingStore } from "@/stores/settingStore";
import { useYearStore } from "@/stores/yearStore";

// ── stores ──────────────────────────────────────────────
const yearStore = useYearStore();
const settingStore = useSettingStore();
const partStore = usePartStore();

const cur_id = partStore.cur_id;
const branch_id = settingStore.branch_id;
const year_id = yearStore.year_id;

// ── state ────────────────────────────────────────────────
const holiday = ref([]);
const loading = ref(false);
const saving = ref(false);

const today = new Date();
const currentMonth = ref(today.getMonth());
const currentYear = ref(today.getFullYear());

// dialog
const showDialog = ref(false);
const selectedDate = ref("");
const selectedHoliday = ref(null);
const form = ref({ name: "", description: "", is_public: false });

// ── constants ────────────────────────────────────────────
const MONTHS = [
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
const DAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── helpers ──────────────────────────────────────────────
function pad(n) {
  return String(n).padStart(2, "0");
}
function isoDate(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function fmtDisplay(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── computed ─────────────────────────────────────────────
const holidayMap = computed(() => {
  const m = {};
  holiday.value.forEach((h) => {
    m[h.date] = h;
  });
  return m;
});

const calendarDays = computed(() => {
  const y = currentYear.value;
  const m = currentMonth.value;
  const firstDow = new Date(y, m, 1).getDay();
  const totalDays = new Date(y, m + 1, 0).getDate(); //m+1 becuz january=0;
  const prevTotal = new Date(y, m, 0).getDate();
  const cells = [];

  console.log("totalDay", totalDays);

  for (let i = 0; i < firstDow; i++) {
    cells.push({ day: prevTotal - firstDow + 1 + i, type: "other", iso: null });
  }
  for (let d = 1; d <= totalDays; d++) {
    const iso = isoDate(y, m, d);
    const dw = new Date(y, m, d).getDay();
    const h = holidayMap.value[iso] || null;
    cells.push({
      day: d,
      iso,
      type: "current",
      isWeekend: dw === 0 || dw === 6,
      isToday:
        y === today.getFullYear() &&
        m === today.getMonth() &&
        d === today.getDate(),
      holiday: h,
      isPublic: h?.is_public ?? false,
      isEvent: h && !h.is_public,
    });
  }
  const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 1; i <= rem; i++) {
    cells.push({ day: i, type: "other", iso: null });
  }
  return cells;
});

const monthStats = computed(() => {
  const y = currentYear.value;
  const m = currentMonth.value;
  const prefix = `${y}-${pad(m + 1)}-`;
  const monthHols = holiday.value.filter((h) => h.date.startsWith(prefix));
  const publicCount = monthHols.filter((h) => h.is_public).length;
  const eventCount = monthHols.filter((h) => !h.is_public).length;
  const totalDays = new Date(y, m + 1, 0).getDate();
  const schoolDays =
    totalDays -
    monthHols.filter((h) => {
      const dw = new Date(h.date + "T00:00:00").getDay();
      return dw !== 0 && dw !== 6;
    }).length;
  return { totalDays, publicCount, eventCount, schoolDays };
});

const monthHolidayList = computed(() => {
  const y = currentYear.value;
  const m = currentMonth.value;
  const prefix = `${y}-${pad(m + 1)}-`;
  return holiday.value
    .filter((h) => h.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date));
});

// ── navigation ────────────────────────────────────────────
function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value--;
  } else currentMonth.value--;
}
function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value++;
  } else currentMonth.value++;
}
function goToday() {
  currentMonth.value = today.getMonth();
  currentYear.value = today.getFullYear();
}

// ── fetch ─────────────────────────────────────────────────
const getHoliday = async () => {
  loading.value = true;
  try {
    const { data: publicData, error: e1 } = await supabase
      .from("holiday")
      .select("*")
      .eq("is_public", true)
      .eq("year", currentYear.value);
    if (e1) throw e1;

    const { data: evData, error: e2 } = await supabase
      .from("holiday")
      .select("*")
      .eq("is_public", false)
      .eq("cur_id", cur_id)
      .eq("branch_id", branch_id)
      .eq("year_id", year_id);
    if (e2) throw e2;

    holiday.value = [...(publicData || []), ...(evData || [])];
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

// ── dialog ────────────────────────────────────────────────
function openDialog(cell) {
  if (!cell.iso || cell.isWeekend) return;
  selectedDate.value = cell.iso;
  selectedHoliday.value = cell.holiday || null;
  form.value = {
    name: cell.holiday?.name_en ?? "",
    description: cell.holiday?.description ?? "",
    is_public: cell.holiday?.is_public ?? false,
  };
  showDialog.value = true;
}
function closeDialog() {
  showDialog.value = false;
  selectedHoliday.value = null;
  selectedDate.value = "";
}

async function saveEvent() {
  if (!form.value.name.trim()) return;
  saving.value = true;
  try {
    const payload = {
      date: selectedDate.value,
      name_en: form.value.name.trim(),
      description: form.value.description.trim() || null,
      is_public: form.value.is_public,
      year: currentYear.value,
      cur_id: form.value.is_public ? null : cur_id,
      branch_id: form.value.is_public ? null : branch_id,
      year_id: form.value.is_public ? null : year_id,
    };

    if (selectedHoliday.value?.id) {
      const { error } = await supabase
        .from("holiday")
        .update(payload)
        .eq("id", selectedHoliday.value.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("holiday").insert(payload);
      if (error) throw error;
    }
    await getHoliday();
    closeDialog();
  } catch (err) {
    console.error(err);
  } finally {
    saving.value = false;
  }
}

async function deleteEvent() {
  if (!selectedHoliday.value?.id) return;
  saving.value = true;
  try {
    const { error } = await supabase
      .from("holiday")
      .delete()
      .eq("id", selectedHoliday.value.id);
    if (error) throw error;
    await getHoliday();
    closeDialog();
  } catch (err) {
    console.error(err);
  } finally {
    saving.value = false;
  }
}

watch(
  () => currentYear.value,
  (newVa) => {
    console.log("year", currentYear.value);
  },
);

onMounted(() => {
  getHoliday();
});
</script>

<template>
  <div class="calendar-root">
    <!-- 
         OUTER FLEX WRAPPER
         • large screen : calendar + side panel side by side
         • small screen : stacked (flex-col)
    -->
    <div class="cal-layout">
      <!-- ── LEFT: calendar card ── -->
      <div class="cal-card">
        <!-- header -->
        <div class="cal-header">
          <div>
            <div class="cal-month-label">{{ MONTHS[currentMonth] }}</div>
            <div class="cal-year-label">{{ currentYear }}</div>
          </div>
          <div class="cal-header-right">
            <button class="btn-today" @click="goToday">Today</button>
            <button class="btn-nav" @click="prevMonth">&#8249;</button>
            <button class="btn-nav" @click="nextMonth">&#8250;</button>
          </div>
        </div>

        <!-- stats -->
        <div class="stats-row" v-if="!loading">
          <div class="stat-box">
            <div class="stat-num text-primary">{{ monthStats.totalDays }}</div>
            <div class="stat-lbl">Total days</div>
          </div>
          <div class="stat-box">
            <div class="stat-num text-red">{{ monthStats.publicCount }}</div>
            <div class="stat-lbl">Public holidays</div>
          </div>
          <div class="stat-box">
            <div class="stat-num text-green">{{ monthStats.eventCount }}</div>
            <div class="stat-lbl">School events</div>
          </div>
          <div class="stat-box">
            <div class="stat-num text-blue">{{ monthStats.schoolDays }}</div>
            <div class="stat-lbl">School days</div>
          </div>
        </div>
        <div v-else class="stats-row">
          <div class="stat-box skeleton" v-for="i in 4" :key="i"></div>
        </div>

        <!-- grid -->
        <div class="cal-body">
          <div class="dow-grid">
          
            <div
              v-for="(d, i) in DAYS_FULL"
              :key="d"
              class="dow-label"
              :class="{ 'dow-weekend': i === 0 || i === 6 }"
            >
              {{ d }}
            </div>
          </div>

          <div v-if="loading" class="loading-overlay">
            <div class="spinner"></div>
          </div>

          <div class="day-grid" v-else>
            <div
              v-for="(cell, idx) in calendarDays"
              :key="idx"
              class="day-cell border"
              :class="{
                'cell-other': cell.type === 'other',
                'cell-weekend': cell.type === 'current' && cell.isWeekend,
                'cell-today': cell.isToday && !cell.holiday,
                'cell-public': cell.isPublic,
                'cell-event': cell.isEvent,
                'cell-today-public': cell.isToday && cell.isPublic,
                'cell-clickable': cell.type === 'current' && !cell.isWeekend,
              }"
              @click="openDialog(cell)"
            >
              <span class="day-num">{{ cell.day }}</span>

              <!-- chip (desktop) -->
              <span
                v-if="cell.holiday"
                class="event-chip"
                :class="cell.isPublic ? 'chip-public' : 'chip-event'"
                >{{ cell.holiday.name_en }}</span
              >

              <!-- dot (mobile) -->
              <span
                v-if="cell.holiday"
                class="day-dot"
                :class="cell.isPublic ? 'dot-red' : 'dot-green'"
              ></span>
            </div>
          </div>
        </div>

        <!-- legend -->
        <div class="legend-row">
          <div class="legend-item">
            <span
              class="legend-dot"
              style="background: #fff0f0; border: 1px solid #f09595"
            ></span>
            Public holiday
          </div>
          <div class="legend-item">
            <span
              class="legend-dot"
              style="background: #f0fff8; border: 1px solid #9fe1cb"
            ></span>
            School event
          </div>
          <div class="legend-item">
            <span
              class="legend-dot"
              style="background: #ebf4ff; border: 1px solid #b5d4f4"
            ></span>
            Today
          </div>
        </div>

        <!-- ── Holiday list: MOBILE only (inside card, stacked below) ── -->
        <div class="hlist hlist-mobile">
          <template v-if="monthHolidayList.length">
            <div class="hlist-head">
              {{ MONTHS[currentMonth].toUpperCase() }} — HOLIDAYS &amp; EVENTS
            </div>
            <div
              v-for="h in monthHolidayList"
              :key="h.id"
              class="hlist-item"
              @click="
                openDialog({
                  iso: h.date,
                  isWeekend: false,
                  holiday: h,
                  isPublic: h.is_public,
                  isEvent: !h.is_public,
                })
              "
            >
              <div
                class="hlist-badge"
                :class="h.is_public ? 'badge-public' : 'badge-event'"
              >
                <div class="hlist-badge-d">
                  {{ new Date(h.date + "T00:00:00").getDate() }}
                </div>
                <div class="hlist-badge-dw">
                  {{ DAYS_FULL[new Date(h.date + "T00:00:00").getDay()] }}
                </div>
              </div>
              <div class="hlist-info">
                <div class="hlist-name">{{ h.name_en }}</div>
                <div class="hlist-name hlist-name-kh">{{ h.name_kh }}</div>
                <div class="hlist-sub">
                  {{
                    h.description ||
                    (h.is_public ? "Public holiday" : "School event")
                  }}
                </div>
              </div>
              <span
                class="hlist-tag"
                :class="h.is_public ? 'tag-public' : 'tag-event'"
              >
                {{ h.is_public ? "Holiday" : "Event" }}
              </span>
            </div>
          </template>
          <div v-else-if="!loading" class="hlist-empty">
            No holidays or events this month. Tap a date to add one.
          </div>
        </div>
      </div>
      <!-- /cal-card -->

      <!-- ── RIGHT: side panel — DESKTOP only ── -->
      <div class="side-panel">
        <div class="side-head">
          {{ MONTHS[currentMonth].toUpperCase() }} — HOLIDAYS &amp; EVENTS
        </div>

        <div class="side-scroll">
          <template v-if="monthHolidayList.length">
            <div
              v-for="h in monthHolidayList"
              :key="h.id"
              class="side-item"
              @click="
                openDialog({
                  iso: h.date,
                  isWeekend: false,
                  holiday: h,
                  isPublic: h.is_public,
                  isEvent: !h.is_public,
                })
              "
            >
              <div
                class="side-badge"
                :class="h.is_public ? 'sb-public' : 'sb-event'"
              >
                <div class="side-badge-d">
                  {{ new Date(h.date + "T00:00:00").getDate() }}
                </div>
                <div class="side-badge-dw">
                  {{ DAYS_FULL[new Date(h.date + "T00:00:00").getDay()] }}
                </div>
              </div>
              <div class="side-info">
                <div class="side-name">{{ h.name_en }}</div>
                <div class="side-name side-name-kh">{{ h.name_kh }}</div>
                <div class="side-sub">
                  {{
                    h.description ||
                    (h.is_public ? "Public holiday" : "School event")
                  }}
                </div>
              </div>
              <span
                class="side-tag"
                :class="h.is_public ? 'tag-public' : 'tag-event'"
              >
                {{ h.is_public ? "Holiday" : "Event" }}
              </span>
            </div>
          </template>
          <div v-else-if="!loading" class="side-empty">
            No holidays or events this month.
          </div>
          <div v-if="loading" class="side-empty">Loading...</div>
        </div>
      </div>
    </div>
    <!-- /cal-layout -->

    <!-- ════ DIALOG ════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDialog" class="dlg-overlay" @click.self="closeDialog">
          <div class="dlg">
            <div class="dlg-head">
              <h3>{{ selectedHoliday ? "Edit" : "Add" }} Event</h3>
              <button class="dlg-close" @click="closeDialog">×</button>
            </div>
            <div class="dlg-body">
              <div class="dlg-date-badge">{{ fmtDisplay(selectedDate) }}</div>
              <div v-if="selectedHoliday?.is_public" class="dlg-public-info">
                This is a <strong>public holiday</strong> — applies to all
                curriculums.
              </div>
              <div class="frow">
                <label>Event name <span class="req">*</span></label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="e.g. Khmer New Year"
                />
              </div>
              <div class="frow">
                <label>Description</label>
                <textarea
                  v-model="form.description"
                  placeholder="Optional note..."
                  rows="3"
                ></textarea>
              </div>
              <div class="frow">
                <label>Type</label>
                <div class="type-pills">
                  <button
                    class="type-pill"
                    :class="{ 'pill-active-event': !form.is_public }"
                    @click="form.is_public = false"
                  >
                    🏫 School event
                  </button>
                  <button
                    class="type-pill"
                    :class="{ 'pill-active-public': form.is_public }"
                    @click="form.is_public = true"
                  >
                    🇰🇭 Public holiday
                  </button>
                </div>
                <p v-if="form.is_public" class="type-hint">
                  Applies to all curriculums — Khmer, English, Chinese.
                </p>
                <p v-else class="type-hint">
                  Applies to the current curriculum only.
                </p>
              </div>
            </div>
            <div class="dlg-foot">
              <button
                class="btn-cancel"
                @click="closeDialog"
                :disabled="saving"
              >
                Cancel
              </button>
              <button
                v-if="selectedHoliday"
                class="btn-delete"
                @click="deleteEvent"
                :disabled="saving"
              >
                {{ saving ? "..." : "Delete" }}
              </button>
              <button
                class="btn-save"
                @click="saveEvent"
                :disabled="saving || !form.name.trim()"
              >
                {{ saving ? "Saving..." : "Save" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── root ─────────────────────────────────────────────── */
.calendar-root {
  font-family: inherit;
  max-width: 100%;
  margin: 0 auto;
}

/* ════════════════════════════════════════════════════════
   LAYOUT — the key change
   mobile  : column (stacked, same as before)
   desktop : row (calendar + side panel)
════════════════════════════════════════════════════════ */
.cal-layout {
  display: flex;
  flex-direction: column;
  gap: 0;
}

@media (min-width: 860px) {
  .cal-layout {
    flex-direction: row;
    align-items: flex-start;
    gap: 16px;
  }
}

/* ── calendar card ────────────────────────────────────── */
.cal-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  flex: 1; /* takes remaining width on desktop */
  min-width: 0;
}

/* ── side panel (DESKTOP only) ────────────────────────── */
.side-panel {
  display: none; /* hidden on mobile */
}

@media (min-width: 860px) {
  .side-panel {
    display: flex;
    flex-direction: column;
    width: 400px;
    flex-shrink: 0;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
    max-height: 640px; /* scroll if many events */
  }
}

.side-head {
  padding: 12px 14px 8px;
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 0.06em;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.side-scroll {
  flex: 1;
  overflow-y: auto;
}

.side-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.1s;
}
.side-item:hover {
  background: #fafafa;
}

.side-badge {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.sb-public {
  background: #fcebeb;
}
.sb-event {
  background: #e1f5ee;
}

.side-badge-d {
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
}
.sb-public .side-badge-d {
  color: #791f1f;
}
.sb-event .side-badge-d {
  color: #085041;
}

.side-badge-dw {
  font-size: 8px;
  font-weight: 500;
}
.sb-public .side-badge-dw {
  color: #a32d2d;
}
.sb-event .side-badge-dw {
  color: #0f6e56;
}

.side-info {
  flex: 1;
  min-width: 0;
}
.side-name {
  font-size: 11px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.side-name-kh {
  font-size: 10px;
  font-weight: 400;
  color: #6b7280;
}
.side-sub {
  font-size: 10px;
  color: #9ca3af;
}

.side-tag {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 500;
  white-space: nowrap;
}
.side-empty {
  padding: 16px 14px;
  font-size: 12px;
  color: #9ca3af;
}

/* ── holiday list: MOBILE only (inside card) ──────────── */
.hlist-mobile {
  border-top: 1px solid #f0f0f0;
}

/* hide mobile list on desktop */
@media (min-width: 860px) {
  .hlist-mobile {
    display: none;
  }
}

/* ── shared hlist styles (used in mobile) ─────────────── */
.hlist-head {
  padding: 10px 20px 6px;
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 0.06em;
}
.hlist-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  border-top: 1px solid #f9fafb;
  cursor: pointer;
  transition: background 0.1s;
}
.hlist-item:hover {
  background: #fafafa;
}

.hlist-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.badge-public {
  background: #fcebeb;
}
.badge-event {
  background: #e1f5ee;
}

.hlist-badge-d {
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}
.badge-public .hlist-badge-d {
  color: #791f1f;
}
.badge-event .hlist-badge-d {
  color: #085041;
}

.hlist-badge-dw {
  font-size: 8px;
  font-weight: 500;
}
.badge-public .hlist-badge-dw {
  color: #a32d2d;
}
.badge-event .hlist-badge-dw {
  color: #0f6e56;
}

.hlist-info {
  flex: 1;
  min-width: 0;
}
.hlist-name {
  font-size: 12px;
  font-weight: 500;
  color: #111827;
}
.hlist-name-kh {
  font-size: 11px;
  font-weight: 400;
  color: #6b7280;
}
.hlist-sub {
  font-size: 11px;
  color: #9ca3af;
}

.hlist-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
  white-space: nowrap;
}
.tag-public {
  background: #fcebeb;
  color: #791f1f;
}
.tag-event {
  background: #e1f5ee;
  color: #085041;
}
.hlist-empty {
  padding: 14px 20px;
  font-size: 13px;
  color: #9ca3af;
}

/* ── header ───────────────────────────────────────────── */
.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
}
.cal-month-label {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}
.cal-year-label {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 1px;
}
.cal-header-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-today {
  font-size: 12px;
  padding: 0 12px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  cursor: pointer;
  color: #6b7280;
  font-family: inherit;
  transition: background 0.15s;
}
.btn-today:hover {
  background: #f3f4f6;
  color: #111827;
}

.btn-nav {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  cursor: pointer;
  font-size: 16px;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.btn-nav:hover {
  background: #f3f4f6;
  color: #111827;
}

/* ── stats ────────────────────────────────────────────── */
.stats-row {
  display: flex;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
}
.stat-box {
  flex: 1;
  background: #f9fafb;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 8px 10px;
}
.stat-box.skeleton {
  height: 52px;
  animation: pulse 1.4s infinite;
}
.stat-num {
  font-size: 18px;
  font-weight: 600;
}
.stat-lbl {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 2px;
}
.text-red {
  color: #a32d2d;
}
.text-green {
  color: #0f6e56;
}
.text-blue {
  color: #185fa5;
}
.text-primary {
  color: #111827;
}

/* ── calendar body ────────────────────────────────────── */
.cal-body {
  padding: 12px 16px 0;
  position: relative;
}

.dow-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}
.dow-label {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: #6d727a;
  padding: 4px 0;
}
.dow-weekend {
  color: #a32d2d;
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding-bottom: 12px;
}

/* ── cells ────────────────────────────────────────────── */
.day-cell {
  border-radius: 8px;
  padding: 4px 5px;
  min-height: 36px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: default;
  transition: background 0.1s;
}
.cell-clickable {
  cursor: pointer;
}
.cell-clickable:hover:not(.cell-public):not(.cell-event) {
  background: #f3f4f6;
}

.day-num {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.cell-other {
  opacity: 0;
  pointer-events: none;
}
.cell-weekend .day-num {
  color: #a32d2d;
}
.cell-today {
  background: #ebf4ff;
}
.cell-today .day-num {
  background: #378add;
  color: #fff;
}
.cell-public {
  background: #fff0f0;
}
.cell-public .day-num {
  color: #a32d2d;
  font-weight: 600;
}
.cell-public:hover {
  background: #fce4e4;
}
.cell-event {
  background: #f0fff8;
}
.cell-event .day-num {
  color: #0f6e56;
  font-weight: 600;
}
.cell-event:hover {
  background: #e1f5ee;
}
.cell-today-public {
  background: #fcebeb;
}
.cell-today-public .day-num {
  background: #a32d2d;
  color: #fff;
}

/* chip — desktop only */
.event-chip {
  display: none;
  font-size: 9px;
  padding: 2px 5px;
  border-radius: 3px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin-top: 2px;
}
.chip-public {
  background: #fcebeb;
  color: #791f1f;
}
.chip-event {
  background: #e1f5ee;
  color: #085041;
}

/* dot — mobile only */
.day-dot {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
}
.dot-red {
  background: #e24b4a;
}
.dot-green {
  background: #1d9e75;
}

/* ── legend ───────────────────────────────────────────── */
.legend-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  padding: 8px 20px 12px;
  border-top: 1px solid #f0f0f0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #6b7280;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* ── loading ──────────────────────────────────────────── */
.loading-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}
.spinner {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 3px solid #e5e7eb;
  border-top-color: #378add;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes pulse {
  0%,
  100% {
    background: #f3f4f6;
  }
  50% {
    background: #e5e7eb;
  }
}

/* ── dialog ───────────────────────────────────────────── */
.dlg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dlg {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  width: 100%;
  max-width: 380px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
.dlg-head {
  padding: 14px 16px 10px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dlg-head h3 {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.dlg-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: #9ca3af;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.1s;
}
.dlg-close:hover {
  background: #f3f4f6;
  color: #111827;
}

.dlg-body {
  padding: 14px 16px;
}
.dlg-date-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ebf4ff;
  border: 1px solid #b5d4f4;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  color: #185fa5;
  font-weight: 500;
  margin-bottom: 12px;
}
.dlg-public-info {
  background: #fff0f0;
  border: 1px solid #f09595;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: #791f1f;
  margin-bottom: 12px;
}

.frow {
  margin-bottom: 12px;
}
.frow label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.req {
  color: #e24b4a;
}
.frow input,
.frow textarea {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  color: #111827;
  outline: none;
  transition: border-color 0.15s;
}
.frow input:focus,
.frow textarea:focus {
  border-color: #378add;
}
.frow textarea {
  resize: none;
}

.type-pills {
  display: flex;
  gap: 8px;
}
.type-pill {
  flex: 1;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  color: #6b7280;
  font-family: inherit;
  transition: all 0.15s;
}
.pill-active-event {
  background: #e1f5ee;
  border-color: #9fe1cb;
  color: #085041;
  font-weight: 600;
}
.pill-active-public {
  background: #fcebeb;
  border-color: #f09595;
  color: #791f1f;
  font-weight: 600;
}
.type-hint {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 6px;
}

.dlg-foot {
  padding: 10px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
}
.dlg-foot button {
  flex: 1;
  padding: 9px;
  font-size: 13px;
  font-family: inherit;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s;
}
.btn-cancel {
  background: none;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}
.btn-cancel:hover:not(:disabled) {
  background: #f3f4f6;
}
.btn-delete {
  background: #fcebeb;
  color: #791f1f;
  border: none;
}
.btn-delete:hover:not(:disabled) {
  background: #f7c1c1;
}
.btn-save {
  background: #378add;
  color: #fff;
  border: none;
}
.btn-save:hover:not(:disabled) {
  background: #185fa5;
}
.btn-save:disabled,
.btn-cancel:disabled,
.btn-delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── dialog transition ────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-from .dlg,
.fade-leave-to .dlg {
  transform: scale(0.96);
}

/* ════ RESPONSIVE ════ */
@media (max-width: 540px) {
  .event-chip {
    display: none !important;
  }
  .day-dot {
    display: block;
  }
  .day-cell {
    min-height: 36px;
    aspect-ratio: 1;
    justify-content: center;
    align-items: center;
  }
  .day-num {
    font-size: 12px;
  }
  .stats-row {
    gap: 6px;
    padding: 10px 12px;
  }
  .stat-num {
    font-size: 15px;
  }
  .stat-lbl {
    font-size: 9px;
  }
  .cal-month-label {
    font-size: 16px;
  }
}

@media (min-width: 541px) {
  .event-chip {
    display: block;
  }
  .day-dot {
    display: none;
  }
  .day-cell {
    min-height: 72px;
    align-items: flex-start;
  }
  .day-num {
    font-size: 11px;
  }
}
</style>
