<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useDisplay } from "vuetify";
import formatTime from "@/utils/formater/formatTime";
import AddEditCheckinCheckoutDialog from "@/views/global/checkin-checkout/AddEditCheckinCheckoutDialog.vue";
const { mdAndUp } = useDisplay();
definePage({
  meta: {
    title: "Checkin Checkout",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-curriculumns",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const { t } = useI18n();
const formData = ref({});
const isDialogVisible = ref(false);
const isLoading = ref(true);
const dataTableRef = ref(null);

const filter = ref({
  search: null,
});

const headers = [
  { title: t("Name Khmer"), key: "curriculum.name_kh", visible: true },
  { title: t("Name English"), key: "curriculum.name_en", visible: true },
  { title: t("Symbol"), key: "curriculum.symbol", visible: true },
  {
    title: t("Checkin Start Time"),
    key: "checkin_start_time",
    visible: true,
  },
  {
    title: t("Checkin End Time"),
    key: "checkin_end_time",
    visible: true,
  },
  {
    title: t("Checkin Late Time"),
    key: "checkin_late_time",
    visible: true,
  },
  {
    title: t("Checkout Start Time"),
    key: "checkout_start_time",
    visible: true,
  },
  {
    title: t("Checkout End Time"),
    key: "checkout_end_time",
    visible: true,
  },
  { title: t("Status"), key: "is_active", visible: true },

  { title: t("Description"), key: "description", visible: true },

  {
    title: t("Action"),
    key: "actions",
    align: "center",
    visible: true,
    fixed: mdAndUp.value,
  },
];

const onDelete = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("curriculums-assignments-delete", {
      id: item.id,
    });
    if (res.data.status) {
      dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("curriculums-assignments-store", data);

    if (res.data.status) {
      dataTableRef.value.reload();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("curriculums-assignments-show", { id: item.id });

    if (res.data.status) {
      formData.value = res.data.data.data;
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

    const res = await api.post("curriculums-assignments-update", data);

    if (res.data.status) {
      dataTableRef.value.reload();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onDisable = async (item) => {
  try {
    const res = await api.post("curriculums-assignments-disable", {
      id: item.id,
    });

    if (res.data.status) {
      await dataTableRef.value.reload();
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
  }
};
</script>

<template>
  <AddEditCheckinCheckoutDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AppCardTable
    v-model:isDialogCreateVisible="isDialogVisible"
    ref="dataTableRef"
    :title="$t('Checkin Checkout')"
    title-icon="tabler-clock"
    saveHeaderName="header-checkin-checkout-list"
    saveStateName="save-state-checkin-checkout-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    api-url="curriculums-assignments-filter-list"
    :headers="headers"
    is-filter
    is-excel
    is-edit
    is-delete
    is-disable
    create-dialog
    save-state
    :is-back="false"
    @on-delete="onDelete"
    @on-edit="onEdit"
    @on-disable="onDisable"
  >
    <template #filter>
      <VRow class="justify-end">
        <!----Filter Input-->

        <VCol cols="12" sm="6" md="4" lg="2">
          <VTextField
            v-model="filter.search"
            :label="t('Search')"
            prepend-inner-icon="tabler-search"
            clearable
            hide-details
            autocomlete="off"
            clear-icon="tabler-x"
          />
        </VCol>
      </VRow>
    </template>

    <template v-slot:item.default="{ item }">
      <VChip color="success" size="small" v-if="item.default == true">
        {{ $t("Default") }}
      </VChip>
    </template>
    <template v-slot:item.is_active="{ item }">
      <VChip color="success" size="small" v-if="item.is_active == true">
        {{ $t("Active") }}
      </VChip>
      <VChip color="error" size="small" v-if="item.is_active == false">
        {{ $t("Inactive") }}
      </VChip>
    </template>
  </AppCardTable>
</template>
