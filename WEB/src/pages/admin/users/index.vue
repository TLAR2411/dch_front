<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { computed, ref } from "vue";
import formatGender from "@/utils/formater/formatGender";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import AppName from "@/components/AppName.vue";
import { useEntityLabel } from "@/composable/useEntityLabel.js";

const { mdAndUp } = useDisplay();
const { t, locale } = useI18n();
const { entityLabel } = useEntityLabel();
const router = useRouter();

definePage({
  meta: {
    title: "Users",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "users:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const dataTableRef = ref(null);
const isLoading = ref(true);

const filter = ref({
  search: null,
});

const headers = computed(() => {
  locale.value;
  return [
    { title: t("User"), key: "code", visible: true, fixed: mdAndUp.value },
    { title: t("Username"), key: "username", visible: true },
    { title: t("Email"), key: "email", visible: true },
    {
      title: t("Gender"),
      key: "gender",
      value: (item) => formatGender(item.gender, t),
      visible: true,
    },
    {
      title: t("Branch"),
      key: "branch",
      value: (item) => entityLabel(item.branch),
      visible: true,
    },
    {
      title: t("Role"),
      key: "role.display_name",
      visible: true,
    },
    {
      title: t("Status"),
      key: "is_active",
      align: "center",
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

const onDelete = async (item) => {
  try {
    const res = await api.post("users-delete", { id: item.id });
    if (res.data.status) {
      dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to delete user:", error);
  }
};

const onEdit = (item) => {
  router.push({ name: "admin-users-edit", query: { id: item.id } });
};

const onDisable = async (item) => {
  try {
    const res = await api.post("users-disable", { id: item.id });
    if (res.data.status) {
      dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to disable user:", error);
  }
};
</script>

<template>
  <AppCardTable
    ref="dataTableRef"
    :title="t('List Users')"
    title-icon="tabler-users"
    saveHeaderName="header-list-users-v2"
    saveStateName="save-state-list-users-v2"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="users-list"
    :headers="headers"
    can-create="add-users"
    create-page="admin-users-create"
    is-filter
    is-edit
    is-delete
    is-disable
    is-excel
    save-state
    :is-back="false"
    @on-delete="onDelete"
    @on-edit="onEdit"
    @on-disable="onDisable"
  >
    <template #filter>
      <VRow class="justify-end">
        <VCol cols="12" sm="6" md="4" lg="2">
          <VTextField
            v-model="filter.search"
            :label="t('Search')"
            prepend-inner-icon="tabler-search"
            clearable
            hide-details
            autocomplete="off"
            clear-icon="tabler-x"
          />
        </VCol>
      </VRow>
    </template>

    <template #item.code="{ item }">
      <div class="d-flex flex-row pt-2 pb-2">
        <AppName
          :title="item.name_kh"
          :sub-title="item.name_en"
          :image="item.image_path"
        />
      </div>
    </template>

    <template #item.is_active="{ item }">
      <VChip v-if="item.is_active == true" color="success" size="small">
        {{ t("Active") }}
      </VChip>
      <VChip v-else color="error" size="small">
        {{ t("Inactive") }}
      </VChip>
    </template>
  </AppCardTable>
</template>
