<script setup>
import { ref, watch, nextTick } from "vue";
import { debounce } from "lodash";
import { app } from "@/utils/app.js";
import { requiredValidator } from "@/@core/utils/validators";

const props = defineProps({
  itemData: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    required: false,
    skipCheck: true,
    default: undefined,
  },
});

const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const itemData = ref({ ...props.itemData });

const villages = ref([]);
const communes = ref([]);
const districts = ref([]);
const provinces = ref([...app().provinces]);

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = { ...newData };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    name_kh: "",
    name_en: "",
    commune_code: "",
    code: "",
  };
};

const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (valid) {
    const itemId = itemData.value.id || null;
    if (itemId) {
      emit("onUpdate", itemData.value, (res) => {
        if (res) {
          resetData();
        }
      });
    } else {
      emit("onCreate", itemData.value, (res) => {
        if (res) {
          resetData();
        }
      });
    }
  }
}, 500);

const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisible", false);
};

const dialogModelValueUpdate = (newVal) => {
  emit("update:isDialogVisible", newVal);
  isDialogVisible.value = newVal;
};

watch(
  () => itemData.value.province_code,
  (newVal, oldValue) => {
    if (newVal) {
      if (oldValue) {
        itemData.value.district_code = null;
        itemData.value.commune_code = null;
        itemData.value.code = null;
      }

      districts.value = app().districts.filter(
        (v) => v.province_code === parseInt(newVal),
      );
    }
  },
);

watch(
  () => itemData.value.district_code,
  (newVal, oldValue) => {
    if (newVal) {
      if (oldValue) {
        itemData.value.commune_code = null;
        itemData.value.code = null;
      }

      communes.value = app().communes.filter(
        (v) => v.district_code === parseInt(newVal),
      );
    }
  },
);

watch(
  () => itemData.value.commune_code,
  (newVal, oldValue) => {
    if (newVal) {
      if (oldValue) {
        itemData.value.code = null;
      }

      villages.value = app().villages.filter(
        (v) => v.commune_code === parseInt(newVal),
      );
    }
  },
);

watch(
  () => itemData.value.code,
  (newVal, oldValue) => {
    if (newVal) {
      if (itemData.value.province_code == null) {
        const communeCode = app().villages.find(
          (v) => v.code === parseInt(newVal),
        ).commune_code;
        const districtCode = app().communes.find(
          (v) => v.code === parseInt(communeCode),
        ).district_code;
        const provinceCode = app().districts.find(
          (v) => v.code === parseInt(districtCode),
        ).province_code;

        itemData.value.province_code = provinceCode;
        itemData.value.district_code = districtCode;
        itemData.value.commune_code = communeCode;
        itemData.value.code = newVal;
      }
    }
  },
);
</script>

<template>
  <AppAddEditDialog
    :title="itemData.id == null ? 'Create Village' : 'Update Village'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6">
        <AppAutocomplete
          v-model="itemData.province_code"
          label="Province"
          :items="provinces"
          item-value="code"
          item-title="name_kh"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppAutocomplete
          v-model="itemData.district_code"
          label="District"
          :items="districts"
          item-value="code"
          item-title="name_kh"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="12">
        <AppAutocomplete
          v-model="itemData.commune_code"
          label="Commune"
          :items="communes"
          item-value="code"
          item-title="name_kh"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.name_kh"
          label="Name Khmer"
          placeholder="អន្លង់វិល"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.name_en"
          label="Name English"
          placeholder="Anlong Vil"
          :rules="[requiredValidator]"
        />
      </VCol>
    </VRow>
  </AppAddEditDialog>
</template>
