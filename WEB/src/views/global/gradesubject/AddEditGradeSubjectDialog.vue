<script setup>
import { computed, ref, watch } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import { useI18n } from "vue-i18n";
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import AppAddEditDialog from "@/components/AppAddEditDialog.vue";
import { useEntityLabel } from "@/composable/useEntityLabel.js";

const { t } = useI18n();
const { selectItemTitle } = useEntityLabel();

const props = defineProps({
  itemData: {
    type: Object,
    default: () => ({}),
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  subjects: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["onCreate", "update:isDialogVisible"]);

const itemData = ref({
  grade_id: null,
  grade_name: null,
  subject_ids: [],
  assigned_subject_ids: [],
});

const availableSubjects = computed(() => {
  const assigned = new Set(itemData.value.assigned_subject_ids ?? []);

  return (props.subjects ?? []).filter(
    (subject) =>
      !subject.parent_id &&
      subject.is_active !== false &&
      !assigned.has(subject.id),
  );
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      grade_id: newData?.grade_id ?? null,
      grade_name: newData?.grade_name ?? null,
      subject_ids: [],
      assigned_subject_ids: newData?.assigned_subject_ids ?? [],
    };
  },
  { deep: true, immediate: true },
);

const resetData = () => {
  itemData.value = {
    grade_id: null,
    grade_name: null,
    subject_ids: [],
    assigned_subject_ids: [],
  };
};

const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (!valid) return;

  emit(
    "onCreate",
    {
      grade_id: itemData.value.grade_id,
      subject_ids: [...(itemData.value.subject_ids ?? [])],
    },
    (success) => {
      if (success) resetData();
    },
  );
}, 500);

const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisible", false);
};
</script>

<template>
  <AppAddEditDialog
    max-width="560"
    :title="t('Assign Subjects to Grade')"
    :is-dialog-visible="isDialogVisible"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12">
        <AppTextField
          :model-value="itemData.grade_name"
          :label="t('Grade')"
          readonly
          disabled
        />
      </VCol>
      <VCol cols="12">
        <AppAutocomplete
          v-model="itemData.subject_ids"
          :items="availableSubjects"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Subjects')"
          :rules="[requiredValidator]"
          autocomplete="off"
          persistent-hint
          multiple
          eager
          closable-chips
          chips
          :hint="
            availableSubjects.length
              ? t('Select one or more subjects to assign')
              : t('All subjects are already assigned to this grade')
          "
        />
      </VCol>
    </VRow>
  </AppAddEditDialog>
</template>
