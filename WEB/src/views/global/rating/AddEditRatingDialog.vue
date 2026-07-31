<script setup>
import { computed, ref, watch } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { usePartStore } from "@/stores/partStore";

const { xs } = useDisplay();
const { t } = useI18n();
const partStore = usePartStore();

const showNameKh = computed(() => true);
const showNameEn = computed(
  () => partStore.system_part === "english" || Number(partStore.cur_id) === 1,
);
const showNameCn = computed(
  () => partStore.system_part === "chinese" || Number(partStore.cur_id) === 3,
);

const nameColSize = computed(() => {
  const count =
    Number(showNameKh.value) +
    Number(showNameEn.value) +
    Number(showNameCn.value);
  if (count <= 1) return 12;
  if (count === 2) return 6;
  return 4;
});

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

const emptyForm = () => ({
  name_en: null,
  name_kh: null,
  name_cn: null,
  description: null,
  id: null,
});

const itemData = ref({
  ...emptyForm(),
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      name_en: newData?.name_en ?? null,
      name_kh: newData?.name_kh ?? null,
      name_cn: newData?.name_cn ?? null,
      description: newData?.description ?? null,
      id: newData?.id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = emptyForm();
};

const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (valid) {
    const itemId = itemData.value.id || null;
    if (itemId) {
      emit("onUpdate", itemData.value, (res) => {
        if (res) resetData();
      });
    } else {
      emit("onCreate", itemData.value, (res) => {
        if (res) resetData();
      });
    }
  }
}, 500);

const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisible", false);
};
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    :title="itemData.id == null ? t('Create Rating') : t('Update Rating')"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol v-if="showNameEn" cols="12" :sm="nameColSize" :md="nameColSize">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name English')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol v-if="showNameKh" cols="12" :sm="nameColSize" :md="nameColSize">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Khmer')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol v-if="showNameCn" cols="12" :sm="nameColSize" :md="nameColSize">
        <AppTextField
          v-model="itemData.name_cn"
          :label="t('Name Chinese')"
          :rules="[requiredValidator]"
        />
      </VCol>

      <VCol cols="12">
        <AppTextarea
          v-model="itemData.description"
          :label="t('Description')"
          rows="2"
        />
      </VCol>
    </VRow>
  </AppAddEditDialog>

  <AppAddEditDrawer
    v-else
    :title="itemData.id == null ? t('Create Rating') : t('Update Rating')"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol v-if="showNameEn" cols="12" :sm="nameColSize" :md="nameColSize">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name English')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol v-if="showNameKh" cols="12" :sm="nameColSize" :md="nameColSize">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Khmer')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol v-if="showNameCn" cols="12" :sm="nameColSize" :md="nameColSize">
        <AppTextField
          v-model="itemData.name_cn"
          :label="t('Name Chinese')"
          :rules="[requiredValidator]"
        />
      </VCol>

      <VCol cols="12">
        <AppTextarea
          v-model="itemData.description"
          :label="t('Description')"
          rows="2"
        />
      </VCol>
    </VRow>
  </AppAddEditDrawer>
</template>
