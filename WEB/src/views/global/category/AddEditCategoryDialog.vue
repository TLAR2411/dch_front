<script setup>
import { ref, watch, nextTick } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";

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
  name_en: null,
  name_kh: null,
  symbol: null,
  description: null,
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      name_en: newData?.name_en ?? null,
      name_kh: newData?.name_kh ?? null,
      symbol: newData?.symbol ?? null,
      description: newData?.description ?? null,
      id: newData?.id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    name_en: "",
    name_kh: "",
    symbol: "",
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
    v-if="!xs"
    :title="itemData.id == null ? t('Create Category') : t('Update Category')"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name English')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Khmer')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.symbol"
          :label="t('Symbol')"
          :rules="[requiredValidator]"
        />
      </VCol>

      <VCol cols="12" sm="6" md="12">
        <AppTextarea
          v-model="itemData.description"
          :label="t('Description')"
          rows="2"
        >
        </AppTextarea>
      </VCol>
    </VRow>
  </AppAddEditDialog>

  <AppAddEditDrawer
    v-else
    :title="itemData.id == null ? t('Create Category') : t('Update Category')"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name English')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Khmer')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.symbol"
          :label="t('Symbol')"
          :rules="[requiredValidator]"
        />
      </VCol>

      <VCol cols="12" sm="6" md="12">
        <AppTextarea
          v-model="itemData.description"
          :label="t('Description')"
          rows="2"
        >
        </AppTextarea>
      </VCol>
    </VRow>
  </AppAddEditDrawer>
</template>
