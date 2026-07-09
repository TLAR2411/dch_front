<script setup>
import { ref, watch, nextTick } from "vue";
import { debounce } from "lodash";
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

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = { ...newData };
  },
  { deep: true }
);

const resetData = () => {
  itemData.value = {
    name_kh: "",
    name_en: "",
    symbol: "",
    currency_code: "",
    exchange_rate: "",
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
    :title="itemData.id == null ? 'Create Currency' : 'Update Currency'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.currency_code"
          label="Code"
          persistent-hint
          placeholder="KHR"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.name_kh"
          label="Name Khmer"
          placeholder="រៀល"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.name_en"
          label="Name English"
          placeholder="Riel"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.symbol"
          label="Symbol"
          persistent-hint
          placeholder="៛"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="12">
        <AppTextField
          v-model="itemData.exchange_rate"
          label="Exchange Rate"
          persistent-hint
          placeholder="4032"
          format-currency
          :rules="[requiredValidator]"
        />
      </VCol>
    </VRow>
  </AppAddEditDialog>
</template>
