<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import { usePartStore } from "@/stores/partStore";

import { getGrades, getYears, getRooms } from "@/services/dataService";

import { useYearStore } from "@/stores/yearStore";
import { getCurrentYearId } from "@/services/getCurrentYearId";

import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";

import { useDisplay } from "vuetify";

const { xs } = useDisplay();

const yearStore = useYearStore();

const curId = ref(usePartStore().cur_id);

const { t } = useI18n();

const symbols = ref([
  {
    name: "A",
    value: "A",
  },
  {
    name: "B",
    value: "B",
  },
  {
    name: "C",
    value: "C",
  },
  {
    name: "D",
    value: "D",
  },
  {
    name: "E",
    value: "E",
  },
]);

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

const grades = ref([]);

const years = ref([]);

const rooms = ref([]);

const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const itemData = ref({
  name_kh: "",
  name_en: null,
  name_cn: null,
  description: null,
  grade_id: null,
  year_id: getCurrentYearId(),
  symbol: null,
  room_id: null,
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      name_kh: newData?.name_kh ?? "",
      name_en: newData?.name_en ?? null,
      name_cn: newData?.name_cn ?? null,
      grade_id: newData?.grade_id ?? null,
      description: newData?.description ?? null,
      year_id: newData?.year_id ?? null,
      symbol: newData?.symbol ?? null,
      room_id: newData?.room_id ?? null,
      id: newData?.id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    name_kh: "",
    name_en: null,
    name_cn: null,
    description: null,
    grade_id: null,
    year_id: null,
    symbol: null,
    room_id: null,
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

// watch(
//   () => [itemData.value.grade_id, itemData.value.symbol],
//   ([newVal, newSym]) => {
//     if (newVal) {
//       const selectedGrade = grades.value.find((grade) => grade.id === newVal);
//       if (selectedGrade.name_en) {
//         itemData.value.name_en = selectedGrade.name_en;
//         if (newSym) {
//           itemData.value.name_en += "-" + `${newSym}`;
//         }
//       }
//       if (selectedGrade.name_cn) {
//         itemData.value.name_cn = selectedGrade.name_cn;
//         if (newSym) {
//           itemData.value.name_cn += "-" + `${newSym}`;
//         }
//       }
//       if (selectedGrade.name_kh) {
//         itemData.value.name_kh = selectedGrade.name_kh;
//         if (newSym) {
//           itemData.value.name_kh += "-" + `${newSym}`;
//         }
//       }
//     }
//   },
// );

// ======

watch(
  () => [itemData.value.grade_id, itemData.value.symbol],
  ([newVal, newSym]) => {
    if (!newVal) return;

    const selectedGrade = grades.value.find((grade) => grade.id === newVal);
    if (!selectedGrade) return;

    const suffix = newSym ? `-${newSym}` : "";
    const fields = ["name_en", "name_cn", "name_kh"];

    fields.forEach((field) => {
      if (selectedGrade[field]) {
        itemData.value[field] = selectedGrade[field] + suffix;
      }
    });
  },
);

const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisible", false);
};

const dialogModelValueUpdate = (newVal) => {
  emit("update:isDialogVisible", newVal);
  isDialogVisible.value = newVal;
};

console.log(getCurrentYearId());

onMounted(async () => {
  console.log("curid", curId.value);
  grades.value = await getGrades();
  years.value = await getYears();
  rooms.value = await getRooms();
});
</script>

<template>
  <AppAddEditDialog
    max-width="700"
    v-if="!xs"
    :title="itemData.id == null ? 'Create Classes' : 'Update Classes'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="8" sm="8" md="8">
        <AppAutocomplete
          v-model="itemData.grade_id"
          :items="grades"
          item-title="name_en"
          item-value="id"
          :label="t('Grade')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="4" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.symbol"
          :items="symbols"
          item-title="name"
          item-value="value"
          :label="t('Symbol')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="4" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.room_id"
          :items="rooms"
          item-title="room_number"
          item-value="id"
          :label="t('Room')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="8" sm="8" md="8">
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
        <AppTextField v-model="itemData.name_kh" :label="t('Name Kh')" />
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
    :title="itemData.id == null ? 'Create Classes' : 'Update Classes'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="8" sm="8" md="8">
        <AppAutocomplete
          v-model="itemData.grade_id"
          :items="grades"
          item-title="name_en"
          item-value="id"
          :label="t('Grade')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="4" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.symbol"
          :items="symbols"
          item-title="name"
          item-value="value"
          :label="t('Symbol')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="4" sm="4" md="4">
        <AppAutocomplete
          v-model="itemData.room_id"
          :items="rooms"
          item-title="room_number"
          item-value="id"
          :label="t('Room')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="8" sm="8" md="8">
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
        <AppTextField v-model="itemData.name_kh" :label="t('Name Kh')" />
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

      <VCol cols="12" sm="12" md="12">
        <AppTextarea
          v-model="itemData.description"
          :label="t('Description')"
          rows="2"
        >
        </AppTextarea>
      </VCol> </VRow
  ></AppAddEditDrawer>
</template>
