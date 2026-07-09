<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import formatDate from "@/utils/formater/formatDate";
import { onMounted, ref } from "vue";
import { getPermissions, getPositions, getRoles } from "@/services/dataService";
import formatGender from "@/utils/formater/formatGender";
import { useRouter } from "vue-router";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import PasswordDialog from "@/views/users/PasswordDialog.vue";
import UsernameDialog from "@/views/users/UsernameDialog.vue";
import PermissionDialog from "@/views/users/PermissionDialog.vue";
import LinkUserDialog from "@/views/users/LinkUserDialog.vue";
import { useDisplay } from "vuetify";
const { mdAndUp } = useDisplay();
const { t, locale } = useI18n();
definePage({
  meta: {
    title: "Users",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-users",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const formData = ref({});
const router = useRouter();
const isSnackbarTopVisible = ref(false);
const isDialogVisible = ref(false);
const isLoading = ref(true);
const dataTableRef = ref(null);
const roles = ref([]);
const positions = ref([]);
const isPasswordDialog = ref(false);
const isUsernameDialog = ref(false);
const isLinkUserDialog = ref(false);
const isPermissionDialog = ref(false);
const userIdSelected = ref(null);

const permissions = ref([]);
const userPermissions = ref([]);

const filter = ref({
  search: null,
});

const headers = [
  { title: t("User"), key: "code", visible: true, fixed: mdAndUp.value },
  { title: t("Username"), key: "username", visible: true },
  // { title: t("Email"), key: "email", visible: true },
  {
    title: t("Gender"),
    key: "gender",
    value: (items) => formatGender(items.gender),
    visible: true,
  },
  {
    title: t("Branch"),
    key: locale.value === "en" ? "branch.name_en" : "branch.name_kh" || null,
    visible: true,
  },

  {
    title: t("Position"),
    key: "position.name_kh",
    visible: true,
  },
  {
    title: t("Role"),
    key: "role.display_name",
    visible: true,
  },
  {
    title: t("Join Date"),
    key: "join_date",
    value: (items) => formatDate(items.join_date),
    visible: true,
  },
  {
    title: t("Under User"),
    key: "under_user.name_kh",
    visible: true,
  },
  { title: t("Counts"), key: "loans_count", align: "center", visible: true },
  { title: t("Status"), key: "is_active", align: "center", visible: true },
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

    const res = await api.post("users-delete", { id: item.id });

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

const onEdit = async (item) => {
  router.push({ name: "admin-users-edit", query: { id: item.id } });
};

const onDisable = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("users-disable", { id: item.id });

    if (res.data.status) {
      dataTableRef.value.reload();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  isSnackbarTopVisible.value = true;
};

onMounted(async () => {
  const [dataRoles, dataPositions, dataPermissions] = await Promise.all([
    getRoles(),
    getPositions(),
    getPermissions(),
  ]);

  roles.value = dataRoles;
  positions.value = dataPositions;
  permissions.value = dataPermissions;
});

const onPassword = (item) => {
  userIdSelected.value = item.id;
  isPasswordDialog.value = true;
};

const onUsername = (item) => {
  userIdSelected.value = item.id;
  isUsernameDialog.value = true;
};

const onLinkUser = (item) => {
  userIdSelected.value = item.id;
  isLinkUserDialog.value = true;
};

const onPermission = async (item) => {
  const res = await api.post("users-show", { id: item.id });

  if (res.data.status) {
    userPermissions.value = res.data.data.user_permission;
    userIdSelected.value = item.id;
    isPermissionDialog.value = true;
  }
};

const onUpdatePermission = async (data, callback) => {
  // console.log(data);

  try {
    isLoading.value = true;

    const res = await api.post("users-permission", data);

    if (res.data.status) {
      dataTableRef.value.reload();
      isPermissionDialog.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <VSnackbar v-model="isSnackbarTopVisible" location="top">
    <VIcon>tabler-copy</VIcon> Copied to clipboard!
  </VSnackbar>

  <PasswordDialog
    v-if="isPasswordDialog"
    v-model:is-dialog-visible="isPasswordDialog"
    :item-data="{ user_id: userIdSelected }"
    @onReload="dataTableRef.reload()"
  />
  <UsernameDialog
    v-if="isUsernameDialog"
    v-model:is-dialog-visible="isUsernameDialog"
    :item-data="{ user_id: userIdSelected }"
    @onReload="dataTableRef.reload()"
  />
  <LinkUserDialog
    v-if="isLinkUserDialog"
    v-model:is-dialog-visible="isLinkUserDialog"
    :item-data="{ user_id: userIdSelected }"
    @onReload="dataTableRef.reload()"
  />

  <PermissionDialog
    v-if="isPermissionDialog"
    v-model:is-dialog-visible="isPermissionDialog"
    :item-data="{ user_id: userIdSelected }"
    :user-permissions="userPermissions"
    :permissions="permissions"
    @on-update="onUpdatePermission"
  />

  <AppCardTable
    ref="dataTableRef"
    title="List Users"
    title-icon="tabler-users"
    saveHeaderName="header-list-users"
    saveStateName="save-state-list-users"
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
    is-password
    is-username
    is-permission
    is-link-user
    is-excel
    save-state
    :is-back="false"
    @on-delete="onDelete"
    @on-edit="onEdit"
    @on-disable="onDisable"
    @on-password="onPassword"
    @on-username="onUsername"
    @on-link-user="onLinkUser"
    @on-permission="onPermission"
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

    <template v-slot:item.code="{ item }">
      <div class="d-flex flex-row pt-2 pb-2">
        <AppName
          :title="item.name_kh"
          :sub-title="item.code"
          :image="item.image_path"
        />
      </div>
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
