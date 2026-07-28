<script setup>
import { computed, ref, watch } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import { useI18n } from "vue-i18n";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import AppAddEditDialog from "@/components/AppAddEditDialog.vue";

const { t } = useI18n();

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
});

const emit = defineEmits(["onCreate", "update:isDialogVisible"]);

const meta = ref({
  grading_rule_id: null,
  subject_id: null,
  category_name: null,
  category_max_score: null,
  category_percentage: null,
  existing_used_score: 0,
  existing_count: 0,
});

const quantity = ref(null);
const defaultMaxScore = ref(null);
const assessmentRows = ref([]);
let lastAppliedDefault = null;
let isApplyingDefault = false;

const isSameScore = (a, b) => {
  if (a === null || a === "" || b === null || b === "") return false;
  return Number(a) === Number(b);
};

const shouldApplyDefaultToRow = (row) => {
  if (row.usesDefault === false) return false;
  if (row.usesDefault === true) return true;

  return (
    row.max_score === null ||
    row.max_score === "" ||
    isSameScore(row.max_score, lastAppliedDefault)
  );
};

const applyDefaultMaxScoreToRows = (value) => {
  if (value === null || value === "" || !assessmentRows.value.length) {
    lastAppliedDefault = null;
    return;
  }

  isApplyingDefault = true;
  assessmentRows.value = assessmentRows.value.map((row) => {
    const shouldApply = shouldApplyDefaultToRow(row);

    return {
      ...row,
      max_score: shouldApply ? value : row.max_score,
      usesDefault: shouldApply ? true : row.usesDefault,
    };
  });

  lastAppliedDefault = value;
  isApplyingDefault = false;
};

const markRowMaxScoreManual = (index) => {
  if (isApplyingDefault) return;

  const row = assessmentRows.value[index];
  if (!row) return;

  row.usesDefault = false;
};

const categoryPrefix = computed(() => {
  const name = meta.value.category_name?.trim();
  if (!name) return "";
  return name.charAt(0).toUpperCase();
});

const remainingScore = computed(() => {
  const maxScore = Number(meta.value.category_max_score);
  if (!Number.isFinite(maxScore)) return null;
  return Math.max(maxScore - Number(meta.value.existing_used_score || 0), 0);
});

const newRowsTotalScore = computed(() =>
  assessmentRows.value.reduce(
    (sum, row) => sum + (Number(row.max_score) || 0),
    0,
  ),
);

const totalAfterCreate = computed(() => {
  const existing = Number(meta.value.existing_used_score || 0);
  return existing + newRowsTotalScore.value;
});

const isOverCategoryLimit = computed(() => {
  const maxScore = Number(meta.value.category_max_score);
  if (!Number.isFinite(maxScore)) return false;
  return totalAfterCreate.value > maxScore;
});

const createRowMaxScoreValidator = (index) => (value) => {
  const required = requiredValidator(value);
  if (required !== true) return required;

  const score = Number(value);
  if (!Number.isFinite(score) || score < 0) {
    return t("Enter a valid score");
  }

  const maxScore = Number(meta.value.category_max_score);
  if (!Number.isFinite(maxScore)) return true;

  const rowsTotal = assessmentRows.value.reduce((sum, row, rowIndex) => {
    const rowScore =
      rowIndex === index ? score : Number(row.max_score) || 0;
    return sum + rowScore;
  }, 0);

  const grandTotal = Number(meta.value.existing_used_score || 0) + rowsTotal;
  if (grandTotal > maxScore) {
    const left = Math.max(
      maxScore - Number(meta.value.existing_used_score || 0),
      0,
    );
    return `Total cannot exceed ${maxScore} pts (${left} remaining)`;
  }

  return true;
};

const buildRow = (index) => {
  const sequenceNo = meta.value.existing_count + index;
  const prefix = categoryPrefix.value;
  return {
    item_name: prefix ? `${prefix}${sequenceNo}` : `${sequenceNo}`,
    max_score: defaultMaxScore.value ?? null,
    sequence_no: sequenceNo,
    usesDefault: true,
  };
};

const syncRowsToQuantity = (count) => {
  const parsed = Number(count);

  if (!count && count !== 0) {
    quantity.value = null;
    assessmentRows.value = [];
    return;
  }

  if (!Number.isFinite(parsed) || parsed < 1) {
    quantity.value = count;
    assessmentRows.value = [];
    return;
  }

  const safeCount = Math.floor(parsed);
  quantity.value = safeCount;

  const nextRows = [];
  for (let i = 1; i <= safeCount; i += 1) {
    const existing = assessmentRows.value[i - 1];
    nextRows.push(
      existing
        ? {
            ...existing,
            sequence_no: meta.value.existing_count + i,
          }
        : buildRow(i),
    );
  }

  assessmentRows.value = nextRows;
  applyDefaultMaxScoreToRows(defaultMaxScore.value);
};

const addRow = () => {
  const nextIndex = assessmentRows.value.length + 1;
  assessmentRows.value.push(buildRow(nextIndex));
  quantity.value = assessmentRows.value.length;
};

const removeRow = (index) => {
  assessmentRows.value.splice(index, 1);
  assessmentRows.value = assessmentRows.value.map((row, rowIndex) => {
    const sequenceNo = meta.value.existing_count + rowIndex + 1;
    const prefix = categoryPrefix.value;
    return {
      ...row,
      sequence_no: sequenceNo,
      item_name: prefix ? `${prefix}${sequenceNo}` : `${sequenceNo}`,
    };
  });
  quantity.value = assessmentRows.value.length || null;
};

watch(defaultMaxScore, (value) => {
  applyDefaultMaxScoreToRows(value);
});

watch(
  () => props.itemData,
  (newData) => {
    meta.value = {
      grading_rule_id: newData?.grading_rule_id ?? null,
      subject_id: newData?.subject_id ?? null,
      category_name: newData?.category_name ?? null,
      category_max_score: newData?.category_max_score ?? null,
      category_percentage: newData?.category_percentage ?? null,
      existing_used_score: newData?.existing_used_score ?? 0,
      existing_count: newData?.existing_count ?? 0,
    };
    defaultMaxScore.value = newData?.default_max_score ?? null;
    quantity.value = null;
    assessmentRows.value = [];
    lastAppliedDefault = null;
  },
  { deep: true, immediate: true },
);

const resetData = () => {
  meta.value = {
    grading_rule_id: null,
    subject_id: null,
    category_name: null,
    category_max_score: null,
    category_percentage: null,
    existing_used_score: 0,
    existing_count: 0,
  };
  quantity.value = null;
  defaultMaxScore.value = null;
  assessmentRows.value = [];
  lastAppliedDefault = null;
};

const onFormSubmit = debounce(async (refForm) => {
  if (!assessmentRows.value.length) return;

  if (isOverCategoryLimit.value) return;

  const { valid } = await refForm;
  if (!valid) return;

  emit(
    "onCreate",
    {
      grading_rule_id: meta.value.grading_rule_id,
      subject_id: meta.value.subject_id,
      assessments: assessmentRows.value.map((row, index) => ({
        item_name: row.item_name,
        max_score: row.max_score,
        sequence_no: row.sequence_no ?? meta.value.existing_count + index + 1,
      })),
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
    max-width="640"
    :title="t('Create Assessment')"
    :is-dialog-visible="isDialogVisible"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="4">
        <AppTextField
          :model-value="meta.category_name"
          :label="t('Category')"
          readonly
          disabled
        />
      </VCol>
      <VCol cols="12" sm="4">
        <AppTextField
          :model-value="meta.category_max_score"
          :label="t('Category Max Score')"
          readonly
          disabled
          suffix="pts"
        />
      </VCol>
      <VCol cols="12" sm="4">
        <AppTextField
          :model-value="meta.category_percentage"
          :label="t('Category Percentage')"
          readonly
          disabled
          suffix="%"
        />
      </VCol>
    </VRow>

    <VRow v-if="meta.category_max_score != null">
      <VCol cols="12" sm="4">
        <AppTextField
          :model-value="meta.existing_used_score"
          :label="t('Already Used')"
          readonly
          disabled
          suffix="pts"
        />
      </VCol>
      <VCol cols="12" sm="4">
        <AppTextField
          :model-value="remainingScore"
          :label="t('Remaining')"
          readonly
          disabled
          suffix="pts"
        />
      </VCol>
      <VCol cols="12" sm="4">
        <AppTextField
          :model-value="newRowsTotalScore"
          :label="t('New Total')"
          readonly
          disabled
          suffix="pts"
          :error="isOverCategoryLimit"
          :error-messages="
            isOverCategoryLimit
              ? t('New assessments exceed the category max score')
              : undefined
          "
        />
      </VCol>
    </VRow>

    <VRow>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="quantity"
          type="number"
          min="1"
          :label="t('Quantity')"
          :rules="[requiredValidator]"
          @update:model-value="syncRowsToQuantity"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="defaultMaxScore"
          type="number"
          :label="t('Default Max Score')"
        />
      </VCol>
    </VRow>

    <VAlert
      v-if="isOverCategoryLimit"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-2"
    >
      {{
        `The total score (${totalAfterCreate} pts) exceeds the category max (${meta.category_max_score} pts). You can add up to ${remainingScore} pts more.`
      }}
    </VAlert>

    <div
      v-if="!assessmentRows.length"
      class="text-center text-medium-emphasis text-body-2 pa-3 mt-2 rounded-lg empty-state"
    >
      {{ t("Enter quantity to show assessment rows.") }}
    </div>

    <div v-else class="d-flex flex-column gap-3 mt-2">
      <div
        v-for="(row, index) in assessmentRows"
        :key="index"
        class="assessment-input-row d-flex align-center gap-2 pa-3 rounded-lg"
      >
        <VAvatar size="28" color="primary" variant="tonal">
          <span class="text-caption font-weight-bold">
            {{ row.sequence_no ?? index + 1 }}
          </span>
        </VAvatar>

        <AppTextField
          v-model="row.item_name"
          :label="t('Assessment Name')"
          :rules="[requiredValidator]"
          hide-details="auto"
          class="flex-grow-1"
        />

        <AppTextField
          v-model="row.max_score"
          type="number"
          :label="t('Max Score')"
          :rules="[createRowMaxScoreValidator(index)]"
          hide-details="auto"
          style="max-width: 120px"
          @update:model-value="markRowMaxScoreManual(index)"
        />

        <VBtn
          icon="tabler-minus"
          variant="text"
          color="error"
          size="small"
          @click="removeRow(index)"
        />
      </div>
    </div>

    <div v-if="assessmentRows.length" class="d-flex justify-end mt-3">
      <VBtn
        variant="tonal"
        color="success"
        size="small"
        prepend-icon="tabler-plus"
        @click="addRow"
      >
        {{ t("Add Row") }}
      </VBtn>
    </div>
  </AppAddEditDialog>
</template>

<style scoped>
.assessment-input-row,
.empty-state {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
</style>
