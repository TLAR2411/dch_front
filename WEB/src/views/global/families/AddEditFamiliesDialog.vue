<script setup>
import { ref, watch } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";

const { xs } = useDisplay();
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
    default: undefined,
  },
});

const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const guardianTypes = [
  { value: "father", name: t("Father") },
  { value: "mother", name: t("Mother") },
  { value: "grandparent", name: t("Grandparent") },
  { value: "sibling", name: t("Sibling") },
  { value: "legal_guardian", name: t("Legal Guardian") },
  { value: "other", name: t("Other") },
];

const emptyGuardian = () => ({
  id: null,
  name_en: "",
  name_kh: "",
  phone: "",
  email: "",
  type: "father",
  description: "",
});

const itemData = ref({
  name_en: null,
  name_kh: null,
  description: null,
  guardians: [emptyGuardian(), { ...emptyGuardian(), type: "mother" }],
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    const guardians =
      Array.isArray(newData?.guardians) && newData.guardians.length
        ? newData.guardians.map((g) => ({
            id: g.id ?? null,
            name_en: g.name_en || g.user_name || g.name || "",
            name_kh: g.name_kh || "",
            phone: g.phone || "",
            email: g.email || "",
            type: g.type || "other",
            description: g.description || "",
          }))
        : [emptyGuardian(), { ...emptyGuardian(), type: "mother" }];

    itemData.value = {
      id: newData?.id ?? null,
      name_en: newData?.name_en ?? null,
      name_kh: newData?.name_kh ?? null,
      description: newData?.description ?? null,
      guardians,
      students: newData?.students ?? [],
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    id: null,
    name_en: "",
    name_kh: "",
    description: "",
    guardians: [emptyGuardian(), { ...emptyGuardian(), type: "mother" }],
    students: [],
  };
};

const addGuardian = () => {
  itemData.value.guardians.push(emptyGuardian());
};

const removeGuardian = (index) => {
  if (itemData.value.guardians.length <= 1) return;
  itemData.value.guardians.splice(index, 1);
};

const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (!valid) return;

  const payload = {
    ...itemData.value,
    guardians: (itemData.value.guardians || []).filter(
      (g) => g.name_en || g.name_kh,
    ),
  };

  const itemId = itemData.value.id || null;
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
</script>

<template>
  <div>
    <AppAddEditDialog
      v-if="!xs"
      :title="itemData.id == null ? t('Create Family') : t('Update Family')"
      :is-dialog-visible="isDialogVisible"
      :is-update="itemData.id != null"
      :loading="loading"
      max-width="900px"
      @on-submit="onFormSubmit"
      @on-close-dialog="onCloseDialog"
      @update:is-dialog-visible="dialogModelValueUpdate"
    >
      <VRow>
        <VCol cols="12" md="6">
          <AppTextField
            v-model="itemData.name_en"
            :label="t('Name English')"
            :rules="[requiredValidator]"
            autocomplete="off"
          />
        </VCol>
        <VCol cols="12" md="6">
          <AppTextField
            v-model="itemData.name_kh"
            :label="t('Name Khmer')"
            autocomplete="off"
          />
        </VCol>
        <VCol cols="12">
          <AppTextarea
            v-model="itemData.description"
            :label="t('Description')"
            rows="2"
          />
        </VCol>

        <VCol cols="12" class="d-flex align-center justify-space-between">
          <div class="text-subtitle-1">{{ t("Guardians") }}</div>
          <VBtn size="small" variant="tonal" @click="addGuardian">
            {{ t("Add Guardian") }}
          </VBtn>
        </VCol>

        <VCol
          v-for="(g, index) in itemData.guardians"
          :key="g.id || index"
          cols="12"
        >
          <VCard variant="outlined" class="pa-3">
            <VRow>
              <VCol cols="12" md="3">
                <AppSelect
                  v-model="g.type"
                  :label="t('Type')"
                  :items="guardianTypes"
                  item-title="name"
                  item-value="value"
                />
              </VCol>
              <VCol cols="12" md="3">
                <AppTextField
                  v-model="g.name_en"
                  :label="t('Name English')"
                  autocomplete="off"
                />
              </VCol>
              <VCol cols="12" md="3">
                <AppTextField
                  v-model="g.name_kh"
                  :label="t('Name Khmer')"
                  autocomplete="off"
                />
              </VCol>
              <VCol cols="12" md="3">
                <AppTextField
                  v-model="g.phone"
                  :label="t('Phone')"
                  autocomplete="off"
                />
              </VCol>
              <VCol cols="12" class="d-flex justify-end">
                <VBtn
                  size="small"
                  color="error"
                  variant="text"
                  :disabled="itemData.guardians.length <= 1"
                  @click="removeGuardian(index)"
                >
                  {{ t("Remove") }}
                </VBtn>
              </VCol>
            </VRow>
          </VCard>
        </VCol>

        <VCol v-if="itemData.students?.length" cols="12">
          <div class="text-subtitle-2 mb-2">{{ t("Linked Students") }}</div>
          <VChip
            v-for="s in itemData.students"
            :key="s.id"
            class="ma-1"
            size="small"
          >
            {{ s.name_en || s.name_kh || s.id }}
          </VChip>
        </VCol>
      </VRow>
    </AppAddEditDialog>

    <AppAddEditDrawer
      v-else
      :title="itemData.id == null ? t('Create Family') : t('Update Family')"
      :is-dialog-visible="isDialogVisible"
      :is-update="itemData.id != null"
      :loading="loading"
      @on-submit="onFormSubmit"
      @on-close-dialog="onCloseDialog"
      @update:is-dialog-visible="dialogModelValueUpdate"
    >
      <VRow>
        <VCol cols="12">
          <AppTextField
            v-model="itemData.name_en"
            :label="t('Name English')"
            :rules="[requiredValidator]"
            autocomplete="off"
          />
        </VCol>
        <VCol cols="12">
          <AppTextField
            v-model="itemData.name_kh"
            :label="t('Name Khmer')"
            autocomplete="off"
          />
        </VCol>
        <VCol cols="12">
          <AppTextarea
            v-model="itemData.description"
            :label="t('Description')"
            rows="2"
          />
        </VCol>
        <VCol cols="12" class="d-flex align-center justify-space-between">
          <div class="text-subtitle-1">{{ t("Guardians") }}</div>
          <VBtn size="small" variant="tonal" @click="addGuardian">
            {{ t("Add Guardian") }}
          </VBtn>
        </VCol>
        <VCol
          v-for="(g, index) in itemData.guardians"
          :key="g.id || index"
          cols="12"
        >
          <VCard variant="outlined" class="pa-3">
            <VRow>
              <VCol cols="12">
                <AppSelect
                  v-model="g.type"
                  :label="t('Type')"
                  :items="guardianTypes"
                  item-title="name"
                  item-value="value"
                />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="g.name_en" :label="t('Name English')" />
              </VCol>
              <VCol cols="12">
                <AppTextField v-model="g.phone" :label="t('Phone')" />
              </VCol>
              <VCol cols="12" class="d-flex justify-end">
                <VBtn
                  size="small"
                  color="error"
                  variant="text"
                  :disabled="itemData.guardians.length <= 1"
                  @click="removeGuardian(index)"
                >
                  {{ t("Remove") }}
                </VBtn>
              </VCol>
            </VRow>
          </VCard>
        </VCol>
      </VRow>
    </AppAddEditDrawer>
  </div>
</template>
