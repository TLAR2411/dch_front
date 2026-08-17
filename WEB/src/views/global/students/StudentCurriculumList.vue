<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useDisplay } from "vuetify";
import AppName from "@/components/AppName.vue";
import formatGender from "@/utils/formater/formatGender";
import { useRouter } from "vue-router";
import AddEditStudentCurriculumDialog from "./AddEditStudentCurriculumDialog.vue";
import AddEditStudentClassDialog from "../studentclass/AddEditStudentClassDialog.vue";

const router = useRouter();

const { mdAndUp } = useDisplay();

const dataTableRef = ref(null);

const isDialogVisible = ref(false);

const isDialogVisibleStudentClass = ref(false);

const isLoading = ref(true);

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

const headers = computed(() => {
  locale.value; // re-run when language changes
  return [
    { title: t("photo"), key: "photo_path", visible: true },
    {
      title: t("Gender"),
      key: "gender",
      visible: true,
      value: (item) => formatGender(item.gender, t),
    },
    {
      title: t("date_of_birth"),
      key: "dob",
      visible: true,
      value: (item) => formatDate(item.dob),
    },
    { title: t("Nation"), key: "nation", visible: true },
    { title: t("email"), key: "email", visible: true },
    { title: t("Mother Contact"), key: "m_contact", visible: true },
    { title: t("Father Contact"), key: "f_contact", visible: true },
    { title: t("Status"), key: "is_active", visible: true },
    {
      title: t("Action"),
      key: "actions",
      align: "center",
      visible: true,
      fixed: mdAndUp.value,
    },
  ];
});

const onDisable = async (item) => {
  try {
    // isLoading.value = true;
    const res = await api.post("students-curriculums-disable", { id: item.id });
    if (res.data.status) {
      dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to disable student:", error);
  } finally {
    // isLoading.value = false;
  }
};

const onDelete = async (item) => {
  try {
    const res = await api.post("students-curriculums-delete", { id: item.id });

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

const onCreate = async (data, callback) => {
  console.log("Creating with data:", data);
  try {
    isLoading.value = true;

    const res = await api.post("students-curriculums-enrollment", data);

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

// Removed: a direct supabase.from() fetch that pulled the whole table on
// mount, console.logged it, and assigned nothing. The visible list comes
// from the API via AppCardTable/AppDataTable. See
// dch_app/docs/frontend-integration-contract.md

const onEdit = async (item) => {
  router.push({ name: "admin-students-edit-id", params: { id: item.id } });
};

</script>

<template>
  <AddEditStudentCurriculumDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AddEditStudentClassDialog
    v-model:isDialogVisibleStudentClass="isDialogVisibleStudentClass"
    :loading="isLoading"
    @on-create="onCreateStudentClass"
  />
  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    ref="dataTableRef"
    title="Students"
    title-icon="tabler-user-cog"
    saveHeaderName="header-students-list"
    saveStateName="save-state-students-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="students-curriculums-list"
    :headers="headers"
    is-filter
    is-excel
    is-disable
    create-dialog
    save-state
    @on-disable="onDisable"
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

    <template #[`item.photo_path`]="{ item }">
      <div class="d-flex flex-row pt-2 pb-2">
        <AppName
          :title="item.name_en"
          :sub-title="item.name_kh"
          :image="item.photo_path"
        />
      </div>
    </template>

    <template v-slot:item.is_active="{ item }">
      <AppStatusChip
        :color="item.is_active == true ? 'success' : 'error'"
        :label="item.is_active == true ? t('Study') : t('Not Study')"
      />
    </template>
  </AppCardTable>
</template>
