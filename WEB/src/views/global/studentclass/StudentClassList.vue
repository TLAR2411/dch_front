<script setup>
import { useI18n } from "vue-i18n";
import { ref } from "vue";
import { api } from "@/utils/api";
import { onMounted } from "vue";
import { useDisplay } from "vuetify";
import AppName from "@/components/AppName.vue";
import formatGender from "@/utils/formater/formatGender";
import formatDate from "@/utils/formater/formatDate";
import { useRouter } from "vue-router";
import AddEditStudentClassDialog from "./AddEditStudentClassDialog.vue";
import DeleteAlert from "@/helper/deleteAlert.js";
// import AddEditStudentCurriculumDialog from "./AddEditStudentCurriculumDialog.vue";
// import AddEditStudentClassDialog from "../studentclass/
// AddEditStudentClassDialog.vue";

const props = defineProps({
  payload: {
    type: Object,
    default: {},
  },
});

const router = useRouter();

const { mdAndUp } = useDisplay();

const dataTableRef = ref(null);

const isDialogVisible = ref(false);

const isDialogVisibleStudentClass = ref(false);

const formDataStudentClass = ref({});

const isLoading = ref(true);

const class_id = ref(props.payload.class_id);

definePage({
  meta: {
    title: "Students",
    layout: "default",
    subject: "Students",
    requiresAuth: true,
    // permissions: "students:view-page",
  },
});

const { t, locale } = useI18n();

const headers = ref([
  { title: t("photo"), key: "student.photo_path", visible: true },
  {
    title: t("Gender"),
    key: "student.gender",
    visible: true,
    value: (item) => formatGender(item.student.gender, t),
  },
  {
    title: t("date_of_birth"),
    key: "dob",
    visible: true,
    value: (item) => formatDate(item.student.dob),
  },
  { title: t("Nation"), key: "student.nation", visible: true },
  {
    title: t("Action"),
    key: "actions",
    align: "center",
    visible: true,
    fixed: mdAndUp.value,
  },
]);

const onDelete = async (item) => {
  try {
    const res = await api.post("students-classes-delete", { id: item.id });
    if (res.data.status) {
      dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    // isLoading.value = false;
  }
};

const onCreateStudentClass = async (data, callback) => {
  console.log("Creating with data:", data);
  const payload = {
    student_id: data.student_id || [],
    class_id: class_id.value,
  };

  try {
    isLoading.value = true;

    const res = await api.post("students-classes-enrollment", payload);

    if (res.data.status) {
      dataTableRef.value.reload();
      isDialogVisibleStudentClass.value = false;
      getStudentAvailable();
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

const getStudentAvailable = async () => {
  try {
    await api
      .post("students-available-enrollment", {
        class_id: class_id?.value,
      })
      .then((res) => {
        formDataStudentClass.value = res.data.data;
        console.log("student available", res.data.data);
      });
  } catch (error) {
    console.log(error);
  }
};

const onEdit = async (item) => {
  router.push({ name: "admin-students-edit-id", params: { id: item.id } });
};

onMounted(() => {
  getStudentAvailable();
});

const selectStudents = ref([]);

const testSelect = () => {
  console.log(selectStudents.value);
};

const onDeleteSelected = async () => {
  if (!selectStudents.value.length) return;

  const deleted = await DeleteAlert(() =>
    api.post("students-classes-delete", {
      id: selectStudents.value,
    }),
  );

  if (deleted) {
    selectedStudents.value = [];
    dataTableRef.value.reload();
  }
};
</script>

<template>
  <AddEditStudentClassDialog
    v-model:isDialogVisibleStudentClass="isDialogVisibleStudentClass"
    :loading="isLoading"
    :item-data="formDataStudentClass"
    :classData="classData"
    @on-create-student-class="onCreateStudentClass"
  />
  <AppCardTable
    v-model="selectStudents"
    v-model:isDialogCreateVisible="isDialogVisibleStudentClass"
    ref="dataTableRef"
    title="Students"
    title-icon="tabler-user-cog"
    saveHeaderName="header-students-list"
    saveStateName="save-state-students-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="students-classes-list"
    :api-data="payload"
    :headers="headers"
    is-filter
    is-excel
    is-delete
    is-delete-selected
    item-value="id"
    show-select
    create-dialog
    save-state
    @on-delete="onDelete"
    @on-delete-selected="onDeleteSelected"
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

    <template #[`item.student.photo_path`]="{ item }">
      <div class="d-flex flex-row pt-2 pb-2">
        <AppName
          :title="item.student.name_en"
          :sub-title="item.student.name_kh"
          :image="item.student.photo_path"
        />
      </div>
    </template>
  </AppCardTable>
</template>
