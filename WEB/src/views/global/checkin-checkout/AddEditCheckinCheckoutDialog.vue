<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import { getCurriculumsAssignments, getYears } from "@/services/dataService";
import { getCurriculums } from "@/services/dataService";
import { getCurrentYearId } from "@/services/getCurrentYearId";

import { useDisplay } from "vuetify";
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";
// import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";

const { xs } = useDisplay();

const { t } = useI18n();

const curriculums = ref([]);

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

const itemData = ref({
  description: "",
  checkin_start_time: null,
  checkin_end_time: null,
  checkin_late_time: null,
  checkout_start_time: null,
  checkout_end_time: null,
  cur_id: null,
  year_id: getCurrentYearId(),
  ...props.itemData,
});

const years = ref([]);

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      description: newData?.description ?? "",
      checkin_start_time: newData?.checkin_start_time ?? null,
      checkin_end_time: newData?.checkin_end_time ?? null,
      checkin_late_time: newData?.checkin_late_time ?? null,
      checkout_start_time: newData?.checkout_start_time ?? null,
      checkout_end_time: newData?.checkout_end_time ?? null,
      year_id: newData?.year_id ?? null,
      id: newData?.id ?? null,
      cur_id: newData?.cur_id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    description: "",
    checkin_start_time: null,
    checkin_end_time: null,
    checkin_late_time: null,
    checkout_start_time: null,
    checkout_end_time: null,
    year_id: null,
    cur_id: null,
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

onMounted(async () => {
  years.value = await getYears();
  curriculums.value = await getCurriculums();
});
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    max-width="700"
    :title="
      itemData.id == null
        ? 'Create Checkin Checkout'
        : 'Update Checkin Checkout'
    "
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" md="12">
        <AppAutocomplete
          v-model="itemData.cur_id"
          :items="curriculums"
          item-title="name_kh"
          item-value="id"
          :label="t('Curriculum')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkin_start_time"
          :label="t('Checkin Start Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkin_end_time"
          :label="t('Checkin End Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkin_late_time"
          :label="t('Checkin Late Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkout_start_time"
          :label="t('Checkout Start Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkout_end_time"
          :label="t('Checkout End Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>

      <VCol cols="12" sm="4" md="4">
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
      <VCol cols="12" sm="6" md="12">
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
    :title="
      itemData.id == null
        ? 'Create Checkin Checkout'
        : 'Update Checkin Checkout'
    "
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" md="12">
        <AppAutocomplete
          v-model="itemData.cur_id"
          :items="curriculums"
          item-title="name_kh"
          item-value="id"
          :label="t('Curriculum')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkin_start_time"
          :label="t('Checkin Start Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkin_end_time"
          :label="t('Checkin End Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkin_late_time"
          :label="t('Checkin Late Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkout_start_time"
          :label="t('Checkout Start Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppDateTimePicker
          v-model="itemData.checkout_end_time"
          :label="t('Checkout End Time')"
          :config="{ enableTime: true, noCalendar: true, dateFormat: 'H:i' }"
        />
      </VCol>

      <VCol cols="12" sm="4" md="4">
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
      <VCol cols="12" sm="6" md="12">
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
