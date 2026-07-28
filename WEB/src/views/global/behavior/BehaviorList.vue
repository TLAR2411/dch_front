<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { listBehaviors, createBehavior, updateBehavior, deleteBehavior } from "@/services/api/behaviors";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import successAlert from "@/helper/successAlert.js";
import DeleteAlert from "@/helper/deleteAlert.js";
import { usePartStore } from "@/stores/partStore";
import AddEditBehaviorDialog from "./AddEditBehaviorDialog.vue";

const { mdAndUp } = useDisplay();
const partStore = usePartStore();

definePage({
  meta: {
    title: "Behavior",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const { t } = useI18n();
const formData = ref({});
const isDialogVisible = ref(false);
const isLoading = ref(true);
const behaviors = ref([]);

watch(isDialogVisible, (visible) => {
  if (!visible) formData.value = {};
});

const filter = ref({
  search: null,
});

const isEnglishPart = computed(
  () => partStore.system_part === "english" || Number(partStore.cur_id) === 1,
);
const isChinesePart = computed(
  () => partStore.system_part === "chinese" || Number(partStore.cur_id) === 3,
);

const headers = computed(() => {
  const cols = [];

  if (isEnglishPart.value) {
    cols.push({ title: t("Name English"), key: "name_en", visible: true });
  }

  cols.push({ title: t("Name Khmer"), key: "name_kh", visible: true });

  if (isChinesePart.value) {
    cols.push({ title: t("Name Chinese"), key: "name_cn", visible: true });
  }

  cols.push(
    { title: t("Description"), key: "description", visible: true },
    {
      title: t("Action"),
      key: "actions",
      align: "center",
      visible: true,
      fixed: mdAndUp.value,
    },
  );

  return cols;
});

const filteredBehaviors = computed(() => {
  const q = String(filter.value.search || "")
    .trim()
    .toLowerCase();
  if (!q) return behaviors.value;

  return behaviors.value.filter((item) => {
    const fields = [item.name_kh, item.description];
    if (isEnglishPart.value) fields.push(item.name_en);
    if (isChinesePart.value) fields.push(item.name_cn);

    const haystack = fields.filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });
});

async function loadBehaviors() {
  isLoading.value = true;
  try {
    if (partStore.cur_id == null) {
      behaviors.value = [];
      return;
    }

    const data = await listBehaviors();
    const error = null;

    if (error) throw error;
    behaviors.value = data ?? [];
  } catch (error) {
    console.error("Failed to fetch behaviors:", error);
    behaviors.value = [];
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to fetch behaviors",
    });
  } finally {
    isLoading.value = false;
  }
}

const onDelete = async (item) => {
  await DeleteAlert(async () => {
    try {
      isLoading.value = true;

      const error = await deleteBehavior(item.id).then(() => null).catch((e) => e);

      if (error) throw error;

      successAlert.fire({
        icon: "success",
        title: "Behavior deleted successfully",
      });
      await loadBehaviors();
    } catch (error) {
      console.error("Failed to delete behavior:", error);
      successAlert.fire({
        icon: "error",
        title: error.message || "Failed to delete behavior",
      });
    } finally {
      isLoading.value = false;
    }
  });
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;

    if (partStore.cur_id == null) {
      throw new Error("Please select a curriculum part first");
    }

    const payload = {
      name_en: data.name_en || null,
      name_kh: data.name_kh || null,
      name_cn: data.name_cn || null,
      description: data.description || null,
      cur_id: partStore.cur_id,
      is_active: true,
      is_deleted: false,
    };

    const error = await createBehavior(payload).then(() => null).catch((e) => e);
    if (error) throw error;

    successAlert.fire({
      icon: "success",
      title: "Behavior created successfully",
    });

    await loadBehaviors();
    isDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to create behavior:", error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to create behavior",
    });
    callback(false);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  formData.value = { ...item };
  isDialogVisible.value = true;
};

const onUpdate = async (data, callback) => {
  try {
    isLoading.value = true;

    const payload = {
      name_en: data.name_en || null,
      name_kh: data.name_kh || null,
      name_cn: data.name_cn || null,
      description: data.description || null,
      updated_at: new Date().toISOString(),
    };

    const error = await updateBehavior({ ...payload, id: data.id }).then(() => null).catch((e) => e);

    if (error) throw error;

    successAlert.fire({
      icon: "success",
      title: "Behavior updated successfully",
    });

    await loadBehaviors();
    isDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to update behavior:", error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to update behavior",
    });
    callback(false);
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => partStore.cur_id,
  async () => {
    await loadBehaviors();
  },
);

onMounted(async () => {
  await loadBehaviors();
});
</script>

<template>
  <AddEditBehaviorDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    title="Behavior"
    title-icon="tabler-mood-smile"
    saveHeaderName="header-behavior-list"
    saveStateName="save-state-behavior-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    :items="filteredBehaviors"
    :headers="headers"
    is-filter
    is-excel
    is-edit
    is-delete
    create-dialog
    save-state
    :is-back="false"
    @on-delete="onDelete"
    @on-edit="onEdit"
  >
    <template #filter>
      <VRow class="justify-end">
        <VCol cols="12" sm="6" md="4" lg="2">
          <VTextField
            v-model="filter.search"
            :label="t('Search')"
            prepend-inner-icon="tabler-search"
            clearable
            hide-details
            autocomplete="off"
            clear-icon="tabler-x"
          />
        </VCol>
      </VRow>
    </template>
  </AppCardTable>
</template>
