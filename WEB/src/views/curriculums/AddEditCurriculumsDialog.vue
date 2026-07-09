<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import { getYears } from "@/services/dataService";
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";
import { useDisplay } from "vuetify";

const { xs } = useDisplay();
// import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";

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
  name_kh: "",
  name_en: "",
  symbol: "",
  description: "",
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      name_kh: newData?.name_kh ?? "",
      name_en: newData?.name_en ?? "",
      symbol: newData?.symbol ?? "",
      description: newData?.description ?? "",
      id: newData?.id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    name_kh: "",
    name_en: "",
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

onMounted(async () => {});
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    max-width="600"
    :title="itemData.id == null ? 'Create Curriculumn' : 'Update Curriculumn'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="5" md="5">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Khmer')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="5" md="5">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name English')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="2" md="2">
        <AppTextField
          v-model="itemData.symbol"
          :label="t('Symbol')"
          persistent-hint
          :rules="[requiredValidator]"
        />
      </VCol>

      <VCol cols="12" sm="12" md="12">
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
    max-width="600"
    :title="itemData.id == null ? 'Create Curriculumn' : 'Update Curriculumn'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="5" md="5">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Khmer')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="5" md="5">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name English')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="2" md="2">
        <AppTextField
          v-model="itemData.symbol"
          :label="t('Symbol')"
          persistent-hint
          :rules="[requiredValidator]"
        />
      </VCol>

      <VCol cols="12" sm="12" md="12">
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
