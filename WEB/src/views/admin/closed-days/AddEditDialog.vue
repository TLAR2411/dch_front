<script setup>
import { ref, watch, nextTick } from "vue";
import { debounce } from "lodash";
import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
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

const publics = [
  {
    name: "Public",
    value: true,
  },
  {
    name: "Non public",
    value: false,
  },
];

const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const itemData = ref({
  date: null,
  is_public_holiday: null,
  description: "",
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      date: newData?.date ?? null,
      is_public_holiday: newData?.is_public_holiday ?? null,
      description: newData?.description ?? "",
      id: newData?.id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    date: "",
    is_public_holiday: "",
    description: "",
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
    :title="itemData.id == null ? 'Create Closed Day' : 'Update Closed Day'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6" md="6">
        <AppDateTimePicker
          v-model="itemData.date"
          label="Date"
          placeholder="2025-01-01"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppAutocomplete
          v-model="itemData.is_public_holiday"
          label="Public Holiday"
          placeholder="Public Holiday"
          :items="publics"
          item-value="value"
          item-title="name"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="12">
        <AppTextField
          v-model="itemData.description"
          label="Description"
          placeholder="Description"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" md="12">
        <VBtn prepend-icon="tabler-download" class="w-100" @click="">
          Import
        </VBtn>
      </VCol>
    </VRow>
  </AppAddEditDialog>
</template>
