<script setup>
import { ref, watch, nextTick } from "vue";
import { debounce } from "lodash";
import AppAutocomplete from "@core/components/app-form-elements/AppAutocomplete.vue";
import { app } from "@/utils/app.js";

const props = defineProps({
  itemData: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  departments: {
    type: Array,
    required: false,
    default: () => [],
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    required: false,
  },
});

const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const itemData = ref({ ...props.itemData });
const departments = ref([]);

watch(
  () => props.departments,
  (newData) => {
    departments.value = [...newData];
  },
  { deep: true },
);

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
    symbol: "",
    level: "",
    department_id: "",
    insurance_amount: 0,
    position_fee: 0,
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
</script>

<template>
  <AppAddEditDialog
    :title="itemData.id == null ? 'Create Position' : 'Update Position'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    max-width="1000"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.name_kh"
          label="Name Khmer"
          placeholder="មន្រ្តីផ្នែកលក់"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.name_en"
          label="Name English"
          placeholder="Sell office"
        />
      </VCol>
      <VCol cols="12" sm="6" md="4">
        <AppTextField
          v-model="itemData.symbol"
          label="Symbol"
          persistent-hint
          placeholder="SO"
        />
      </VCol>
      <VCol cols="12" sm="6" md="4">
        <AppTextField
          v-model="itemData.level"
          label="Level"
          placeholder="1000"
        />
      </VCol>

      <VCol cols="12" sm="12" md="4">
        <AppAutocomplete
          v-model="itemData.department_id"
          label="Department"
          :items="departments"
          item-value="id"
          item-title="name_kh"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.insurance_amount"
          label="Insurance Amount"
          format-currency
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.position_fee"
          label="Position Fee"
          format-currency
        />
      </VCol>
    </VRow>
  </AppAddEditDialog>
</template>
