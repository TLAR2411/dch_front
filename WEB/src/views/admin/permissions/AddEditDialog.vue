<script setup>
import { ref, watch, toRefs } from "vue";
import { debounce } from "lodash";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import AppTextField from "@core/components/app-form-elements/AppTextField.vue";
import AppCombobox from "@/@core/components/app-form-elements/AppCombobox.vue";
import AppAddEditDialog from "@/components/AppAddEditDialog.vue";
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";
import { requiredValidator } from "@/@core/utils/validators";

const { xs } = useDisplay();
const { t } = useI18n();

const props = defineProps({
  itemData: {
    type: Object,
    default: () => ({}),
  },
  groups: {
    type: Array,
    default: () => [],
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

const { itemData, isDialogVisible } = toRefs(props);

const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const emptyForm = () => ({
  name: "",
  group: "",
  display_name: "",
  description: "",
  gates_endpoint: false,
});

const formData = ref({
  ...emptyForm(),
  ...itemData.value,
});

watch(
  itemData,
  (newData) => {
    formData.value = {
      ...emptyForm(),
      ...newData,
      gates_endpoint: Boolean(newData?.gates_endpoint),
    };
  },
  { deep: true }
);

const resetData = () => {
  formData.value = emptyForm();
};

const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (!valid) return;

  const payload = {
    ...formData.value,
    name: String(formData.value.name || "").trim(),
    group: String(formData.value.group || "").trim(),
    display_name: String(formData.value.display_name || "").trim(),
    description: formData.value.description
      ? String(formData.value.description).trim()
      : null,
    gates_endpoint: Boolean(formData.value.gates_endpoint),
  };

  const event = payload.id ? "onUpdate" : "onCreate";
  emit(event, payload, (res) => {
    if (res) resetData();
  });
}, 500);

const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisible", false);
};
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    :title="formData.id == null ? t('Create Permission') : t('Update Permission')"
    :is-dialog-visible="isDialogVisible"
    :is-update="formData.id != null"
    :loading="loading"
    max-width="700px"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="formData.name"
          label="Name"
          placeholder="view-page"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="formData.display_name"
          label="Display Name"
          placeholder="view-page"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppCombobox
          v-model="formData.group"
          label="Group"
          :items="groups"
          :rules="[requiredValidator]"
          clearable
          autocomplete="off"
          :placeholder="t('Select or type a new group')"
        />
        <div class="text-caption text-medium-emphasis mt-1">
          {{ t("Pick an existing group, or type a new group name") }}.
          Use name <code>view-page</code> (nav/route) or <code>view-data</code> (API reads) under that group.
        </div>
      </VCol>
      <VCol cols="12" sm="6" class="d-flex align-center">
        <VCheckbox
          v-model="formData.gates_endpoint"
          :label="t('Gates Endpoint')"
          hide-details
        />
      </VCol>
      <VCol cols="12">
        <AppTextField
          v-model="formData.description"
          label="Description"
          placeholder="Optional description"
        />
      </VCol>
    </VRow>
  </AppAddEditDialog>

  <AppAddEditDrawer
    v-else
    :title="formData.id == null ? t('Create Permission') : t('Update Permission')"
    :is-dialog-visible="isDialogVisible"
    :is-update="formData.id != null"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12">
        <AppTextField
          v-model="formData.name"
          label="Name"
          placeholder="view-page"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12">
        <AppTextField
          v-model="formData.display_name"
          label="Display Name"
          placeholder="view-page"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12">
        <AppCombobox
          v-model="formData.group"
          label="Group"
          :items="groups"
          :rules="[requiredValidator]"
          clearable
          autocomplete="off"
          :placeholder="t('Select or type a new group')"
        />
        <div class="text-caption text-medium-emphasis mt-1">
          {{ t("Pick an existing group, or type a new group name") }}.
          Use name <code>view-page</code> (nav/route) or <code>view-data</code> (API reads) under that group.
        </div>
      </VCol>
      <VCol cols="12">
        <VCheckbox
          v-model="formData.gates_endpoint"
          :label="t('Gates Endpoint')"
          hide-details
        />
      </VCol>
      <VCol cols="12">
        <AppTextField
          v-model="formData.description"
          label="Description"
          placeholder="Optional description"
        />
      </VCol>
    </VRow>
  </AppAddEditDrawer>
</template>
