<script setup>
import { computed, ref, watch, onMounted } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import { usePartStore } from "@/stores/partStore";
import { useSettingStore } from "@/stores/settingStore";
import { getYears } from "@/services/dataService";
import { calculateSchoolDayCountsForTerm } from "@/utils/schoolDays.js";
import { useDisplay } from "vuetify";

const { xs } = useDisplay();
const partStore = usePartStore();
const settingStore = useSettingStore();

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

const years = ref([]);
const schoolDayPreview = ref(null);
const previewLoading = ref(false);

const previewReady = computed(
  () =>
    Boolean(itemData.value.start_date) &&
    Boolean(itemData.value.end_date) &&
    Boolean(itemData.value.year_id),
);

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
      total_days: newData?.total_days ?? null,
      weekend_days: newData?.weekend_days ?? null,
      holiday_days: newData?.holiday_days ?? null,
      school_event_days: newData?.school_event_days ?? null,
      school_days: newData?.school_days ?? null,
    };

    if (
      itemData.value.total_days != null &&
      itemData.value.school_days != null
    ) {
      schoolDayPreview.value = {
        total_days: itemData.value.total_days,
        weekend_days: itemData.value.weekend_days ?? 0,
        holiday_days: itemData.value.holiday_days ?? 0,
        school_event_days: itemData.value.school_event_days ?? 0,
        school_days: itemData.value.school_days,
      };
    }
  },
  { deep: true },
);

const refreshSchoolDayPreview = debounce(async () => {
  if (!previewReady.value) {
    schoolDayPreview.value = null;
    return;
  }

  previewLoading.value = true;
  try {
    schoolDayPreview.value = await calculateSchoolDayCountsForTerm({
      startDate: itemData.value.start_date,
      endDate: itemData.value.end_date,
      yearId: itemData.value.year_id,
      curId: partStore.cur_id,
      branchId: settingStore.branch_id,
    });
  } catch (error) {
    console.error("Failed to preview school days:", error);
    schoolDayPreview.value = null;
  } finally {
    previewLoading.value = false;
  }
}, 400);

watch(
  () => [
    itemData.value.start_date,
    itemData.value.end_date,
    itemData.value.year_id,
    partStore.cur_id,
    settingStore.branch_id,
  ],
  () => {
    refreshSchoolDayPreview();
  },
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
    start_date: null,
    end_date: null,
  };
  schoolDayPreview.value = null;
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
};

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
      <VCol cols="12">
        <AppTextarea
          v-model="itemData.description"
          :label="t('Description')"
          rows="2"
        />
      </VCol>

      <VCol v-if="previewReady || schoolDayPreview" cols="12">
        <div class="school-day-preview">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="font-weight-medium">School day summary</div>
            <VProgressCircular
              v-if="previewLoading"
              indeterminate
              size="18"
              width="2"
            />
          </div>
          <div v-if="schoolDayPreview" class="preview-grid">
            <div>
              <div class="preview-label">Total</div>
              <div class="preview-value">{{ schoolDayPreview.total_days }}</div>
            </div>
            <div>
              <div class="preview-label">Weekend</div>
              <div class="preview-value">{{ schoolDayPreview.weekend_days }}</div>
            </div>
            <div>
              <div class="preview-label">Holiday</div>
              <div class="preview-value">{{ schoolDayPreview.holiday_days }}</div>
            </div>
            <div>
              <div class="preview-label">Event</div>
              <div class="preview-value">
                {{ schoolDayPreview.school_event_days }}
              </div>
            </div>
            <div class="preview-school">
              <div class="preview-label">School days</div>
              <div class="preview-value">{{ schoolDayPreview.school_days }}</div>
            </div>
          </div>
          <div class="preview-hint mt-2">
            Holidays match calendar year by date. School events match selected
            academic year.
          </div>
        </div>
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
        />
      </VCol>

      <VCol v-if="previewReady || schoolDayPreview" cols="12">
        <div class="school-day-preview">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="font-weight-medium">School day summary</div>
            <VProgressCircular
              v-if="previewLoading"
              indeterminate
              size="18"
              width="2"
            />
          </div>
          <div v-if="schoolDayPreview" class="preview-grid">
            <div>
              <div class="preview-label">Total</div>
              <div class="preview-value">{{ schoolDayPreview.total_days }}</div>
            </div>
            <div>
              <div class="preview-label">Weekend</div>
              <div class="preview-value">{{ schoolDayPreview.weekend_days }}</div>
            </div>
            <div>
              <div class="preview-label">Holiday</div>
              <div class="preview-value">{{ schoolDayPreview.holiday_days }}</div>
            </div>
            <div>
              <div class="preview-label">Event</div>
              <div class="preview-value">
                {{ schoolDayPreview.school_event_days }}
              </div>
            </div>
            <div class="preview-school">
              <div class="preview-label">School days</div>
              <div class="preview-value">{{ schoolDayPreview.school_days }}</div>
            </div>
          </div>
        </div>
      </VCol>
    </VRow>
  </AppAddEditDrawer>
</template>

<style scoped>
.school-day-preview {
  border: 1px solid rgba(var(--v-border-color), 0.35);
  border-radius: 10px;
  padding: 12px 14px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.preview-label {
  font-size: 11px;
  opacity: 0.65;
}

.preview-value {
  font-size: 16px;
  font-weight: 600;
  margin-top: 2px;
}

.preview-school .preview-value {
  color: rgb(var(--v-theme-primary));
}

.preview-hint {
  font-size: 11px;
  opacity: 0.65;
}

@media (max-width: 600px) {
  .preview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
