<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import { usePartStore } from "@/stores/partStore";
import { getYears } from "@/services/dataService";
import { useDisplay } from "vuetify";

const { xs } = useDisplay();

const curId = ref(usePartStore().cur_id);

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
  data: {
    type: Array,
    required: false,
    default: () => [],
  },
});

const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const itemData = ref({
  name_kh: "",
  name_en: null,
  name_cn: null,
  symbol: null,
  description: null,
  start_date: null,
  end_date: null,
  year_id: null,
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      name_kh: newData?.name_kh ?? "",
      name_en: newData?.name_en ?? null,
      name_cn: newData?.name_cn ?? null,
      description: newData?.description ?? null,
      symbol: newData?.symbol ?? null,
      id: newData?.id ?? null,
      start_date: newData?.start_date ?? null,
      end_date: newData?.end_date ?? null,
      year_id: newData?.year_id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    name_kh: "",
    name_en: null,
    name_cn: null,
    symbol: null,
    description: null,
    year_id: null,
    id: null,
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

const years = ref([]);

onMounted(async () => {
  years.value = await getYears();
});
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    max-width="700"
    :title="itemData.id == null ? 'Create Term' : 'Update Term'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="3" md="3">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Kh')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="3" md="3">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name En')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="3" md="3">
        <AppTextField v-model="itemData.name_cn" :label="t('Name Cn')" />
      </VCol>
      <VCol cols="12" sm="3" md="3">
        <AppTextField v-model="itemData.symbol" :label="t('Symbol')" />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.start_date"
          :label="t('Start Date')"
          :placeholder="t('Start Date')"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
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

      <VCol cols="4" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.year_id"
          :items="years"
          item-title="year_name"
          item-value="id"
          :label="t('Year')"
          autocomplete="off"
          persistent-hint
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
    :title="itemData.id == null ? 'Create Term' : 'Update Term'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="3" md="3">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Kh')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="3" md="3">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name En')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="3" md="3">
        <AppTextField v-model="itemData.name_cn" :label="t('Name Cn')" />
      </VCol>
      <VCol cols="6" sm="3" md="3">
        <AppTextField v-model="itemData.symbol" :label="t('Symbol')" />
      </VCol>

      <VCol cols="6" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.year_id"
          :items="years"
          item-title="year_name"
          item-value="id"
          :label="t('Year')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.start_date"
          :label="t('Start Date')"
          :placeholder="t('Start Date')"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
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
