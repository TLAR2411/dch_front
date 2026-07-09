<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useDisplay } from "vuetify";

import AddEditStudentClassDialog from "../studentclass/AddEditStudentClassDialog.vue";

import AddEditClassDialog from "./AddEditClassDialog.vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
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

const router = useRouter();

const { t } = useI18n();
const formData = ref({});
const formDataStudentClass = ref({});
const isDialogVisible = ref(false);
const isDialogVisibleStudentClass = ref(false);
const isLoading = ref(true);
const dataTableRef = ref(null);

const classData = ref(null);

const filter = ref({
  search: null,
});

const headers = [
  { title: t("Name Khmer"), key: "name_kh", visible: true },
  { title: t("Name English"), key: "name_en", visible: true },
  { title: t("Name Chinese"), key: "name_cn", visible: true },
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
    isLoading.value = true;

    const res = await api.post("classes-delete", {
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

const class_id = ref(null);

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("classes-store", data);

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

const onCreateStudentClass = async (data, callback) => {
  console.log("data oncreateStudentclass", data.student_id);

  const payload = {
    student_id: data.student_id || [],
    class_id: class_id.value,
  };

  console.log(payload);

  try {
    isLoading.value = true;

    const res = await api.post("students-classes-enrollment", payload);

    if (res.data.status) {
      dataTableRef.value.reload();
      isDialogVisibleStudentClass.value = false;
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

const onAdd = async (item) => {
  isLoading.value = true;
  class_id.value = item.id;
  try {
    const res = await api.post("students-available-enrollment", {
      class_id: item.id,
    });
    if (res.data.status) {
      formDataStudentClass.value = res.data.data;
      isDialogVisibleStudentClass.value = true;
      classData.value = item;
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("classes-show", { id: item.id });

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

    const res = await api.post("classes-update", data);

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

const onView = async (item) => {
  console.log("item", item);
  router.push({ name: "global-classes-detail-id", params: { id: item.id } });
  console.log("hel");
};

const onDisable = async (item) => {
  try {
    const res = await api.post("classes-disable", {
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

const onAtt = (item) => {
  console.log(item);
  router.push({ name: "global-attendance-id", params: { id: item.id } });
};
</script>

<template>
  <AddEditClassDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AddEditStudentClassDialog
    v-model:isDialogVisibleStudentClass="isDialogVisibleStudentClass"
    :loading="isLoading"
    :item-data="formDataStudentClass"
    :classData="classData"
    @on-create-student-class="onCreateStudentClass"
  />

  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    ref="dataTableRef"
    title="Classes"
    title-icon="tabler-cash-banknote"
    saveHeaderName="header-classes-list"
    saveStateName="save-state-classes-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="classes-list"
    :headers="headers"
    is-filter
    is-excel
    is-edit
    is-add
    is-attendance
    is-delete
    is-disable
    is-view
    create-dialog
    save-state
    :is-back="false"
    @on-delete="onDelete"
    @on-edit="onEdit"
    @on-disable="onDisable"
    @on-add="onAdd"
    @on-view="onView"
    @on-attendance="onAtt"
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
