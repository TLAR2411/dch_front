<script setup>
import AddEditAccountTypeDialog from "@/views/accounting/account-types/AddEditDialog.vue";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useAppStore } from "@/stores/appStore.js";
import { useDisplay } from "vuetify";
const { mdAndUp } = useDisplay();
definePage({
  meta: {
    title: "Account Types",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-account-types",
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
  // {title: t("ID"), sortable: false, key: "id"},
  { title: t("Name Khmer"), key: "name_kh", visible: true },
  { title: t("Name English"), key: "name_en", visible: true },
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

    const res = await api.post("account-types-delete", { id: item.value });

    if (res.data.status) {
      dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    useAppStore().getAccountTypes();
    isLoading.value = false;
  }
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("account-types-store", data);

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
    useAppStore().getAccountTypes();
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("account-types-show", { id: item.id });

    if (res.data.status) {
      formData.value = res.data.data;
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

    const res = await api.post("account-types-update", data);

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
    useAppStore().getAccountTypes();
    isLoading.value = false;
  }
};
</script>

<template>
  <AddEditAccountTypeDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AppCardTable
    ref="dataTableRef"
    v-model:isDialogCreateVisible="isDialogVisible"
    v-model:loading="isLoading"
    v-model:filters="filter"
    title="Account Types"
    title-icon="tabler-calculator"
    api-url="account-types-list"
    save-state
    saveHeaderName="header-account-types-list"
    saveStateName="save-state-account-types-list"
    :headers="headers"
    is-filter
    is-excel
    create-dialog
    is-edit
    is-delete
    @on-delete="onDelete"
    @on-edit="onEdit"
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
