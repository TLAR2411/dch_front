<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import { requiredValidator } from "@/@core/utils/validators";
import AppCard from "@/components/AppCard.vue";
import AppLabel from "@/components/AppLabel.vue";
import successAlert from "@/helper/successAlert.js";
import { api } from "@/utils/api";
import { app } from "@/utils/app";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { getCurriculums } from "@/services/dataService";
import { useI18n } from "vue-i18n";
import { useEntityLabel } from "@/composable/useEntityLabel.js";

const { t } = useI18n();
const { selectItemTitle } = useEntityLabel();
const curriculums = ref([]);
const router = useRouter();

const genderOptions = [
  { name: "ប្រុស", value: "male" },
  { name: "ស្រី", value: "female" },
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
  nation: "khmer",
  height: null,
  weight: null,
  body_mass_index: null,
  bmi_status: null,
  province_code: null,
  district_code: null,
  commune_code: null,
  village_code: null,
  old_school: "",
  f_name: "",
  m_name: "",
  f_contact: "",
  m_contact: "",
  family_id: null,
  family_mode: "existing",
  family_name_en: "",
  family_name_kh: "",
  dob: null,
  cur_id: [],
});

const formData = ref(initialFormData());
const isLoading = ref(false);
const familyOptions = ref([]);
const familySearchLoading = ref(false);

const familyModeOptions = computed(() => [
  { name: t("Select Existing Family"), value: "existing" },
  { name: t("Create New Family"), value: "new" },
]);

const familyLabel = (f) =>
  f?.name_en || f?.name_kh || f?.family_name || (f?.id != null ? `Family #${f.id}` : "");

const mapFamilyOption = (f) => ({
  ...f,
  id: Number(f.id),
  label: familyLabel(f),
});

const searchFamilies = async (search = "") => {
  try {
    familySearchLoading.value = true;
    const res = await api.post("families-all", { search: search || null });
    if (res.data.status) {
      const rows = res.data.data?.data || [];
      familyOptions.value = (Array.isArray(rows) ? rows : []).map(mapFamilyOption);
    }
  } catch (error) {
    console.error("Failed to search families:", error);
  } finally {
    familySearchLoading.value = false;
  }
};

const applyFamilyGuardians = (family) => {
  const guardians = family?.guardians || [];
  const father = guardians.find((g) => g.type === "father");
  const mother = guardians.find((g) => g.type === "mother");
  formData.value.f_name = father?.name_en || "";
  formData.value.f_contact = father?.phone || "";
  formData.value.m_name = mother?.name_en || "";
  formData.value.m_contact = mother?.phone || "";
};

watch(
  () => formData.value.family_id,
  (familyId) => {
    if (!familyId) return;
    const id = familyId != null ? Number(familyId) : null;
    const family = familyOptions.value.find((f) => f.id === id);
    if (family) applyFamilyGuardians(family);
  },
);

watch(
  () => formData.value.family_mode,
  (mode) => {
    if (mode === "new") {
      formData.value.family_id = null;
    } else {
      formData.value.family_name_en = "";
      formData.value.family_name_kh = "";
    }
  },
);

const provinces = ref([]);
const districts = ref([]);
const communes = ref([]);
const villages = ref([]);

const loadAddressData = () => {
  const data = app();
  provinces.value = [...(data?.provinces ?? [])];
};

const bodyMassIndex = computed(() => {
  const heightCm = parseFloat(formData.value.height);
  const weightKg = parseFloat(formData.value.weight);

  if (!heightCm || !weightKg || heightCm <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 100) / 100;
});

const bmiStatus = computed(() => {
  const bmi = bodyMassIndex.value;
  if (bmi == null) {
    return null;
  }
  if (bmi < 13.8) {
    return "underweight";
  }
  if (bmi < 17) {
    return "normal";
  }
  if (bmi < 18) {
    return "overweight";
  }
  return "obese";
});

const bmiStatusLabel = computed(() => {
  if (!bmiStatus.value) {
    return "";
  }
  return bmiStatusLabels.value[bmiStatus.value] ?? bmiStatus.value;
});

watch(bodyMassIndex, (value) => {
  formData.value.body_mass_index = value;
});

watch(bmiStatus, (value) => {
  formData.value.bmi_status = value;
});

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

        // Compare as numbers when possible, fallback to string compare
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

const postStudent = (payload) =>
  api.post("students-store", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

const onSubmit = async (validate) => {
  console.log(formData.value);
  const { valid } = await validate;
  if (!valid) {
    return;
  }

  try {
    isLoading.value = true;

    // Create a new family first when requested, then link via family_id.
    let familyId = formData.value.family_id;
    if (formData.value.family_mode === "new") {
      const familyName =
        formData.value.family_name_en ||
        formData.value.family_name_kh ||
        `${formData.value.name_en || formData.value.name_kh} Family`;

      const guardians = [];
      if (formData.value.f_name) {
        guardians.push({
          type: "father",
          name_en: formData.value.f_name,
          phone: formData.value.f_contact || null,
        });
      }
      if (formData.value.m_name) {
        guardians.push({
          type: "mother",
          name_en: formData.value.m_name,
          phone: formData.value.m_contact || null,
        });
      }

      const familyRes = await api.post("families-store", {
        name_en: formData.value.family_name_en || familyName,
        name_kh: formData.value.family_name_kh || null,
        guardians,
      });

      if (!familyRes.data.status) {
        successAlert.fire({
          icon: "error",
          title: familyRes.data.message || "Failed to create family",
        });
        return;
      }
      familyId = familyRes.data.data.data.id;
    }

    const payload = {
      ...formData.value,
      family_id: familyId || null,
    };

    let res;
    try {
      res = await postStudent(payload);
    } catch (error) {
      const status = error.response?.status;
      const candidates = error.response?.data?.data?.candidates;

      // Same parents / family often soft-matches siblings — not the same student.
      // Retry once with confirmed=true; no dialog.
      if (status === 409 && Array.isArray(candidates) && candidates.length) {
        res = await postStudent({ ...payload, confirmed: true });
      } else {
        throw error;
      }
    }

    if (res?.data?.status) {
      resetForm();
      router.push({ name: "admin-students" });
    } else if (res?.data?.message) {
      successAlert.fire({ icon: "error", title: res.data.message });
    }
  } catch (error) {
    console.error("Failed to create student:", error);
    successAlert.fire({
      icon: "error",
      title: error.response?.data?.message || "Failed to create student",
    });
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  loadAddressData();
  curriculums.value = await getCurriculums();
  await searchFamilies();
});
</script>

<template>
  <AppCard
    :title="t('Create Student')"
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
                <span class="d-none d-sm-block">បញ្ចូលរូបភាព</span>
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
              អនុញ្ញាតបញ្ចូលបានតែ JPG, GIF ឬ PNG នឹងទំហំអតិបរិមា 800K
            </p>
          </form>
        </div>
      </VCol>

      <AppLabel :title="t('Personal Information')" />

      <VCol cols="12">
        <VRow class="mt-2">
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
            <AppDateTimePicker
              v-model="formData.dob"
              :label="t('Date of Birth')"
              :config="{ allowInput: true }"
              autocomplete="off"
            />
          </VCol>
          <VCol cols="12" md="4" sm="6">
            <AppTextField
              v-model="formData.email"
              :label="t('Email')"
              type="email"
              autocomplete="off"
            />
          </VCol>

          <VCol cols="12" md="4" sm="6">
            <AppTextField
              v-model="formData.old_school"
              :label="t('Old School')"
              autocomplete="off"
            />
          </VCol>
        </VRow>
      </VCol>

      <AppLabel :title="t('Physical Information')" />

      <VCol cols="6" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.height"
          :label="t('Height (cm)')"
          numbers-only
          autocomplete="off"
        />
      </VCol>
      <VCol cols="6" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.weight"
          :label="t('Weight (kg)')"
          numbers-only
          autocomplete="off"
        />
      </VCol>
      <VCol cols="6" lg="3" md="4" sm="6">
        <AppTextField
          :model-value="bodyMassIndex != null ? String(bodyMassIndex) : ''"
          :label="t('Body Mass Index')"
          readonly
          autocomplete="off"
        />
      </VCol>
      <VCol cols="6" lg="3" md="4" sm="6">
        <AppTextField
          :model-value="bmiStatusLabel"
          :label="t('BMI Status')"
          readonly
          autocomplete="off"
        />
      </VCol>

      <AppLabel :title="t('School Information')" />

      <VCol cols="12" lg="5" md="5" sm="5">
        <AppAutocomplete
          v-model="formData.cur_id"
          :label="t('Curriculums')"
          :items="curriculums"
          item-value="id"
          :item-title="selectItemTitle"
          autocomplete="off"
          multiple
          eager
          closable-chips
          chips
        />
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

      <AppLabel :title="t('Family Information')" />

      <VCol cols="12" lg="3" md="4" sm="6">
        <AppSelect
          v-model="formData.family_mode"
          :label="t('Family Mode')"
          :items="familyModeOptions"
          item-title="name"
          item-value="value"
        />
      </VCol>

      <VCol
        v-if="formData.family_mode === 'existing'"
        cols="12"
        lg="6"
        md="8"
        sm="12"
      >
        <AppAutocomplete
          v-model="formData.family_id"
          :label="t('Select Existing Family')"
          :items="familyOptions"
          item-value="id"
          item-title="label"
          server-side
          :loading="familySearchLoading"
          clearable
          autocomplete="off"
          @search="searchFamilies"
        />
      </VCol>

      <template v-if="formData.family_mode === 'new'">
        <VCol cols="12" lg="3" md="4" sm="6">
          <AppTextField
            v-model="formData.family_name_en"
            :label="t('Name English')"
            autocomplete="off"
          />
        </VCol>
        <VCol cols="12" lg="3" md="4" sm="6">
          <AppTextField
            v-model="formData.family_name_kh"
            :label="t('Name Khmer')"
            autocomplete="off"
          />
        </VCol>
      </template>

      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.f_name"
          :label="t('Father Name')"
          :readonly="formData.family_mode === 'existing' && !!formData.family_id"
          autocomplete="off"
        />
      </VCol>

      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.f_contact"
          :label="t('Father Contact')"
          :readonly="formData.family_mode === 'existing' && !!formData.family_id"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.m_name"
          :label="t('Mother Name')"
          :readonly="formData.family_mode === 'existing' && !!formData.family_id"
          autocomplete="off"
        />
      </VCol>

      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.m_contact"
          :label="t('Mother Contact')"
          :readonly="formData.family_mode === 'existing' && !!formData.family_id"
          autocomplete="off"
        />
      </VCol>
    </VRow>
  </AppCard>
</template>
