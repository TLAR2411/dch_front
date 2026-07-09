<script setup>
import { ref, watch, nextTick } from "vue";
import { debounce } from "lodash";
import AppAutocomplete from "@core/components/app-form-elements/AppAutocomplete.vue";
import AppAddEditDialog from "@/components/AppAddEditDialog.vue";
import { app } from "@/utils/app.js";
import { requiredValidator } from "@/@core/utils/validators";

const accountTyps = computed(() => {
  return app().accountTypes;
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

const itemData = ref({ ...props.itemData });

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = { ...newData };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    name_kh: null,
    name_en: null,
    code: null,
    account_type_id: null,
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
    :title="
      itemData.id == null ? 'Create Chart Accounts' : 'Update Chart Accounts'
    "
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.name_kh"
          label="Name Khmer"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.name_en"
          label="Name English"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppAutocomplete
          v-model="itemData.account_type_id"
          :items="accountTyps"
          :item-title="
            (item) => {
              return `${item.id} - ${item.name_kh}`;
            }
          "
          item-value="id"
          label="Account Type"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="6">
        <AppTextField
          v-model="itemData.code"
          label="Code"
          :rules="[requiredValidator]"
        />
      </VCol>
    </VRow>
  </AppAddEditDialog>
</template>
