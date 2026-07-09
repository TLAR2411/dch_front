<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import AddEditDialog from "@/views/admin/address/communes/AddEditDialog.vue";
import { useAppStore } from "@/stores/appStore.js";
import { useDisplay } from "vuetify";
const { mdAndUp } = useDisplay();
definePage({
  meta: {
    title: "Communes",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-communes",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const { t } = useI18n();
const formData = ref({});
const dataTableRef = ref(null);
const isDialogVisible = ref(false);
const isLoading = ref(true);

const filter = ref({
  search: null,
});

const headers = [
  // { title: t("ID"), sortable: false, key: "id" },
  { title: t("Code"), key: "code", visible: true },
  { title: t("Name Khmer"), key: "name_kh", visible: true },
  { title: t("Name English"), key: "name_en", visible: true },
  { title: t("District"), key: "district.name_kh", visible: true },
  { title: t("Province"), key: "district.province.name_kh", visible: true },
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

    const res = await api.post("communes-delete", { id: item.id });

    dataTableRef.value.reload();
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    useAppStore().getCommunes();
    isLoading.value = false;
  }
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("communes-store", data);

    dataTableRef.value.reload();
    isDialogVisible.value = false;
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    useAppStore().getCommunes();
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("communes-show", { id: item.id });

    formData.value = res.data.data;
    // console.log(formData.value)
    isDialogVisible.value = true;
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onUpdate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("communes-update", data);

    dataTableRef.value.reload();
    isDialogVisible.value = false;
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    useAppStore().getCommunes();
    isLoading.value = false;
  }
};

const onDisable = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("communes-disable", { id: item.id });

    dataTableRef.value.reload();
    isDialogVisible.value = false;
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    useAppStore().getCommunes();
    isLoading.value = false;
  }
};
</script>

<template>
  <AddEditDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    ref="dataTableRef"
    title="Communes"
    title-icon="tabler-map"
    saveHeaderName="header-communes-list"
    saveStateName="save-state-communes-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="communes-list"
    :headers="headers"
    is-filter
    is-excel
    is-edit
    is-delete
    create-dialog
    save-state
    @onEdit="onEdit"
    @onDelete="onDelete"
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
  </AppCardTable>
</template>
