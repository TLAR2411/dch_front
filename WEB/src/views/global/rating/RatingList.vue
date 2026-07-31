<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { listRatings, createRating, updateRating, deleteRating } from "@/services/api/ratings";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import successAlert from "@/helper/successAlert.js";
import DeleteAlert from "@/helper/deleteAlert.js";
import { usePartStore } from "@/stores/partStore";
import AddEditRatingDialog from "./AddEditRatingDialog.vue";

const { mdAndUp } = useDisplay();
const partStore = usePartStore();

const { t } = useI18n();
const formData = ref({});
const isDialogVisible = ref(false);
const isLoading = ref(true);
const ratings = ref([]);

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

const filteredRatings = computed(() => {
  const q = String(filter.value.search || "")
    .trim()
    .toLowerCase();
  if (!q) return ratings.value;

  return ratings.value.filter((item) => {
    const fields = [item.name_kh, item.description];
    if (isEnglishPart.value) fields.push(item.name_en);
    if (isChinesePart.value) fields.push(item.name_cn);

    const haystack = fields.filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });
});

async function loadRatings() {
  isLoading.value = true;
  try {
    if (partStore.cur_id == null) {
      ratings.value = [];
      return;
    }

    const data = await listRatings();
    ratings.value = data ?? [];
  } catch (error) {
    console.error("Failed to fetch ratings:", error);
    ratings.value = [];
    successAlert.fire({
      icon: "error",
      title: error.message || t("Failed to fetch ratings"),
    });
  } finally {
    isLoading.value = false;
  }
}

const onDelete = async (item) => {
  await DeleteAlert(async () => {
    try {
      isLoading.value = true;

      const error = await deleteRating(item.id).then(() => null).catch((e) => e);

      if (error) throw error;

     
      await loadRatings();
    } catch (error) {
      console.error("Failed to delete rating:", error);
     
    } finally {
      isLoading.value = false;
    }
  });
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;

    if (partStore.cur_id == null) {
      throw new Error(t("Please select a curriculum part first"));
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

    const error = await createRating(payload).then(() => null).catch((e) => e);
    if (error) throw error;


    await loadRatings();
    isDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to create rating:", error);
  
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

    const error = await updateRating({ ...payload, id: data.id }).then(() => null).catch((e) => e);

    if (error) throw error;

    successAlert.fire({
      icon: "success",
      title: t("Rating updated successfully"),
    });

    await loadRatings();
    isDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to update rating:", error);
    successAlert.fire({
      icon: "error",
      title: error.message || t("Failed to update rating"),
    });
    callback(false);
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => partStore.cur_id,
  async () => {
    await loadRatings();
  },
);

onMounted(async () => {
  await loadRatings();
});
</script>

<template>
  <AddEditRatingDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    :title="$t('Rating')"
    title-icon="tabler-star"
    saveHeaderName="header-rating-list"
    saveStateName="save-state-rating-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    :items="filteredRatings"
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
