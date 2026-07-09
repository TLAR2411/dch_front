<script setup>
import { ref, watch, nextTick } from "vue";
import { debounce } from "lodash";
import { requiredValidator } from "@/@core/utils/validators";
import AppTextarea from "@/@core/components/app-form-elements/AppTextarea.vue";
import { useI18n } from "vue-i18n";
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";

import { useDisplay } from "vuetify";
import AddEditRoomsDrawer from "./AddEditRoomsDrawer.vue";
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
    skipCheck: true,
    default: undefined,
  },
});

const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const itemData = ref({
  room_number: null,
  floor: null,
  building: null,
  description: null,
  ...props.itemData,
});

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = {
      room_number: newData?.room_number ?? null,
      floor: newData?.floor ?? null,
      building: newData?.building ?? null,
      description: newData?.description ?? null,
      id: newData?.id ?? null,
    };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    room_number: "",
    floor: "",
    building: "",
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

const building = ref([
  { value: "Building A", name: "Building A" },
  { value: "Building B", name: "Building B" },
  { value: "Building C", name: "Building C" },
]);

const floor = ref([
  { value: "1", name: "1" },
  { value: "2", name: "2" },
  { value: "3", name: "3" },
  { value: "4", name: "4" },
  { value: "5", name: "5" },
]);
</script>

<template>
  <div>
    <AppAddEditDialog
      v-if="!xs"
      :title="itemData.id == null ? 'Create Rooms' : 'Update Rooms'"
      :is-dialog-visible="isDialogVisible"
      :is-update="itemData.id != null ? true : false"
      :loading="loading"
      @on-close-dialog="onCloseDialog"
      @on-submit="onFormSubmit"
    >
      <VRow>
        <VCol cols="12" sm="4" md="4">
          <AppTextField
            v-model="itemData.room_number"
            :label="t('Room Number')"
            :rules="[requiredValidator]"
          />
        </VCol>

        <VCol cols="12" sm="4" md="4">
          <AppAutocomplete
            v-model="itemData.building"
            :items="building"
            item-title="name"
            item-value="value"
            :label="t('Building')"
            autocomplete="off"
            persistent-hint
          />
        </VCol>
        <VCol cols="12" sm="4" md="4">
          <AppAutocomplete
            :items="floor"
            item-value="value"
            item-title="name"
            v-model="itemData.floor"
            :label="t('Floor')"
            autocomplete="off"
            persistent-hint
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
      :title="itemData.id == null ? 'Create Rooms' : 'Update Rooms'"
      :is-dialog-visible="isDialogVisible"
      :is-update="itemData.id != null"
      :loading="loading"
      @on-close-dialog="onCloseDialog"
      @on-submit="onFormSubmit"
    >
      <VRow>
        <VCol cols="12" sm="4" md="4">
          <AppTextField
            v-model="itemData.room_number"
            :label="t('Room Number')"
            :rules="[requiredValidator]"
          />
        </VCol>

        <VCol cols="12" sm="4" md="4">
          <AppAutocomplete
            v-model="itemData.building"
            :items="building"
            item-title="name"
            item-value="value"
            :label="t('Building')"
            autocomplete="off"
            persistent-hint
          />
        </VCol>
        <VCol cols="12" sm="4" md="4">
          <AppAutocomplete
            :items="floor"
            item-value="value"
            item-title="name"
            v-model="itemData.floor"
            :label="t('Floor')"
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
  </div>
</template>
