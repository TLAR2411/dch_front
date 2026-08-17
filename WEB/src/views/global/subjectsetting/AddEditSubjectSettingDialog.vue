<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { debounce } from "lodash";
import { useI18n } from "vue-i18n";
import { usePartStore } from "@/stores/partStore";
import { getCategories, getGrades, getSubjects } from "@/services/dataService";
import { showSubject } from "@/services/api/subjects";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import { useDisplay } from "vuetify";
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";

import { useYearStore } from "@/stores/yearStore";
import { useEntityLabel } from "@/composable/useEntityLabel.js";

const yearStore = useYearStore();
const { selectItemTitle } = useEntityLabel();

const curId = ref(usePartStore().cur_id);

const yearId = ref(yearStore.year_id);
const { t } = useI18n();

const { xs } = useDisplay();

const isAllGrade = ref(false);
const isSelectGrade = ref(true);

const existingRules = ref([]);
const selectedSubjectMeta = ref(null);
const subjectLocked = ref(false);

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

const categories = ref([]);
const subjects = ref([]);
const grades = ref([]);

const emptyRule = (isChild = false) => ({
  category_id: null,
  percentage: isChild ? 0 : null,
  max_score: null,
});

const itemData = ref({
  id: null,
  subject_id: null,
  grade_id: null,
  rules: [emptyRule()],
});

const isChildSubject = computed(() => Boolean(selectedSubjectMeta.value?.parent_id));

const dialogTitle = computed(() => {
  if (itemData.value.isEdit) {
    return isChildSubject.value
      ? t("Update Child Categories")
      : t("Update Subject Setting");
  }

  return isChildSubject.value
    ? t("Add Child Categories")
    : t("Add Subject Setting");
});

const applyDefaultRule = () => {
  if (!itemData.value.rules || itemData.value.rules.length === 0) {
    itemData.value.rules = [emptyRule(isChildSubject.value)];
  }
};

const ensureSubjectInList = (subjectRow) => {
  if (!subjectRow?.id) return;
  if (!subjects.value.some((s) => Number(s.id) === Number(subjectRow.id))) {
    subjects.value = [...subjects.value, subjectRow];
  }
};

const applyChildPercentageDefaults = () => {
  if (!isChildSubject.value) return;
  itemData.value.rules = (itemData.value.rules || []).map((rule) => ({
    ...rule,
    percentage: 0,
  }));
};

const resolveSelectedSubject = async (subjectId) => {
  if (!subjectId) {
    selectedSubjectMeta.value = null;
    return;
  }

  const cached = subjects.value.find((s) => Number(s.id) === Number(subjectId));
  if (cached?.parent_id != null || cached?.parent_id === null) {
    // Parent list from subjects-all has no parent_id field; treat missing as parent
    // unless we already enriched the row.
  }

  try {
    const subjectRow = await showSubject(subjectId);
    selectedSubjectMeta.value = subjectRow;
    ensureSubjectInList(subjectRow);
    applyChildPercentageDefaults();
  } catch (error) {
    console.error("Failed to resolve subject:", error);
    selectedSubjectMeta.value = cached
      ? { ...cached, parent_id: cached.parent_id ?? null }
      : null;
  }
};

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      id: newData?.id ?? null,
      subject_id: newData?.subject_id ?? null,
      grade_id: newData?.grade_id ?? null,
      edit_mode: newData?.edit_mode ?? "subject",
      isEdit: newData?.isEdit ?? false,
      rules:
        newData?.rules && newData.rules.length
          ? newData.rules.map((r) => ({ ...r }))
          : [emptyRule(Boolean(newData?.is_child))],
    };

    subjectLocked.value = Boolean(newData?.lock_subject);
    existingRules.value = newData?.existingRules
      ? newData.existingRules.map((r) => ({ ...r }))
      : [];
    applyDefaultRule();

    if (newData?.subject_id) {
      resolveSelectedSubject(newData.subject_id);
    } else {
      selectedSubjectMeta.value = null;
    }
  },
  { deep: true, immediate: true },
);

watch(
  () => itemData.value.subject_id,
  (subjectId, prevId) => {
    if (Number(subjectId) === Number(prevId)) return;
    resolveSelectedSubject(subjectId);
  },
);

const resetData = () => {
  itemData.value = {
    id: null,
    subject_id: null,
    grade_id: null,
    rules: [emptyRule()],
  };
  isAllGrade.value = false;
  isSelectGrade.value = true;
  existingRules.value = [];
  selectedSubjectMeta.value = null;
  subjectLocked.value = false;
  applyDefaultRule();
};

const addRule = () => {
  itemData.value.rules.push(emptyRule(isChildSubject.value));
};

const removeRule = (index) => {
  if (itemData.value.rules.length > 1) {
    itemData.value.rules.splice(index, 1);
  }
};

const availableCategories = (index) => {
  const usedInExisting = existingRules.value
    .filter((r) => r.category_id)
    .map((r) => r.category_id);

  const usedInForm = itemData.value.rules
    .filter((r, i) => i !== index && r.category_id)
    .map((r) => r.category_id);

  const usedIds = [...usedInExisting, ...usedInForm];

  return categories.value.filter((c) => !usedIds.includes(c.id));
};

const totalPercentage = computed(() => {
  const existingSum = existingRules.value.reduce((sum, r) => {
    const val = parseFloat(r.percentage);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const newSum = itemData.value.rules.reduce((sum, r) => {
    const val = parseFloat(r.percentage);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return existingSum + newSum;
});

const formPercentageTotal = computed(() =>
  itemData.value.rules.reduce((sum, r) => {
    const val = parseFloat(r.percentage);
    return sum + (isNaN(val) ? 0 : val);
  }, 0),
);

const isOverLimit = computed(() => {
  if (isChildSubject.value) {
    // New rows must stay at 0%. Existing DB rows are not edited in create mode.
    return formPercentageTotal.value > 0;
  }
  return totalPercentage.value > 100;
});

const isComplete = computed(() => {
  if (isChildSubject.value) return formPercentageTotal.value === 0;
  return totalPercentage.value === 100;
});

const canAddMoreRules = computed(() => {
  if (isChildSubject.value) {
    return (
      availableCategories(itemData.value.rules.length - 1).length > 0 &&
      itemData.value.rules.length < categories.value.length
    );
  }

  return (
    !isComplete.value &&
    !isOverLimit.value &&
    availableCategories(itemData.value.rules.length - 1).length > 0 &&
    itemData.value.rules.length < categories.value.length
  );
});

const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (!valid) return;

  if (isChildSubject.value) {
    applyChildPercentageDefaults();
    if (formPercentageTotal.value > 0) return;
  } else if (totalPercentage.value > 100) {
    return;
  }

  const payload = {
    ...itemData.value,
    year_id: yearId.value,
    rules: (itemData.value.rules || []).map((rule) => ({
      ...rule,
      percentage: isChildSubject.value ? 0 : rule.percentage,
    })),
  };

  const itemId = itemData.value.isEdit || null;
  if (itemId) {
    emit("onUpdate", payload, (res) => {
      if (res) resetData();
    });
  } else {
    emit("onCreate", payload, (res) => {
      if (res) resetData();
    });
  }
}, 500);

const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisible", false);
};

onMounted(async () => {
  categories.value = await getCategories();
  subjects.value = (await getSubjects()) || [];
  grades.value = await getGrades();
  applyDefaultRule();
  if (itemData.value.subject_id) {
    await resolveSelectedSubject(itemData.value.subject_id);
  }
});
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    max-width="700"
    :title="dialogTitle"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VAlert
      v-if="isChildSubject"
      class="mb-4"
      type="info"
      variant="tonal"
      density="compact"
    >
      {{
        t(
          "Child subject categories use 0% weight. Set max scores so they sum to the parent category max.",
        )
      }}
    </VAlert>

    <VRow style="margin-top: -20px">
      <VCol cols="6" sm="6" md="6">
        <AppAutocomplete
          v-model="itemData.subject_id"
          :items="subjects"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Choose Subject')"
          :disabled="subjectLocked"
          autocomplete="off"
          persistent-hint
        />
      </VCol>
      <VCol cols="6" sm="6" md="6" class="d-flex align-center mt-6 ga-5">
        <VCheckbox
          v-model="isAllGrade"
          :label="t('All Grades')"
          @change="
            () => {
              if (isAllGrade) {
                isSelectGrade = false;
                itemData.grade_id = grades.map((g) => g.id);
              } else {
                itemData.grade_id = null;
              }
            }
          "
        />
        <VCheckbox
          v-model="isSelectGrade"
          :label="t('Select Grades')"
          @change="
            () => {
              if (isSelectGrade) {
                isAllGrade = false;
              }
            }
          "
        />
      </VCol>
      <VCol cols="12" sm="12" md="12">
        <AppAutocomplete
          :disabled="isAllGrade"
          v-model="itemData.grade_id"
          :items="grades"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Selected Grade')"
          autocomplete="off"
          persistent-hint
          multiple
          eager
          closable-chips
          chips
        />
      </VCol>
    </VRow>

    <VDivider class="mt-5" />

    <VRow
      v-for="(rule, index) in itemData.rules"
      :key="index"
      align="center"
      style="margin-top: 0"
    >
      <VCol cols="5" md="4">
        <AppAutocomplete
          :disabled="itemData.edit_mode === 'rule'"
          v-model="rule.category_id"
          :items="availableCategories(index)"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Choose Category')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="3" md="3">
        <AppTextField
          v-model="rule.percentage"
          suffix="%"
          :label="t('Percentage')"
          :disabled="isChildSubject"
          :hint="isChildSubject ? t('Always 0% for child subjects') : undefined"
          :persistent-hint="isChildSubject"
        />
      </VCol>

      <VCol cols="3" md="3">
        <AppTextField v-model="rule.max_score" :label="t('Max Score')" />
      </VCol>

      <VCol cols="1" md="2" class="d-flex align-center">
        <VBtn
          v-if="
            itemData.rules.length !== 1 && !itemData.isEdit && !rule.category_id
          "
          icon
          size="small"
          color="error"
          variant="text"
          :disabled="itemData.rules.length === 1"
          @click="removeRule(index)"
        >
          <VIcon icon="tabler-circle-minus" />
        </VBtn>
        <VBtn
          v-if="index === itemData.rules.length - 1 && canAddMoreRules"
          icon
          size="small"
          color="success"
          variant="text"
          @click="addRule"
        >
          <VIcon icon="tabler-circle-plus" />
        </VBtn>
      </VCol>
    </VRow>

    <VRow style="margin-top: 0">
      <VCol cols="12">
        <VAlert
          v-if="isChildSubject"
          :color="isOverLimit ? 'error' : 'success'"
          variant="tonal"
          density="compact"
        >
          {{ t("Child weight") }}: {{ formPercentageTotal }}%
          <span v-if="isOverLimit">
            — {{ t("Child categories must stay at 0%") }}
          </span>
          <span v-else>
            — {{ t("Weights belong on the parent subject") }}
          </span>
        </VAlert>
        <VAlert
          v-else
          :color="isOverLimit ? 'error' : isComplete ? 'success' : 'warning'"
          variant="tonal"
          density="compact"
        >
          {{ t("Total Percentage") }}: {{ totalPercentage }}% / 100%
          <span v-if="isOverLimit">
            — {{ t("exceeds 100%, please adjust") }}
          </span>
        </VAlert>
      </VCol>
    </VRow>
  </AppAddEditDialog>

  <AppAddEditDrawer
    v-else
    :title="dialogTitle"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VAlert
      v-if="isChildSubject"
      class="mb-4"
      type="info"
      variant="tonal"
      density="compact"
    >
      {{
        t(
          "Child subject categories use 0% weight. Set max scores so they sum to the parent category max.",
        )
      }}
    </VAlert>

    <VRow style="margin-top: -20px">
      <VCol cols="12" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.subject_id"
          :items="subjects"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Choose Subject')"
          :disabled="subjectLocked"
          autocomplete="off"
          persistent-hint
        />
      </VCol>
      <VCol cols="12" sm="8" md="8">
        <AppAutocomplete
          v-model="itemData.grade_id"
          :items="grades"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Selected Grade')"
          autocomplete="off"
          persistent-hint
          multiple
          eager
          closable-chips
          chips
        />
      </VCol>
    </VRow>

    <VDivider class="mt-5" />

    <VRow
      v-for="(rule, index) in itemData.rules"
      :key="index"
      align="center"
      style="margin-top: 0"
    >
      <VCol cols="5" md="5">
        <AppAutocomplete
          v-model="rule.category_id"
          :items="availableCategories(index)"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Choose Category')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="3" md="3">
        <AppTextField
          v-model="rule.percentage"
          :label="t('%')"
          :disabled="isChildSubject"
        />
      </VCol>

      <VCol cols="3" md="3">
        <AppTextField v-model="rule.max_score" :label="t('MS')" />
      </VCol>

      <VCol cols="1" md="1" class="d-flex ga-2 align-center">
        <VBtn
          v-if="itemData.rules.length !== 1"
          icon
          size="small"
          color="error"
          variant="text"
          :disabled="itemData.rules.length === 1"
          @click="removeRule(index)"
        >
          <VIcon icon="tabler-circle-minus" />
        </VBtn>

        <VBtn
          v-if="index === itemData.rules.length - 1 && canAddMoreRules"
          icon
          size="small"
          color="success"
          variant="text"
          @click="addRule"
        >
          <VIcon icon="tabler-circle-plus" />
        </VBtn>
      </VCol>
    </VRow>

    <VRow style="margin-top: 0">
      <VCol cols="12" class="d-flex ga-5 align-center">
        <VAlert
          v-if="isChildSubject"
          class="flex-grow-1"
          :color="isOverLimit ? 'error' : 'success'"
          variant="tonal"
          density="compact"
        >
          {{ t("Child weight") }}: {{ formPercentageTotal }}%
          <span v-if="isOverLimit">
            — {{ t("Child categories must stay at 0%") }}
          </span>
        </VAlert>
        <VAlert
          v-else
          class="flex-grow-1"
          :color="isOverLimit ? 'error' : isComplete ? 'success' : 'warning'"
          variant="tonal"
          density="compact"
        >
          {{ t("Total Percentage") }}: {{ totalPercentage }}% / 100%
          <span v-if="isOverLimit">
            — {{ t("exceeds 100%, please adjust") }}
          </span>
        </VAlert>
      </VCol>
    </VRow>
  </AppAddEditDrawer>
</template>
