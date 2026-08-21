<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import { requiredValidator } from "@/@core/utils/validators";
import AppCard from "@/components/AppCard.vue";
import AppLabel from "@/components/AppLabel.vue";
import AddEditFamiliesDialog from "@/views/global/families/AddEditFamiliesDialog.vue";
import successAlert from "@/helper/successAlert.js";
import { api } from "@/utils/api";
import { app } from "@/utils/app";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { getCurriculums } from "@/services/dataService";

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

const bmiStatusLabels = {
  underweight: "Underweight",
  normal: "Normal",
  overweight: "Overweight",
  obese: "Obese",
};

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
  dob: null,
  cur_id: [],
});

const formData = ref(initialFormData());
const isLoading = ref(false);
const familyDialogVisible = ref(false);
const familyDialogLoading = ref(false);
const familyDialogData = ref({});
const familyOptions = ref([]);
const familySearchLoading = ref(false);

const familyLabel = (f) =>
  f?.name_en ||
  f?.name_kh ||
  f?.family_name ||
  (f?.id != null ? `Family #${f.id}` : "");

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
      familyOptions.value = (Array.isArray(rows) ? rows : []).map(
        mapFamilyOption,
      );
    }
  } catch (error) {
    console.error("Failed to search families:", error);
  } finally {
    familySearchLoading.value = false;
  }
};

const selectedFamily = computed(() => {
  const id =
    formData.value.family_id != null ? Number(formData.value.family_id) : null;
  return familyOptions.value.find((f) => f.id === id) || null;
});

const selectedFamilyGuardians = computed(
  () => selectedFamily.value?.guardians || [],
);

const guardianTypeLabel = (type) => {
  const map = {
    father: "Father",
    mother: "Mother",
    grandparent: "Grandparent",
    sibling: "Sibling",
    legal_guardian: "Legal Guardian",
    other: "Other",
  };
  return map[type] || type || "Guardian";
};

const openCreateFamilyDialog = () => {
  familyDialogData.value = {};
  familyDialogVisible.value = true;
};

const onFamilyDialogCreate = async (data, callback) => {
  try {
    familyDialogLoading.value = true;
    const res = await api.post("families-store", data);
    if (!res.data.status) {
      console.error("Failed to create family:", res.data);
      callback(false);
      return;
    }

    const created = mapFamilyOption(res.data.data.data);
    await searchFamilies(created.name_en || created.family_name || "");
    if (!familyOptions.value.some((f) => f.id === created.id)) {
      familyOptions.value = [created, ...familyOptions.value];
    }
    formData.value.family_id = created.id;
    familyDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to create family:", error);
    callback(false);
  } finally {
    familyDialogLoading.value = false;
  }
};

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
  return bmiStatusLabels[bmiStatus.value] ?? bmiStatus.value;
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

    // Student save only links an existing family — never creates one here.
    const payload = {
      ...formData.value,
      family_id: formData.value.family_id,
      f_name: null,
      f_contact: null,
      m_name: null,
      m_contact: null,
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
  <div>
    <AddEditFamiliesDialog
      v-model:isDialogVisible="familyDialogVisible"
      :item-data="familyDialogData"
      :loading="familyDialogLoading"
      @on-create="onFamilyDialogCreate"
    />

    <AppCard
      title="Create Student"
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

        <AppLabel title="Personal Information" />

        <VCol cols="12">
          <VRow class="mt-2">
            <VCol cols="12" md="4" sm="6">
              <AppTextField
                v-model="formData.name_kh"
                label="Name Khmer"
                :rules="[requiredValidator]"
                autocomplete="off"
              />
            </VCol>
            <VCol cols="12" md="4" sm="6">
              <AppTextField
                v-model="formData.name_en"
                label="Name English"
                autocomplete="off"
              />
            </VCol>
            <VCol cols="6" md="2" sm="6">
              <AppSelect
                v-model="formData.gender"
                :items="genderOptions"
                item-title="name"
                item-value="value"
                label="Gender"
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
                label="Nation"
                autocomplete="off"
              />
            </VCol>

            <VCol cols="12" md="4" sm="6">
              <AppDateTimePicker
                v-model="formData.dob"
                label="Date of Birth"
                :config="{ allowInput: true }"
                autocomplete="off"
              />
            </VCol>
            <VCol cols="12" md="4" sm="6">
              <AppTextField
                v-model="formData.email"
                label="Email"
                type="email"
                autocomplete="off"
              />
            </VCol>

            <VCol cols="12" md="4" sm="6">
              <AppTextField
                v-model="formData.old_school"
                label="Old School"
                autocomplete="off"
              />
            </VCol>
          </VRow>
        </VCol>

        <AppLabel title="Physical Information" />

        <VCol cols="6" lg="3" md="4" sm="6">
          <AppTextField
            v-model="formData.height"
            label="Height (cm)"
            numbers-only
            autocomplete="off"
          />
        </VCol>
        <VCol cols="6" lg="3" md="4" sm="6">
          <AppTextField
            v-model="formData.weight"
            label="Weight (kg)"
            numbers-only
            autocomplete="off"
          />
        </VCol>
        <VCol cols="6" lg="3" md="4" sm="6">
          <AppTextField
            :model-value="bodyMassIndex != null ? String(bodyMassIndex) : ''"
            label="Body Mass Index"
            readonly
            autocomplete="off"
          />
        </VCol>
        <VCol cols="6" lg="3" md="4" sm="6">
          <AppTextField
            :model-value="bmiStatusLabel"
            label="BMI Status"
            readonly
            autocomplete="off"
          />
        </VCol>

        <AppLabel title="School Information" />

        <VCol cols="12" lg="5" md="5" sm="5">
          <AppAutocomplete
            v-model="formData.cur_id"
            label="Curriculums"
            :items="curriculums"
            item-value="id"
            item-title="name_en"
            autocomplete="off"
            multiple
            eager
            closable-chips
            chips
          />
        </VCol>
        <AppLabel title="Address" />

        <VCol cols="6" lg="3" md="4" sm="6">
          <AppAutocomplete
            v-model="formData.province_code"
            label="Province"
            :items="provinces"
            item-value="code"
            item-title="name_kh"
            autocomplete="off"
          />
        </VCol>
        <VCol cols="6" lg="3" md="4" sm="6">
          <AppAutocomplete
            v-model="formData.district_code"
            label="District"
            :items="districts"
            item-value="code"
            item-title="name_kh"
            autocomplete="off"
          />
        </VCol>
        <VCol cols="6" lg="3" md="4" sm="6">
          <AppAutocomplete
            v-model="formData.commune_code"
            label="Commune"
            :items="communes"
            item-value="code"
            item-title="name_kh"
            autocomplete="off"
          />
        </VCol>
        <VCol cols="6" lg="3" md="4" sm="6">
          <AppAutocomplete
            v-model="formData.village_code"
            label="Village"
            :items="villages"
            item-value="code"
            item-title="name_kh"
            autocomplete="off"
          />
        </VCol>

        <AppLabel title="Family Information" />

        <VCol cols="12" md="8" lg="6">
          <AppAutocomplete
            v-model="formData.family_id"
            label="Family"
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
        <VCol cols="12" md="4" lg="3" class="d-flex align-center">
          <VBtn
            variant="tonal"
            prepend-icon="tabler-plus"
            @click="openCreateFamilyDialog"
          >
            New Family
          </VBtn>
        </VCol>

        <VCol v-if="formData.family_id" cols="12">
          <div class="text-body-2 text-medium-emphasis mb-2">
            Guardians (read only)
          </div>
          <div
            v-if="selectedFamilyGuardians.length"
            class="d-flex flex-wrap ga-2"
          >
            <VChip
              v-for="g in selectedFamilyGuardians"
              :key="g.id || `${g.type}-${g.name_en}`"
              size="small"
              variant="tonal"
            >
              {{ guardianTypeLabel(g.type) }}:
              {{ g.name_en || g.name_kh || g.user_name || g.name || "-" }}
              <template v-if="g.phone"> · {{ g.phone }}</template>
            </VChip>
          </div>
          <div v-else class="text-caption text-medium-emphasis">
            No guardians on this family yet. Use New Family or Admin → Families.
          </div>
        </VCol>
      </VRow>
    </AppCard>
  </div>
</template>
