<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { onMounted } from "vue";
import { useDisplay } from "vuetify";
import AppName from "@/components/AppName.vue";
import formatGender from "@/utils/formater/formatGender";
import { useRouter } from "vue-router";
import { usePartStore } from "@/stores/partStore";
import { storeToRefs } from "pinia";

const partStore = usePartStore();
const { cur_id } = storeToRefs(partStore);

// const part = computed(() => {
//   if (cur_id.value === 1) return "khmer";
//   if (cur_id.value === 2) return "english";
//   if (cur_id.value === 3) return "chinese";
//   return null;
// });

const router = useRouter();

const { mdAndUp } = useDisplay();

const dataTableRef = ref(null);

const isLoading = ref(true);

definePage({
  meta: {
    title: "Teachers",
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

    { title: t("Nation"), key: "nation", visible: true },
    { title: t("email"), key: "email", visible: true },
    { title: t("phone"), key: "phone", visible: true },
    { title: t("Teaching"), key: "is_teaching", visible: true },
    {
      title: t("Status"),
      key: "is_active",
      visible: true,
    },
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
    const res = await api.post("teachers-disable", { id: item.id });
    if (res.data.status) {
      dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to disable teacher:", error);
  } finally {
    // isLoading.value = false;
  }
};

const onDelete = async (item) => {
  try {
    const res = await api.post("teachers-delete", { id: item.id });

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

const onEdit = async (item) => {
  router.push({ name: "global-teachers-edit-id", params: { id: item.id } });
};

const onView = async (item) => {
  router.push({ name: "global-teachers-detail-id", params: { id: item.id } });
};

const filter = ref({ search: null });
watch(
  cur_id,
  (id) => {
    filter.value.cur_id = id;
  },
  { immediate: true },
);
onMounted(() => {});
</script>

<template>
  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    ref="dataTableRef"
    title="Teachers"
    title-icon="tabler-user-cog"
    saveHeaderName="header-teachers-list"
    saveStateName="save-state-teachers-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="teachers-list"
    :headers="headers"
    is-filter
    is-excel
    :extra-payload="{ cur_id: cur_id }"
    is-edit
    is-delete
    is-disable
    is-view
    create-dialog
    create-page="global-teachers-create"
    save-state
    @on-view="onView"
    @on-delete="onDelete"
    @on-edit="onEdit"
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
          :title="item.name_kh"
          :sub-title="item.name_en"
          :image="item.photo_path"
        />
      </div>
    </template>

    <template #[`item.is_teaching`]="{ item }">
      <AppStatusChip
        :color="item.is_teaching == true ? 'success' : 'error'"
        :label="item.is_teaching == true ? t('Teaching') : t('Not Teaching')"
      />
    </template>

    <template #[`item.is_active`]="{ item }">
      <AppStatusChip
        :color="item.is_active == true ? 'success' : 'error'"
        :label="item.is_active == true ? t('Active') : t('Inactive')"
      />
    </template>
  </AppCardTable>
</template>
