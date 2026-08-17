<script setup>
import AddEditClosedDayDialog from "@/views/admin/closed-days/AddEditDialog.vue";
import { createHolidays } from "@/services/api/holiday";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { computed } from "vue";
import AddEditImportHoliday from "./AddEditImportHoliday.vue";
import formatDate from "@/utils/formater/formatDate.js";

const currentYear = computed(() => new Date().getFullYear());

const { t } = useI18n();
const isDialogVisible = ref(false);
const isLoading = ref(true);
const dataTableRef = ref(null);

const isDialogImportHoliday = ref(false);
const importYear = ref(new Date().getFullYear());
const importFetchLoading = ref(false);

const filter = ref({
  search: null,
});

const formData = ref({});

const headers = [
  // { title: t("ID"), sortable: false, key: "id" },
  {
    title: t("Date"),
    key: "date",
    visible: true,
    value: (item) => formatDate(item.date),
  },
  {
    title: t("Name English"),
    key: "name_en",
  },
  {
    title: t("Name Khmer"),
    key: "name_kh",
  },
  {
    title: t("Type"),
    key: "is_public",
    visible: true,

    value: (items) =>
      items.is_public == true ? "National Festival" : "School Holiday",
  },
  { title: t("Description"), key: "description" },
  { title: t("Status"), key: "is_active", align: "center" },
  { title: t("Action"), key: "actions", align: "center" },
];

const onDelete = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("closed-days-delete", { id: item.id });

    if (res.data.status) {
      dataTableRef.value.reload();
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

    const res = await api.post("closed-days-store", data);

    if (res.data.status) {
      dataTableRef.value.reload();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("closed-days-show", { id: item.id });

    if (res.data.status) {
      formData.value = {
        ...res.data.data,
        is_public_holiday: res.data.data.is_public_holiday == 0 ? false : true,
      };
      console.log(formData.value);

      // console.log(formData.value)
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

    const res = await api.post("closed-days-update", data);

    if (res.data.status) {
      dataTableRef.value.reload();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onDisable = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("closed-days-disable", { id: item.id });

    if (res.data.status) {
      dataTableRef.value.reload();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const public_holiday = ref([]);

const fetchHolidaysForYear = async (year) => {
  const targetYear = Number(year) || currentYear.value;
  importYear.value = targetYear;
  importFetchLoading.value = true;
  public_holiday.value = [];

  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/publicholidays/${targetYear}/KH`,
    );
    if (!res.ok) throw new Error(`Failed to load holidays for ${targetYear}`);
    const data = await res.json();
    public_holiday.value = Array.isArray(data) ? data : [];
  } catch (error) {
    console.log("error", error);
    public_holiday.value = [];
  } finally {
    importFetchLoading.value = false;
  }
};

const onImportHoliday = async () => {
  isDialogImportHoliday.value = true;
  await fetchHolidaysForYear(importYear.value || currentYear.value);
};

const onCreateHoliday = async (payload, callback) => {
  try {
    isLoading.value = true;

    const holidays = Array.isArray(payload) ? payload : payload?.holidays || [];
    const year =
      Number(payload?.year) || Number(importYear.value) || currentYear.value;

    if (!holidays.length || !year) {
      callback(false);
      return;
    }

    const insertPayload = holidays.map((d) => ({
      date: d.date,
      name_kh: d.localName,
      name_en: d.name,
      year: String(year),
      is_public: true,
      is_deleted: false,
    }));

    try {
      await createHolidays(insertPayload);
    } catch (error) {
      console.error("Insert error:", error);
      callback(false);
      return;
    }

    dataTableRef.value.reload();
    isDialogImportHoliday.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to insert holidays:", error);
    callback(false);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <AddEditClosedDayDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AddEditImportHoliday
    v-model:isDialogImportHoliday="isDialogImportHoliday"
    v-model:import-year="importYear"
    :item-data="public_holiday"
    :loading="isLoading"
    :fetch-loading="importFetchLoading"
    @on-create-holiday="onCreateHoliday"
    @on-load-year="fetchHolidaysForYear"
  />

  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    ref="dataTableRef"
    title="Closed Days"
    title-icon="tabler-calendar-minus"
    saveHeaderName="header-closed-days-list"
    saveStateName="save-state-closed-days-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="holiday-list"
    :headers="headers"
    is-filter
    is-excel
    is-edit
    is-delete
    is-import-holiday
    is-disable
    create-dialog
    save-state
    @on-delete="onDelete"
    @on-edit="onEdit"
    @on-disable="onDisable"
    @on-import-holiday="onImportHoliday"
  >
    <template #filter>
      <VRow class="justify-end">
        <!----Filter Input-->

        <VCol cols="12" sm="6" md="4" lg="2">
          <VTextField
            v-model="filter.search"
            :label="t('Search')"
            prepend-inner-icon="tabler-search"
            clearable
            hide-details
            autocomlete="off"
            clear-icon="tabler-x"
          />
        </VCol>
      </VRow>
    </template>

    <template v-slot:item.is_active="{ item }">
      <VChip color="success" size="small" v-if="item.is_active == true">
        {{ $t("Active") }}
      </VChip>
      <VChip color="error" size="small" v-if="item.is_active == false">
        {{ $t("Inactive") }}
      </VChip>
    </template>
  </AppCardTable>
</template>
