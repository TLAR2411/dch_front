<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import { usePartStore } from "@/stores/partStore";
import { getSubjects } from "@/services/dataService";
import { useDisplay } from "vuetify";
import AppAddEditDialog from "@/components/AppAddEditDialog.vue";
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";

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
  code: null,
  description: null,
  parent_id: null,
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
      code: newData?.code ?? null,
      parent_id: newData?.parent_id ?? null,
      id: newData?.id ?? null,
    };
  },
  { deep: true },
);

watch(
  () => props.data,
  (newData) => {
    if (Array.isArray(newData)) {
      subjects.value = newData;
    }
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    name_kh: "",
    name_en: null,
    name_cn: null,
    code: null,
    description: null,
    parent_id: null,
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

const subjects = ref([]);

onMounted(async () => {
  console.log("curid", curId.value);
});
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    max-width="700"
    :title="itemData.id == null ? 'Create Subjects' : 'Update Subjects'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Kh')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name En')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_cn"
          :label="t('Name Cn')"
          :disabled="Number(curId) !== 3"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppTextField v-model="itemData.code" :label="t('Symbol')" />
      </VCol>
      <VCol cols="4" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.parent_id"
          :items="subjects"
          item-title="name_en"
          item-value="id"
          :label="t('Main Subject')"
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
    :title="itemData.id == null ? 'Create Subjects' : 'Update Subjects'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_kh"
          :label="t('Name Kh')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_en"
          :label="t('Name En')"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppTextField
          v-model="itemData.name_cn"
          :label="t('Name Cn')"
          :disabled="Number(curId) !== 3"
        />
      </VCol>
      <VCol cols="6" sm="4" md="4">
        <AppTextField v-model="itemData.code" :label="t('Symbol')" />
      </VCol>
      <VCol cols="6" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.parent_id"
          :items="subjects"
          item-title="name_en"
          item-value="id"
          :label="t('Main Subject')"
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
  </AppAddEditDrawer>
</template>
