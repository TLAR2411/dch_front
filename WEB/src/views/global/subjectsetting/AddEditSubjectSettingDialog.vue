<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import { useI18n } from "vue-i18n";
import { usePartStore } from "@/stores/partStore";
import { getCategories, getGrades, getSubjects } from "@/services/dataService";
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

// default empty rule row
const emptyRule = () => ({
  category_id: null,
  percentage: null,
  max_score: null,
});

const itemData = ref({
  id: null,
  subject_id: null,
  grade_id: null,
  rules: [emptyRule()],
});

// applies default rule row if rules are empty
const applyDefaultRule = () => {
  if (!itemData.value.rules || itemData.value.rules.length === 0) {
    itemData.value.rules = [emptyRule()];
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
          : [emptyRule()],
    };

    console.log("newDataEdit", newData);

    existingRules.value = newData?.existingRules
      ? newData.existingRules.map((r) => ({ ...r }))
      : [];
    applyDefaultRule();
  },
  { deep: true, immediate: true },
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
  applyDefaultRule();
};

// add a new empty rule row
const addRule = () => {
  itemData.value.rules.push(emptyRule());
};

// remove a rule row by index (keep at least 1 row)
const removeRule = (index) => {
  if (itemData.value.rules.length > 1) {
    itemData.value.rules.splice(index, 1);
  }
};

// returns categories not yet used in OTHER rows (current row keeps its own selection visible)

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

// sum of all percentage values across rules
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

const isOverLimit = computed(() => totalPercentage.value > 100);
const isComplete = computed(() => totalPercentage.value === 100);

const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (!valid) return;

  if (totalPercentage.value > 100) {
    return;
  }

  const payload = {
    ...itemData.value,
    year_id: yearId.value, // <-- add this
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

const dialogModelValueUpdate = (newVal) => {
  emit("update:isDialogVisible", newVal);
};

onMounted(async () => {
  categories.value = await getCategories();
  subjects.value = await getSubjects();
  grades.value = await getGrades();
  applyDefaultRule();
});
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    max-width="700"
    :title="itemData.isEdit ? t('Update Subjects') : t('Create Subjects')"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow style="margin-top: -20px">
      <VCol cols="6" sm="6" md="6">
        <AppAutocomplete
          v-model="itemData.subject_id"
          :items="subjects"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Choose Subject')"
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

    <!-- <AppLabel title="Setup Rule" />
      -->
    <VDivider class="mt-5" />

    <!-- Rules list -->
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
          v-if="!isComplete"
          icon
          size="small"
          color="success"
          variant="text"
          :disabled="
            availableCategories(index).length === 0 ||
            itemData.rules.length >= categories.length
          "
          @click="addRule"
        >
          <VIcon icon="tabler-circle-plus" />
        </VBtn>
      </VCol>
    </VRow>

    <!-- Percentage total summary -->
    <VRow style="margin-top: 0">
      <VCol cols="12">
        <VAlert
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
    :title="itemData.id == null ? t('Create Subjects') : t('Update Subjects')"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow style="margin-top: -20px">
      <VCol cols="12" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.subject_id"
          :items="subjects"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Choose Subject')"
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

    <!-- <AppLabel title="Setup Rule" />
      -->
    <VDivider class="mt-5" />

    <!-- Rules list -->
    <VRow
      v-for="(rule, index) in itemData.rules"
      :key="index"
      align="center"
      style="margin-top: 0"
    >
      <VCol cols="5" md="5">
        <AppAutocomplete
          v-model="rule.category_id"
          :disabled="isAllGrade"
          :items="availableCategories(index)"
          :item-title="selectItemTitle"
          item-value="id"
          :label="t('Choose Category')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="3" md="3">
        <AppTextField v-model="rule.percentage" :label="t('%')" />
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
          v-if="itemData.rules.length === 1 && !isComplete"
          icon
          size="small"
          color="success"
          variant="text"
          :disabled="
            availableCategories(index).length === 0 ||
            itemData.rules.length >= categories.length
          "
          @click="addRule"
        >
          <VIcon icon="tabler-circle-plus" />
        </VBtn>
      </VCol>
    </VRow>

    <!-- Percentage total summary -->
    <VRow style="margin-top: 0">
      <VCol cols="12" class="d-flex ga-5">
        <VAlert
          :color="isOverLimit ? 'error' : isComplete ? 'success' : 'warning'"
          variant="tonal"
          density="compact"
        >
          {{ t("Total Percentage") }}: {{ totalPercentage }}% / 100%
          <span v-if="isOverLimit">
            — {{ t("exceeds 100%, please adjust") }}
          </span>
        </VAlert>
        <VBtn
          icon
          size="small"
          color="success"
          variant="text"
          v-if="!isComplete && isOverLimit === false"
          :disabled="
            availableCategories(index).length === 0 ||
            itemData.rules.length >= categories.length
          "
          @click="addRule"
        >
          <VIcon icon="tabler-circle-plus" />
        </VBtn>
      </VCol>
    </VRow>
  </AppAddEditDrawer>
</template>
