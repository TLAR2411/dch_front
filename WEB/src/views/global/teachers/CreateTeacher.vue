<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import { requiredValidator } from "@/@core/utils/validators";
import AppCard from "@/components/AppCard.vue";
import AppLabel from "@/components/AppLabel.vue";
import { api } from "@/utils/api";
import { app } from "@/utils/app";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { getBranches, getRoles } from "@/services/dataService";
import { useEntityLabel } from "@/composable/useEntityLabel.js";

const router = useRouter();
const { t } = useI18n();
const { selectItemTitle } = useEntityLabel();

const roles = ref([]);

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

const bmiStatusLabels = computed(() => ({
  underweight: t("Underweight"),
  normal: t("Normal"),
  overweight: t("Overweight"),
  obese: t("Obese"),
}));

const MAX_PHOTO_SIZE = 800 * 1024; // 800KB

const initialFormData = () => ({
  id: null,
  name_kh: "",
  name_en: "",
  gender: "male",
  photo_path: null,
  new_photo_path: null,
  email: "@diu.edu.kh",
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

const provinces = ref([]);
const districts = ref([]);
const communes = ref([]);
const villages = ref([]);

const loadAddressData = () => {
  const data = app();
  provinces.value = [...(data?.provinces ?? [])];
};

watch(
  () => formData.value.province_code,
  (newVal) => {
    if (newVal) {
      const data = app();
      if (!data) return;

      formData.value.district_code = null;
      formData.value.commune_code = null;
      formData.value.village_code = null;

      districts.value = (data.districts ?? []).filter(
        (v) => v.province_code === parseInt(newVal),
      );
      communes.value = [];
      villages.value = [];
    } else {
      const data = app();
      if (!data) return;

      formData.value.district_code = null;
      formData.value.commune_code = null;
      formData.value.village_code = null;

      districts.value = (data.districts ?? []).filter(
        (v) => v.province_code === parseInt(formData.value.province_code),
      );
      communes.value = [];
      villages.value = [];
    }
  },
);

watch(
  () => formData.value.district_code,
  (newVal) => {
    if (newVal) {
      const data = app();
      if (!data) return;

      formData.value.commune_code = null;
      formData.value.village_code = null;

      communes.value = (data.communes ?? []).filter(
        (v) => v.district_code === parseInt(newVal),
      );
      villages.value = [];
    }
  },
);

watch(
  () => formData.value.commune_code,
  (newVal) => {
    if (newVal) {
      const data = app();
      if (!data) return;

      formData.value.village_code = null;

      const communeCode = Number.parseInt(String(newVal), 10);
      villages.value = (data.villages ?? []).filter((v) => {
        const raw =
          v?.commune_code ??
          v?.commune_id ??
          v?.communeCode ??
          v?.communeId ??
          null;

        const n = raw == null ? NaN : Number.parseInt(String(raw), 10);
        if (!Number.isNaN(communeCode) && !Number.isNaN(n))
          return n === communeCode;
        return String(raw ?? "") === String(newVal);
      });
    }
  },
);

watch(
  () => formData.value.village_code,
  (newVal) => {
    if (newVal && formData.value.province_code == null) {
      const data = app();
      if (!data) return;

      const village = (data.villages ?? []).find(
        (v) => v.code === parseInt(newVal),
      );
      if (!village) {
        return;
      }

      const commune = (data.communes ?? []).find(
        (v) => v.code === parseInt(village.commune_code),
      );
      const district = commune
        ? (data.districts ?? []).find(
            (v) => v.code === parseInt(commune.district_code),
          )
        : null;

      formData.value.commune_code = village.commune_code;
      formData.value.district_code = commune?.district_code ?? null;
      formData.value.province_code = district?.province_code ?? null;
    }
  },
);

const refInputEl = ref("");

const handleFileUpload = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  //   if (file.size > MAX_PHOTO_SIZE) {
  //     console.warn("Max photo size is 800KB");
  //     e.target.value = "";
  //     return;
  //   }

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
      return formData.value.photo_path
        ? "http://127.0.0.1:8000/storage/" + formData.value.photo_path
        : "";
    }
  } else {
    return isBlobOrFile(formData.value.photo_path)
      ? URL.createObjectURL(formData.value.photo_path)
      : "";
  }
};

const resetForm = () => {
  formData.value = initialFormData();
  districts.value = [];
  communes.value = [];
  villages.value = [];
};

const onSubmit = async (validate) => {
  console.log(formData.value);
  const { valid } = await validate;
  if (!valid) {
    return;
  }

  try {
    isLoading.value = true;

    const res = await api.post("teachers-store", formData.value, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (res.data.status) {
      resetForm();
      router.push({ name: "global-teachers" });
    }
  } catch (error) {
    console.error("Failed to create student:", error);
  } finally {
    isLoading.value = false;
  }
};

const branches = ref([]);

onMounted(async () => {
  loadAddressData();
  branches.value = await getBranches();

  roles.value = await getRoles();

  console.log("roles", roles.value);
});
</script>

<template>
  <AppCard
    :title="t('Create Teacher')"
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
      <VCol cols="6" lg="3" md="4" sm="6">
        <AppAutocomplete
          v-model="formData.province_code"
          :label="t('Province')"
          :items="provinces"
          item-value="code"
          item-title="name_kh"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="6" lg="3" md="4" sm="6">
        <AppAutocomplete
          v-model="formData.district_code"
          :label="t('District')"
          :items="districts"
          item-value="code"
          item-title="name_kh"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="6" lg="3" md="4" sm="6">
        <AppAutocomplete
          v-model="formData.commune_code"
          :label="t('Commune')"
          :items="communes"
          item-value="code"
          item-title="name_kh"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="6" lg="3" md="4" sm="6">
        <AppAutocomplete
          v-model="formData.village_code"
          :label="t('Village')"
          :items="villages"
          item-value="code"
          item-title="name_kh"
          autocomplete="off"
        />
      </VCol>

      <AppLabel :title="t('Description')" />
      <VCol cols="12">
        <AppTextarea
          rows="2"
          v-model="formData.description"
          autocomplete="off"
        />
      </VCol>
    </VRow>
  </AppCard>
</template>
