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
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import Address from "@/components/Address.vue";
import { getCurriculums } from "@/services/dataService";

const router = useRouter();

const route = useRoute();

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
  email: "",
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
  dob: null,
  cur_id: [],
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
  districts.value = [];
  communes.value = [];
  villages.value = [];
};

const initData = async () => {
  try {
    const res = await api.post("students-show", { id: route.params.id });
    if (res.data.status) {
      formData.value = res.data.data;

      console.log(
        "village_code",
        typeof res.data.data.village_code,
        res.data.data.village_code,
      );

      const data = res.data.data;

      formData.value.village_code =
        data.village_code != null ? Number(data.village_code) : null;

      formData.value.commune_code =
        data.commune_code != null ? Number(data.commune_code) : null;

      formData.value.district_code =
        data.district_code != null ? Number(data.district_code) : null;

      formData.value.province_code =
        data.province_code != null ? Number(data.province_code) : null;
      console.log("formData", formData.value);
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
};

const onSubmit = async (validate) => {
  console.log(formData.value);
  const { valid } = await validate;
  if (!valid) {
    return;
  }

  try {
    isLoading.value = true;

    const res = await api.post("students-update", formData.value, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (res.data.status) {
      resetForm();
      router.push({ name: "admin-students" });
    }
  } catch (error) {
    console.error("Failed to create student:", error);
  } finally {
    isLoading.value = false;
  }
};

const curriculums = ref([]);

onMounted(async () => {
  initData();
  loadAddressData();
  curriculums.value = await getCurriculums();
});
</script>

<template>
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
      <VCol cols="12" md="12">
        <Address
          :loading="fieldLoading"
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

      <!-- <VCol cols="6" lg="3" md="4" sm="6">
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
      </VCol> -->

      <AppLabel title="Family Information" />

      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.f_name"
          label="Father Name"
          autocomplete="off"
        />
      </VCol>

      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.f_contact"
          label="Father Contact"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.m_name"
          label="Mother Name"
          autocomplete="off"
        />
      </VCol>

      <VCol cols="12" lg="3" md="4" sm="6">
        <AppTextField
          v-model="formData.m_contact"
          label="Mother Contact"
          autocomplete="off"
        />
      </VCol>
    </VRow>
  </AppCard>
</template>
