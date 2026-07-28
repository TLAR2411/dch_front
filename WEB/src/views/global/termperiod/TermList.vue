<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useDisplay } from "vuetify";
import supabase from "@/utils/supabase.js";
import { calculateSchoolDayCountsForTerm } from "@/utils/schoolDays.js";
import { usePartStore } from "@/stores/partStore";
import { useSettingStore } from "@/stores/settingStore";
import { useYearStore } from "@/stores/yearStore";
import AddEditTermDialog from "./AddEditTermDialog.vue";

const { mdAndUp } = useDisplay();
definePage({
  meta: {
    title: "Term Periods",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const { t } = useI18n();
const partStore = usePartStore();
const settingStore = useSettingStore();
const yearStore = useYearStore();

const formData = ref({});
const isDialogVisible = ref(false);
const isLoading = ref(true);
const dataTableRef = ref(null);
const periods = ref([]);

const filter = ref({
  search: null,
});

const headers = [
  { title: t("Name Khmer"), key: "name_kh", visible: true },
  { title: t("Name English"), key: "name_en", visible: true },
  // { title: t("Name Chinese"), key: "name_cn", visible: true },
  {
    title: t("Start Date"),
    key: "start_date",
    visible: true,
    value: (item) => formatDate(item.start_date),
  },
  {
    title: t("End Date"),
    key: "end_date",
    visible: true,
    value: (item) => formatDate(item.end_date),
  },
  // {
  //   title: t("Year"),
  //   key: "school_year.year_name",
  //   visible: true,
  // },
  {
    title: "Total",
    key: "total_days",
    visible: true,
    align: "center",
  },
  {
    title: "Weekend",
    key: "weekend_days",
    visible: true,
    align: "center",
  },
  {
    title: "Holiday",
    key: "holiday_days",
    visible: true,
    align: "center",
  },
  {
    title: "Event",
    key: "school_event_days",
    visible: true,
    align: "center",
  },
  {
    title: "School Days",
    key: "school_days",
    visible: true,
    align: "center",
  },
  {
    title: t("Action"),
    key: "actions",
    align: "center",
    visible: true,
    fixed: mdAndUp.value,
  },
];

const filteredPeriods = computed(() => {
  const q = String(filter.value.search || "")
    .trim()
    .toLowerCase();
  if (!q) return periods.value;

  return periods.value.filter((item) => {
    const haystack = [
      item.name_en,
      item.name_kh,
      item.name_cn,
      item.symbol,
      item.school_year?.year_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
});

async function loadPeriods() {
  isLoading.value = true;
  try {
    let query = supabase
      .from("academic_period")
      .select(
        `
        id,
        name_en,
        name_kh,
        name_cn,
        symbol,
        description,
        start_date,
        end_date,
        year_id,
        branch_id,
        is_active,
        total_days,
        weekend_days,
        holiday_days,
        school_event_days,
        school_days,
        school_days_calculated_at,
        school_year:school_year(id, year_name, start_date, end_date)
      `,
      )
      .is("deleted_at", null)
      .order("start_date", { ascending: true });

    if (settingStore.branch_id != null) {
      query = query.eq("branch_id", settingStore.branch_id);
    }
    if (yearStore.year_id != null) {
      query = query.eq("year_id", yearStore.year_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];

    // Backfill school-day stats for older rows (once)
    for (const row of rows) {
      if (
        row.school_days != null ||
        !row.start_date ||
        !row.end_date ||
        !row.year_id
      ) {
        continue;
      }

      try {
        const counts = await calculateSchoolDayCountsForTerm({
          startDate: row.start_date,
          endDate: row.end_date,
          yearId: row.year_id,
          curId: partStore.cur_id,
          branchId: settingStore.branch_id ?? row.branch_id,
        });

        const { error: updateError } = await supabase
          .from("academic_period")
          .update(counts)
          .eq("id", row.id);

        if (!updateError) {
          Object.assign(row, counts);
        }
      } catch (backfillError) {
        console.error("Failed to backfill school days:", backfillError);
      }
    }

    periods.value = rows;
  } catch (error) {
    console.error("Failed to fetch academic periods:", error);
    periods.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function buildSchoolDayCounts(payload) {
  return calculateSchoolDayCountsForTerm({
    startDate: payload.start_date,
    endDate: payload.end_date,
    yearId: payload.year_id,
    curId: partStore.cur_id,
    branchId: settingStore.branch_id ?? payload.branch_id,
  });
}

const onDelete = async (item) => {
  try {
    const res = await api.post("academics-periods-delete", {
      id: item.id,
    });
    if (res.data.status) {
      await loadPeriods();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;

    const schoolDayCounts = await buildSchoolDayCounts(data);

    const payload = {
      name_kh: data.name_kh || null,
      name_en: data.name_en || null,
      name_cn: data.name_cn || null,
      symbol: data.symbol || null,
      description: data.description || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      year_id: data.year_id || null,
      branch_id: settingStore.branch_id ?? null,
      is_active: true,
      ...schoolDayCounts,
    };

    const { error } = await supabase.from("academic_period").insert(payload);
    if (error) throw error;

    await loadPeriods();
    isDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to create academic period:", error);
    callback(false);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("academics-periods-show", { id: item.id });

    if (res.data.status) {
      formData.value = res.data.data;
      isDialogVisible.value = true;
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onUpdate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("academics-periods-update", data);

    if (res.data.status) {
      // Keep API update, then refresh school-day stats via Supabase
      try {
        const schoolDayCounts = await buildSchoolDayCounts(data);
        await supabase
          .from("academic_period")
          .update(schoolDayCounts)
          .eq("id", data.id);
      } catch (countError) {
        console.error("Failed to refresh school day counts:", countError);
      }

      await loadPeriods();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
    callback(false);
  } finally {
    isLoading.value = false;
  }
};

const onDisable = async (item) => {
  try {
    const res = await api.post("academics-periods-disable", {
      id: item.id,
    });

    if (res.data.status) {
      await loadPeriods();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
};

watch(
  () => [settingStore.branch_id, yearStore.year_id],
  async () => {
    await loadPeriods();
  },
);

onMounted(async () => {
  await loadPeriods();
});
</script>

<template>
  <AddEditTermDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    ref="dataTableRef"
    title="Term Periods"
    title-icon="tabler-calendar-stats"
    saveHeaderName="header-term-periods-list"
    saveStateName="save-state-term-periods-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    :items="filteredPeriods"
    :headers="headers"
    is-filter
    is-excel
    is-edit
    is-delete
    is-disable
    create-dialog
    save-state
    :is-back="false"
    @on-delete="onDelete"
    @on-edit="onEdit"
    @on-disable="onDisable"
  >
    <template #filter>
      <VRow class="justify-end">
        <VCol cols="12" sm="6" md="4" lg="2">
          <VTextField
            v-model="filter.search"
            :label="t('Search')"
            prepend-inner-icon="tabler-search"
            clearable
            hide-details
            autocomplete="off"
            clear-icon="tabler-x"
          />
        </VCol>
      </VRow>
    </template>
  </AppCardTable>
</template>
