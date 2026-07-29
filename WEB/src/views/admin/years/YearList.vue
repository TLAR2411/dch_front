<script setup>
// import AddEditDialog from "@/views/admin/branches/AddEditDialog.vue";
import AddEditYearDialog from "@/views/admin/years/AddEditYearDialog.vue";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useAppStore } from "@/stores/appStore.js";
import { useDisplay } from "vuetify";
const { mdAndUp } = useDisplay();
definePage({
  meta: {
    title: "Years",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-years",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const { t } = useI18n();
const formData = ref({});
const isDialogVisible = ref(false);
const isLoading = ref(true);
const dataTableRef = ref(null);

const filter = ref({
  search: null,
});

const headers = [
  // { title: t("ID"), sortable: false, key: "id", visible: true },
  { title: t("Name"), key: "year_name", visible: true },
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
  { title: t("Status"), key: "is_active", visible: true },
  {
    title: t("Action"),
    key: "actions",
    align: "center",
    visible: true,
    fixed: mdAndUp.value,
  },
];

const onDelete = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("years-delete", { id: item.id });

    if (res.data.status) {
      dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    useAppStore().getBranches();
    isLoading.value = false;
  }
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("years-store", data);

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
    useAppStore().getBranches();
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    // isLoading.value = true;
    const res = await api.post("years-show", { id: item.id });
    if (res.data.status) {
      formData.value = res.data.data.data;
      isDialogVisible.value = true;
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    // isLoading.value = false;
  }
};

const onUpdate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("years-update", data);

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
    useAppStore().getBranches();
    isLoading.value = false;
  }
};

const onDisable = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("years-disable", { id: item.id });

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
    useAppStore().getBranches();
    isLoading.value = false;
  }
};

onMounted(() => {});
</script>

<template>
  <AddEditYearDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    ref="dataTableRef"
    title="Years"
    title-icon="tabler-calendar"
    saveHeaderName="header-branches-list"
    saveStateName="save-state-years-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="years-list"
    :headers="headers"
    is-filter
    is-excel
    is-edit
    is-delete
    is-disable
    create-dialog
    save-state
    :is-back="false"
    @onEdit="onEdit"
    @onDelete="onDelete"
    @onDisable="onDisable"
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
      <AppStatusChip
        :color="item.is_active == true ? 'success' : 'error'"
        :label="item.is_active == true ? t('Active') : t('Inactive')"
      />
    </template>
  </AppCardTable>
</template>
