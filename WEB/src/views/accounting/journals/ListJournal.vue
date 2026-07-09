<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { app } from "@/utils/app";
import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import { useRouter } from "vue-router";
import moment from "moment-timezone";
import formatDate from "@/utils/formater/formatDate";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import formatNoneZero from "@/utils/formater/formatNoneZero";

definePage({
  meta: {
    title: "Journals",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-journals",
  },
});

const { t, locale } = useI18n();
const router = useRouter();
const formData = ref({});
const chartAccounts = ref(app().chartAccounts);
const accountTypes = ref(app().accountTypes);
const dataTableRef = ref(null);
const isDialogVisible = ref(false);
const isLoading = ref(true);

const filter = ref({
  start_date: moment.utc().startOf("month").toISOString(),
  end_date: moment()
    .tz("Asia/Phnom_Penh")
    .format("YYYY-MM-DDTHH:mm:ss.SSS+07:00"),
  search: null,
  account_type_id: null,
  account_code: null,
});

const headers = [
  {
    title: t("Account Code"),
    key: "account_code",
    visible: true,
  },
  {
    title: t("Account Name"),
    key: "chart_account.name_kh",
    visible: true,
  },
  { title: t("Code"), key: "code", visible: true },
  // {
  //   title: t("Class"),
  //   key: "journal_class.name_kh",
  //   value: (item) => {
  //     return locale.value === "kh"
  //       ? item?.journal_class?.name_kh
  //       : item?.journal_class?.name_en;
  //   },
  // },
  // {
  //   title: t("Name"),
  //   key: "person.name_kh",
  //   value: (item) => {
  //     return locale.value === "kh"
  //       ? item?.person?.name_kh ||
  //           item?.vendor?.name_kh ||
  //           item?.customer?.name_kh ||
  //           null
  //       : item?.person?.name_en ||
  //           item?.vendor?.name_en ||
  //           item?.customer?.name_kh ||
  //           null;
  //   },
  // },
  { title: t("Description"), key: "description", visible: true },
  {
    title: t("Date"),
    key: "journal_date",
    value: (item) => {
      return formatDate(item.journal_date);
    },
    visible: true,
  },
  { title: t("Reference"), key: "reference", visible: true },
  // { title: t("Currency"), key: "currency.currency_code", align: "center" },
  {
    title: t("Debit"),
    key: "debit",
    value: (item) => {
      return formatNoneZero(item.debit);
    },
    align: "end",
    visible: true,
  },
  {
    title: t("Credit"),
    key: "credit",
    value: (item) => {
      return formatNoneZero(item.credit);
    },
    align: "end",
    visible: true,
  },

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

    const res = await api.post("journals-delete", { code: item.code });

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

const onEdit = async (item) => {
  router.push({
    name: "journals-tab",
    params: { tab: "create" },
    query: { code: item.code },
  });
};

watch(
  () => filter.value.account_type_id,
  (newVal) => {
    filter.value.account_code = null;

    if (newVal == null) {
      chartAccounts.value = app().chartAccounts;
    } else {
      chartAccounts.value = app().chartAccounts.filter(
        (v) => v.account_type_id == newVal,
      );
    }
  },
);
</script>

<template>
  <div class="journal-list-height">
    <AppCardTable
      ref="dataTableRef"
      title="Journals"
      title-icon="tabler-list"
      saveHeaderName="header-list-journals"
      saveStateName="save-state-list-journals"
      v-model:loading="isLoading"
      v-model:filters="filter"
      api-url="journals-list"
      :headers="headers"
      is-filter
      is-edit
      is-delete
      is-excel
      save-state
      @onEdit="onEdit"
      @onDelete="onDelete"
      class="h-100"
      border="border-none"
    >
      <template #filter>
        <VRow class="justify-end">
          <!----Filter Input-->
          <VCol cols="12" sm="12" md="2">
            <AppDateTimePicker v-model="filter.start_date" clearable>
              <template #label>{{ $t("Start Date") }}</template>
            </AppDateTimePicker>
          </VCol>
          <VCol cols="12" sm="12" md="2">
            <AppDateTimePicker v-model="filter.end_date" clearable>
              <template #label>{{ $t("End Date") }}</template>
            </AppDateTimePicker>
          </VCol>
          <VCol cols="12" sm="12" md="2">
            <AppAutocomplete
              v-model="filter.account_type_id"
              :items="accountTypes"
              :item-title="
                (item) => {
                  return `${item?.id} - ${item?.name_kh}`;
                }
              "
              item-value="id"
              clearable
            >
              <template #label>{{ $t("Account Type") }}</template>
            </AppAutocomplete>
          </VCol>

          <VCol cols="12" sm="12" md="2">
            <AppAutocomplete
              v-model="filter.account_code"
              :items="chartAccounts || []"
              :item-title="
                (item) => {
                  return `${item?.code} - ${item?.name_kh}`;
                }
              "
              item-value="code"
              clearable
            >
              <template #label>{{ $t("Chart Account") }}</template>
            </AppAutocomplete>
          </VCol>
          <VCol cols="12" sm="12" md="2">
            <AppTextField v-model="filter.search" clearable>
              <template #label>{{ $t("Search") }}</template>
            </AppTextField>
          </VCol>
        </VRow>
      </template>
      <template v-slot:item.chart_account.name_kh="{ item }">
        <div class="d-flex flex-column">
          <span style="font-size: 14px">{{ item.chart_account?.name_kh }}</span>
          <span class="text-secondary" style="font-size: 12px">{{
            item.chart_account?.name_en
          }}</span>
        </div>
      </template>

      <template v-slot:item.description="{ item }">
        {{ item.description }} &nbsp;
        <template v-if="item.is_auto">
          <VChip color="success" size="x-small"> Auto </VChip>
        </template>
      </template>
    </AppCardTable>
  </div>
</template>

<style lang="scss" scoped>
.journal-list-height {
  height: calc(100dvh - 155px); /* Use dvh instead of vh */
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .journal-list-height {
    height: calc(100dvh - 155px); /* Adjust as needed */
    position: relative;
  }

  /* Ensure the table container takes full available height */
  .h-100 {
    height: 100% !important;
    min-height: 0; /* Important for flex children */
  }
}
</style>
