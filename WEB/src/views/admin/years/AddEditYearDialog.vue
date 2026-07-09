<script setup>
import { requiredValidator } from "@/@core/utils/validators";
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";
import { debounce } from "lodash";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";

const { xs } = useDisplay();
const { t } = useI18n();
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

const itemData = ref({
  year_name: null,
  start_date: null,
  end_date: null,
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      year_name: newData?.year_name ?? null,
      start_date: newData?.start_date ?? null,
      end_date: newData?.end_date ?? null,
      id: newData?.id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    year_name: "",
    start_date: null,
    end_date: null,
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
    v-if="!xs"
    :title="itemData.id == null ? 'Create Size' : 'Update Size'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="12" md="12">
        <AppTextField
          v-model="itemData.year_name"
          :label="t('Name')"
          :rules="[requiredValidator]"
        />
      </VCol>

      <VCol cols="12" sm="6" md="6">
        <AppDateTimePicker
          v-model="itemData.start_date"
          label="Start Date"
          autocomplete="off"
          :config="{
            allowInput: true,
          }"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppDateTimePicker
          v-model="itemData.end_date"
          :label="t('End Date')"
          :placeholder="t('End Date')"
          autocomplete="off"
          :config="{
            allowInput: true,
          }"
        />
      </VCol>
    </VRow>
  </AppAddEditDialog>

  <AppAddEditDrawer
    v-else
    :title="itemData.id == null ? 'Create Year' : 'Update Year'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="12" md="12">
        <AppTextField
          v-model="itemData.year_name"
          :label="t('Name')"
          :rules="[requiredValidator]"
        />
      </VCol>

      <VCol cols="12" sm="6" md="6">
        <AppDateTimePicker
          v-model="itemData.start_date"
          label="Start Date"
          autocomplete="off"
          :config="{
            allowInput: true,
          }"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppDateTimePicker
          v-model="itemData.end_date"
          :label="t('End Date')"
          :placeholder="t('End Date')"
          autocomplete="off"
          :config="{
            allowInput: true,
          }"
        />
      </VCol>
    </VRow>
  </AppAddEditDrawer>
</template>
