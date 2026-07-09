<script setup>
import AppCard from "@/components/AppCard.vue";
import AddEditDialog from "@/views/accounting/journal-settings/AddEditDialog.vue";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useAppStore } from "@/stores/appStore.js";
import AppCardSetting from "@/components/AppCardSetting.vue";

definePage({
  meta: {
    title: "Journal Settings",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
  },
});

const { t } = useI18n();
const formData = ref({});
const items = ref([]);
const isDialogVisible = ref(false);
const isLoading = ref(true);

const filter = ref({
  search: null,
});

const initData = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("journal-settings-all");

    if (res.data.status) {
      items.value = res.data.data;
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("journal-settings-show", { id: item });

    if (res.data.status) {
      formData.value = res.data.data;
      formData.value.value = parseFloat(res.data.data.value);
      // console.log(formData.value)
      isDialogVisible.value = true;
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onUpdate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("journal-settings-update", data);

    if (res.data.status) {
      initData();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    useAppStore().getChartAccounts();
    isLoading.value = false;
  }
};
onMounted(() => {
  initData();
});
</script>

<template>
  <AddEditDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-update="onUpdate"
  />

  <AppCard
    v-model:isDialogCreateVisible="isDialogVisible"
    title="Settings"
    title-icon="tabler-settings"
    :loading="isLoading"
  >
    <VRow>
      <template v-for="item in items">
        <AppCardSetting :item="item" @on-edit="onEdit" />
      </template>
    </VRow>
  </AppCard>
</template>
