<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import { emailValidator, requiredValidator } from "@/@core/utils/validators";
import AppCard from "@/components/AppCard.vue";
import AppLabel from "@/components/AppLabel.vue";
import { useEntityLabel } from "@/composable/useEntityLabel.js";
import { getBranches, getRoles } from "@/services/dataService";
import { api } from "@/utils/api";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

definePage({
  meta: {
    title: "Users",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "add-users",
    navActiveLink: "admin-users",
  },
});

const router = useRouter();
const { t } = useI18n();
const { selectItemTitle } = useEntityLabel();

const gender = [
  { name: "ប្រុស", value: "male" },
  { name: "ស្រី", value: "female" },
];

const manageBranch = [
  { name: "មួយសាខា", value: 1 },
  { name: "ច្រើនសាខា", value: 2 },
  { name: "គ្រប់សាខា", value: 3 },
  { name: "លើកលែងសាខា", value: 4 },
];

const initialFormData = () => ({
  name_kh: "",
  name_en: "",
  gender: "male",
  dob: null,
  contact: "",
  email: "",
  user_name: "",
  branch_id: null,
  role_id: null,
  manage_branch: 1,
  _branch_id: [],
});

const formData = ref(initialFormData());
const isLoading = ref(false);
const branches = ref([]);
const roles = ref([]);

const onSubmit = async () => {
  try {
    isLoading.value = true;
    const res = await api.post("users-store", formData.value);
    if (res.data.status) {
      router.push({ name: "admin-users" });
    }
  } catch (error) {
    console.error("Failed to create user:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  const [dataBranches, dataRoles] = await Promise.all([
    getBranches(),
    getRoles(),
  ]);
  branches.value = dataBranches;
  roles.value = dataRoles;
});
</script>

<template>
  <AppCard
    :title="t('Create User')"
    title-icon="tabler-user-circle"
    is-submit
    :loading="isLoading"
    @on-submit="onSubmit"
  >
    <VRow>
      <AppLabel :title="t('Personal Information')" />
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.name_kh"
          :label="t('Name Khmer')"
          :rules="[requiredValidator]"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.name_en"
          :label="t('Name English')"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppSelect
          v-model="formData.gender"
          :items="gender"
          item-title="name"
          item-value="value"
          :label="t('Gender')"
          :rules="[requiredValidator]"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppDateTimePicker
          v-model="formData.dob"
          :label="t('Date of birth')"
          :config="{ allowInput: true }"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.contact"
          :label="t('Contact')"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.email"
          :label="t('Email')"
          :rules="[requiredValidator, emailValidator]"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.user_name"
          :label="t('Username')"
          autocomplete="off"
        />
      </VCol>

      <AppLabel :title="t('Job Information')" />
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppAutocomplete
          v-model="formData.branch_id"
          :label="t('Branch')"
          :items="branches"
          :item-title="selectItemTitle"
          item-value="id"
          :rules="[requiredValidator]"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppAutocomplete
          v-model="formData.role_id"
          :label="t('Roles')"
          :items="roles"
          item-title="display_name"
          item-value="id"
          :rules="[requiredValidator]"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppAutocomplete
          v-model="formData.manage_branch"
          :label="t('Manage Branch')"
          :items="manageBranch"
          item-title="name"
          item-value="value"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppAutocomplete
          v-model="formData._branch_id"
          :label="t('Choose Branches')"
          :items="branches"
          :disabled="formData.manage_branch != 2 && formData.manage_branch != 4"
          :item-title="selectItemTitle"
          item-value="id"
          multiple
          eager
          closable-chips
          chips
          autocomplete="off"
        />
      </VCol>
    </VRow>
  </AppCard>
</template>
