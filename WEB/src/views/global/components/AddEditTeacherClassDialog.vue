<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import { getSubjects, getTeacher } from "@/services/dataService";
import { useSettingStore } from "@/stores/settingStore";

const store = useSettingStore();

const teachers = ref([]);

const subjects = ref([]);

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
});

watch(
  () => store.branch_id,
  async (newVal) => {
    if (newVal) {
      teachers.value = await getTeacher();
      subjects.value = await getSubjects();
    }
  },
);

const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const itemData = ref({
  teacher_id: "",
  subject_id: "",
  is_assistance: null,
  is_classload: null,
  description: "",
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      teacher_id: newData?.teacher_id ?? "",
      subject_id: newData?.subject_id ?? "",
      is_assistance: newData?.is_assistance ?? "",
      is_classload: newData?.is_classload ?? "",
      description: newData?.description ?? "",
      id: newData?.id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    teacher_id: "",
    subject_id: "",
    is_assistance: null,
    is_classload: null,
    description: "",
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
  if (store.branch_id != "*") {
    teachers.value = await getTeacher();
    subjects.value = await getSubjects();
  }
});
</script>

<template>
  <AppAddEditDialog
    max-width="600"
    :title="itemData.id == null ? 'Add Teacher Class' : 'Update Teacher Class'"
    :is-dialog-visible="isDialogVisible"
    :is-update="itemData.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6" md="6">
        <AppAutocomplete
          v-model="itemData.teacher_id"
          :items="teachers"
          item-title="name_en"
          item-value="id"
          :label="t('Teachers')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>

      <VCol cols="12" sm="6" md="6">
        <AppAutocomplete
          v-model="itemData.subject_id"
          :items="subjects"
          item-title="name_en"
          item-value="id"
          :label="t('Subject')"
          autocomplete="off"
          persistent-hint
        />
      </VCol>
      <VCol cols="12" sm="12" md="12" class="d-flex ga-5">
        <VCheckbox v-model="itemData.is_assistance" label="Assistance" />
        <VCheckbox v-model="itemData.is_classload" label="Classload" />
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
</template>
