<script setup>
import AddEditDialog from "@/views/admin/branches/AddEditDialog.vue";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useAppStore } from "@/stores/appStore.js";
import { useDisplay } from "vuetify";
import supabase from "@/utils/supabase";
import AppStatusChip from "@/components/AppStatusChip.vue";
const { mdAndUp } = useDisplay();

definePage({
  meta: {
    title: "Branches",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-branches",
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
  { title: t("Name Khmer"), key: "name_kh", visible: true },
  { title: t("Name English"), key: "name_en", visible: true },
  { title: t("Symbol"), key: "symbol", visible: true },
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

    const res = await api.post("branches-delete", { id: item.id });

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

    const res = await api.post("branches-store", data);

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
    isLoading.value = true;

    const res = await api.post("branches-show", { id: item.id });

    if (res.data.status) {
      formData.value = res.data.data.data;
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

    const res = await api.post("branches-update", data);

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

    const res = await api.post("branches-disable", { id: item.id });

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

const branches = ref([]);

const getBranches = async () => {
  await supabase
    .from("branches")
    .select("*")
    .then(({ data, error }) => {
      if (error) {
        console.error("Error with the response:", error);
      } else {
        console.log(data);
      }
    });
};

onMounted(() => {
  getBranches();
});
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
    title="Branches"
    title-icon="tabler-home"
    saveHeaderName="header-branches-list"
    saveStateName="save-state-branches-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="branches-list"
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

    <template #item.is_head="{ item }">
      <span class="is_head-style">
        {{ item.is_head == 1 ? "Head Office" : "Branch Office" }}
      </span>
    </template>

    <template v-slot:item.is_active="{ item }">
      <AppStatusChip
        :color="item.is_active == true ? 'success' : 'error'"
        :label="item.is_active == true ? t('Active') : t('Inactive')"
      />
    </template>
  </AppCardTable>
</template>
