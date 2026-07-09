<script setup>
import { ref, watch } from "vue";
import { debounce } from "lodash";
import AppAddEditDialog from "@/components/AppAddEditDialog.vue";
import Address from "@/components/Address.vue";
import { requiredValidator } from "@/@core/utils/validators";

import { useDisplay } from "vuetify";
import App from "@/App.vue";
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";

const { xs } = useDisplay();

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

const emit = defineEmits(["update:isDialogVisible", "onCreate", "onUpdate"]);

const emptyForm = () => ({
  name_kh: "",
  name_en: "",
  symbol: "",
  contact: "",
  house_no: "",
  street: "",
  province_code: null,
  district_code: null,
  commune_code: null,
  village_code: null,
});

// API may return province_id / district_id / commune_id — normalize to *_code for Address
const normalizeBranchData = (data = {}) => ({
  ...emptyForm(),
  ...data,
  province_code: data.province_code ?? data.province_id ?? null,
  district_code: data.district_code ?? data.district_id ?? null,
  commune_code: data.commune_code ?? data.commune_id ?? null,
  village_code: data.village_code ?? null,
});

const itemData = ref(normalizeBranchData(props.itemData));

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = normalizeBranchData(newData);
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = emptyForm();
};

const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (!valid) return;

  const branchId = itemData.value.id || null;
  const payload = { ...itemData.value };

  if (branchId) {
    emit("onUpdate", payload, (response) => {
      if (response == 200) resetData();
    });
  } else {
    emit("onCreate", payload, (response) => {
      if (response == 200) resetData();
    });
  }
}, 500);

const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisible", false);
};
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    max-width="700px"
    :title="itemData.id == null ? 'Create Branch' : 'Update Branch'"
    :isUpdate="itemData.id != null"
    :isDialogVisible="isDialogVisible"
    :loading="loading"
    @update:isDialogVisible="emit('update:isDialogVisible', $event)"
    @onCloseDialog="onCloseDialog"
    @onSubmit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.name_kh"
          label="Name Khmer"
          placeholder="ការិយាល័យកណ្ដាល"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.name_en"
          label="Name English"
          placeholder="Head office"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.symbol"
          label="Symbol"
          persistent-hint
          placeholder="HO"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.contact"
          label="Contact"
          placeholder="098898988"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.house_no"
          label="House No"
          placeholder="981"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.street"
          label="Street"
          placeholder="205 Street"
        />
      </VCol>

      <VCol cols="12">
        <Address
          :province_code="itemData.province_code"
          :district_code="itemData.district_code"
          :commune_code="itemData.commune_code"
          :village_code="itemData.village_code"
          @update:province_code="itemData.province_code = $event"
          @update:district_code="itemData.district_code = $event"
          @update:commune_code="itemData.commune_code = $event"
          @update:village_code="itemData.village_code = $event"
        />
      </VCol>
    </VRow>
  </AppAddEditDialog>

  <AppAddEditDrawer
    v-else
    :title="itemData.id == null ? 'Create Branch' : 'Update Branch'"
    :isUpdate="itemData.id != null"
    :isDialogVisible="isDialogVisible"
    :loading="loading"
    @update:isDialogVisible="emit('update:isDialogVisible', $event)"
    @onCloseDialog="onCloseDialog"
    @onSubmit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.name_kh"
          label="Name Khmer"
          placeholder="ការិយាល័យកណ្ដាល"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.name_en"
          label="Name English"
          placeholder="Head office"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.symbol"
          label="Symbol"
          persistent-hint
          placeholder="HO"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6">
        <AppTextField
          v-model="itemData.contact"
          label="Contact"
          placeholder="098898988"
        />
      </VCol>
      <VCol cols="6" sm="6">
        <AppTextField
          v-model="itemData.house_no"
          label="House No"
          placeholder="981"
        />
      </VCol>
      <VCol cols="6" sm="6">
        <AppTextField
          v-model="itemData.street"
          label="Street"
          placeholder="205 Street"
        />
      </VCol>

      <VCol cols="12">
        <Address
          :province_code="itemData.province_code"
          :district_code="itemData.district_code"
          :commune_code="itemData.commune_code"
          :village_code="itemData.village_code"
          @update:province_code="itemData.province_code = $event"
          @update:district_code="itemData.district_code = $event"
          @update:commune_code="itemData.commune_code = $event"
          @update:village_code="itemData.village_code = $event"
        />
      </VCol>
    </VRow>
  </AppAddEditDrawer>
</template>
