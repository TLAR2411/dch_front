<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useDisplay } from "vuetify";
import formatTime from "@/utils/formater/formatTime";

import AddEditSubjectDialog from "./AddEditSubjectDialog.vue";
import { onMounted } from "vue";
import { getSubjects } from "@/services/dataService.js";
const { mdAndUp } = useDisplay();
definePage({
  meta: {
    title: "Checkin Checkout",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-curriculumns",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const { t } = useI18n();
const formData = ref({});
const isDialogVisible = ref(false);
const isLoading = ref(true);
const dataTableRef = ref(null);

const subjects = ref([]);

const filter = ref({
  search: null,
});

const headers = [
  { title: t("Name Khmer"), key: "name_kh", visible: true },
  { title: t("Name English"), key: "name_en", visible: true },
  { title: t("Name Chinese"), key: "name_cn", visible: true },
  { title: t("Symbol"), key: "code", visible: true },
  { title: t("Child Subject"), key: "sub_subjects", visible: true },
  { title: t("Description"), key: "description", visible: true },

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
    const res = await api.post("subjects-delete", {
      id: item.id,
    });
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

    const res = await api.post("subjects-store", data);

    if (res.data.status) {
      dataTableRef.value.reload();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
    subjects.value = await getSubjects();
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("subjects-show", { id: item.id });

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

    const res = await api.post("subjects-update", data);

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
    const res = await api.post("subjects-disable", {
      id: item.id,
    });

    if (res.data.status) {
      await dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
  }
};

onMounted(async () => {
  subjects.value = await getSubjects();
});
</script>

<template>
  <AddEditSubjectDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    :data="subjects"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    ref="dataTableRef"
    title="Subjects"
    title-icon="tabler-cash-banknote"
    saveHeaderName="header-subjects-list"
    saveStateName="save-state-subjects-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="subjects-list"
    :headers="headers"
    is-filter
    is-excel
    is-edit
    is-delete
    is-view
    is-disable
    create-dialog
    save-state
    :is-back="false"
    @on-delete="onDelete"
    @on-edit="onEdit"
    @on-disable="onDisable"
    @on-view="onView"
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

    <template v-slot:item.sub_subjects="{ item }">
      <VChip color="info" size="small">
        {{ item.sub_subjects }} <VIcon icon="tabler-folder" class="ml-1" />
      </VChip>
    </template>

    <template v-slot:item.default="{ item }">
      <VChip color="success" size="small" v-if="item.default == true">
        {{ $t("Default") }}
      </VChip>
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
