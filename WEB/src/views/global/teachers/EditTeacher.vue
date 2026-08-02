<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import { requiredValidator } from "@/@core/utils/validators";
import AppCard from "@/components/AppCard.vue";
import AppLabel from "@/components/AppLabel.vue";
import Address from "@/components/Address.vue";
import { api } from "@/utils/api";
import { getBranches, getRoles } from "@/services/dataService";
import { useEntityLabel } from "@/composable/useEntityLabel.js";
import { onMounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { selectItemTitle } = useEntityLabel();

const genderOptions = [
  { name: "ប្រុស", value: "male" },
  { name: "ស្រី", value: "female" },
];

const manageBranch = [
  { name: "មួយសាខា", value: 1 },
  { name: "ច្រើនសាខា", value: 2 },
];

const nationOptions = [
  {
    name: "ខ្មែរ",
    value: "khmer",
  },
  {
    name: "ជនជាតិ",
    value: "other",
  },
];

const initialFormData = () => ({
  id: null,
  name_kh: "",
  name_en: "",
  gender: "male",
  photo_path: null,
  new_photo_path: null,
  email: "",
  phone: "",
  description: "",
  nation: "khmer",
  province_code: null,
  district_code: null,
  commune_code: null,
  village_code: null,
  manage_branch: 1,
  branch_id: [],
  role_id: null,
});

const formData = ref(initialFormData());
const isLoading = ref(false);
const roles = ref([]);
const branches = ref([]);
const refInputEl = ref("");

const teachersListRoute = () => {
  if (route.name?.startsWith("admin-")) return "admin-teachers";
  if (route.name?.startsWith("khmer-")) return "khmer-teachers";
  if (route.name?.startsWith("chinese-")) return "chinese-teachers";
  return "global-teachers";
};

const handleFileUpload = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (formData.value.id) {
    formData.value.new_photo_path = file;
  } else {
    formData.value.photo_path = file;
  }
};

const getPhoto = () => {
  const isBlobOrFile = (value) =>
    value instanceof Blob || value instanceof File;
  if (formData.value.id) {
    if (formData.value.new_photo_path && formData.value.new_photo_path !== "") {
      return isBlobOrFile(formData.value.new_photo_path)
        ? URL.createObjectURL(formData.value.new_photo_path)
        : "";
    } else {
      return formData.value.photo_path ? formData.value.photo_path : "";
    }
  } else {
    return isBlobOrFile(formData.value.photo_path)
      ? URL.createObjectURL(formData.value.photo_path)
      : "";
  }
};

const resetForm = () => {
  formData.value = initialFormData();
};

const initData = async () => {
  try {
    const res = await api.post("teachers-show", { id: route.params.id });
    if (res.data.status) {
      const data = res.data.data;

      formData.value = {
        ...initialFormData(),
        ...data,
        village_code:
          data.village_code != null ? Number(data.village_code) : null,
        commune_code:
          data.commune_code != null ? Number(data.commune_code) : null,
        district_code:
          data.district_code != null ? Number(data.district_code) : null,
        province_code:
          data.province_code != null ? Number(data.province_code) : null,
        branch_id: Array.isArray(data.branch_id)
          ? data.branch_id.map(Number)
          : [],
        manage_branch: data.manage_branch != null ? Number(data.manage_branch) : 1,
        role_id: data.role_id != null ? Number(data.role_id) : null,
        new_photo_path: null,
      };
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
};

const onSubmit = async (validate) => {
  const { valid } = await validate;
  if (!valid) {
    return;
  }

  try {
    isLoading.value = true;

    const res = await api.post("teachers-update", formData.value, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (res.data.status) {
      resetForm();
      router.push({ name: teachersListRoute() });
    }
  } catch (error) {
    console.error("Failed to update teacher:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  branches.value = await getBranches();
  roles.value = await getRoles();
  await initData();
});
</script>

<template>
  <AppCard
    :title="t('Edit Teacher')"
    title-icon="tabler-user-plus"
    is-submit
    :loading="isLoading"
    @on-submit="onSubmit"
  >
    <VRow>
      <VCol cols="12">
        <div class="d-flex mt-3">
          <VAvatar
            rounded="lg"
            size="100"
            class="me-6 rounded-lg border-sm"
            :image="getPhoto()"
          />

          <!-- 👉 Upload Photo -->
          <form class="d-flex flex-column justify-center customFontSiemreap">
            <div class="d-flex flex-wrap">
              <VBtn
                @click="refInputEl?.click()"
                variant="tonal"
                color="orange mr-2"
              >
                <VIcon icon="tabler-upload" class="d-sm-none" />
                <span class="d-none d-sm-block">{{ t("Upload photo") }}</span>
              </VBtn>

              <input
                ref="refInputEl"
                type="file"
                name="file"
                accept=".jpeg,.png,.jpg,.gif,.pdf"
                hidden
                @input="handleFileUpload"
              />
            </div>

            <p class="text-body-2 mt-2 mb-0 customFontSiemreap">
              {{ t("Photo upload hint") }}
            </p>
          </form>
        </div>
      </VCol>

      <AppLabel :title="t('Personal Information')" />

      <VCol cols="12">
        <VRow>
          <VCol cols="12" md="4" sm="6">
            <AppTextField
              v-model="formData.name_kh"
              :label="t('Name Khmer')"
              :rules="[requiredValidator]"
              autocomplete="off"
            />
          </VCol>
          <VCol cols="12" md="4" sm="6">
            <AppTextField
              v-model="formData.name_en"
              :label="t('Name English')"
              autocomplete="off"
            />
          </VCol>
          <VCol cols="6" md="2" sm="6">
            <AppSelect
              v-model="formData.gender"
              :items="genderOptions"
              item-title="name"
              item-value="value"
              :label="t('Gender')"
              :rules="[requiredValidator]"
              autocomplete="off"
            />
          </VCol>

          <VCol cols="6" md="2" sm="6">
            <AppSelect
              v-model="formData.nation"
              :items="nationOptions"
              item-title="name"
              item-value="value"
              :label="t('Nation')"
              autocomplete="off"
            />
          </VCol>

          <VCol cols="12" md="4" sm="6">
            <AppTextField
              v-model="formData.email"
              :label="t('email')"
              type="email"
              autocomplete="off"
            />
          </VCol>

          <VCol cols="12" md="4" sm="6">
            <AppTextField
              v-model="formData.phone"
              :label="t('phone')"
              autocomplete="off"
            />
          </VCol>

          <VCol cols="12" md="4" sm="6">
            <AppAutocomplete
              v-model="formData.role_id"
              :label="t('Roles')"
              :items="roles"
              item-title="display_name"
              item-value="id"
              autocomplete="off"
            />
          </VCol>

          <VCol cols="12" md="4" sm="6">
            <AppAutocomplete
              v-model="formData.manage_branch"
              :label="t('Manage Branch')"
              :items="manageBranch"
              item-title="name"
              item-value="value"
              autocomplete="off"
            />
          </VCol>

          <VCol cols="12" md="8" sm="12">
            <AppAutocomplete
              v-model="formData.branch_id"
              :label="t('Choose Branches')"
              :items="branches"
              :disabled="
                formData.manage_branch != 2 && formData.manage_branch != 4
              "
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
      </VCol>

      <AppLabel :title="t('Address')" />
      <VCol cols="12" md="12">
        <Address
          :province_code="formData.province_code"
          @update:province_code="formData.province_code = $event"
          :district_code="formData.district_code"
          @update:district_code="formData.district_code = $event"
          :commune_code="formData.commune_code"
          @update:commune_code="formData.commune_code = $event"
          :village_code="formData.village_code"
          @update:village_code="formData.village_code = $event"
        />
      </VCol>
    </VRow>
  </AppCard>
</template>
