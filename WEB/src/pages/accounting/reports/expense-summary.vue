<script setup>
import { api } from "@/utils/api.js";
import AppCard from "@/components/AppCard.vue";
import AppDateTimePicker from "@core/components/app-form-elements/AppDateTimePicker.vue";
import { useSettingStore } from "@/stores/settingStore.js";
import moment from "moment-timezone";
import formatNoneZero from "@/utils/formater/formatNoneZero";
import { auth } from "@/utils/auth";
import MianLogo from "@images/logo/main-logo-1.svg?url";
import formatDate from "@/utils/formater/formatDate";
import { getCurrencies } from "@/services/dataService";

definePage({
  meta: {
    title: "Expense Summary",
    layout: "default",
    subject: "Auth",
    navActiveLink: "reports",
  },
});
const start_date = moment()
  .tz("Asia/Phnom_Penh")
  .format("YYYY-MM-DDTHH:mm:ss.SSS+07:00");
const end_date = moment()
  .tz("Asia/Phnom_Penh")
  .format("YYYY-MM-DDTHH:mm:ss.SSS+07:00");

const isLoading = ref(true);
const items = ref([]);
const options = ref([]);
const currency = ref({});

const filter = ref({
  start_date: start_date,
  end_date: end_date,
});

const initData = async () => {
  try {
    isLoading.value = true;

    const res = await api.post("expense-summary-reports", {
      page: options.value.page,
      limit: options.value.limit,
      filter: filter.value,
    });

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

onMounted(() => {
  initData();
});
const formatAmount = (amount) => {
  // Format the amount with commas and 2 decimal places
  return Number(amount).toLocaleString("en-US");
};

watch(filter.value, (newValue) => {
  if (newValue) {
    initData();
  }
});

watch(
  () => useSettingStore().branch_id,
  (newValue) => {
    if (newValue) {
      initData();
    }
  },
);

onMounted(async () => {
  const dataCurrencies = await getCurrencies();
  currency.value = dataCurrencies.find((v) => v.default == true);
  initData();
});
</script>

<template>
  <AppCard
    title="Expense"
    is-print
    is-filter
    show-filters
    title-icon="tabler-cash-banknote-move"
    :loading="isLoading"
    :is-back="false"
  >
    <template #filter>
      <VRow class="justify-end">
        <VCol cols="12" sm="6" md="4" lg="3">
          <AppDateTimePicker
            v-model="filter.start_date"
            :config="{
              allowInput: true,
            }"
            autocomplete="off"
            prepend-inner-icon="tabler-calendar-due"
          >
            <template #label>
              {{ $t("Start Date") }}
            </template>
          </AppDateTimePicker>
        </VCol>
        <VCol cols="12" sm="6" md="4" lg="3">
          <AppDateTimePicker
            v-model="filter.end_date"
            :config="{
              allowInput: true,
            }"
            autocomplete="off"
            prepend-inner-icon="tabler-calendar-due"
          >
            <template #label>
              {{ $t("End Date") }}
            </template>
          </AppDateTimePicker>
        </VCol>
      </VRow>
    </template>
    <template #headerPrint>
      <div class="d-flex flex-column">
        <div>
          <img
            class="justify-center align-center"
            style="height: 38px !important"
            :src="MianLogo"
          />
        </div>
        <span
          class="text-center mt-1"
          style="
            color: #000000;
            font-family: moul, sans-serif !important;
            font-size: 16px;
          "
        >
          របាយការណ៍ ចំណាយ
        </span>
      </div>
      <!-- <div class="d-flex flex-row justify-space-between mb-2">
        <div style="color: black; font-size: 12px">
          {{ items.selected_branch }}
        </div>
        <div style="color: red; font-size: 12px">{{ items.selected_date }}</div>
      </div> -->
    </template>
    <span
      style="color: #000000; font-family: moul, sans-serif !important"
    ></span>

    <template #footerPrint>
      <div
        class="d-flex flex-row justify-space-between mt-6 mr-4 section-header"
      >
        <div
          class="d-flex flex-column text-center"
          style="
            margin-top: 80px;
            margin-left: 80px;
            color: black;
            font-size: 12px;
          "
        >
          <span>ត្រួតពិនិត្យដោយ</span>
          <span style="margin-top: 90px">.................</span>
        </div>
        <div
          class="d-flex flex-column text-center"
          style="margin-right: 30px; font-size: 12px"
        >
          <span>{{ items.selected_date }}</span>
          <span>រៀបចំដោយ</span>
          <span style="margin-top: 90px">{{ auth().user.name_kh }}</span>
        </div>
      </div>
    </template>
    <div class="d-flex flex-row justify-space-between">
      <h4 class="section-header text-start">{{ items.selected_branch }}</h4>
      <h4 class="date-header text-end">{{ items.selected_date }}</h4>
    </div>
    <VTable class="text-no-wrap">
      <tbody>
        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <td class="text-start font-weight-bold" style="font-size: 13px">
            កាលបរិច្ចេទ
          </td>
          <td class="text-start font-weight-bold" style="font-size: 13px">
            គណនី
          </td>
          <td class="text-start font-weight-bold" style="font-size: 13px">
            ឈ្មោះគណនី
          </td>

          <td class="text-start font-weight-bold" style="font-size: 13px">
            បរិយាយ
          </td>
          <!-- <td class="text-start font-weight-bold" style="font-size: 13px">
            ឈ្មោះ
          </td> -->
          <td class="text-end font-weight-bold" style="font-size: 13px">
            ចំនួនទឹកប្រាក់
          </td>
        </tr>

        <template v-if="items?.expenses?.length > 0">
          <tr v-for="item in items.expenses">
            <td class="text-start">
              {{ formatDate(item.journal_date) }}
            </td>
            <td class="text-start">
              {{ item.account_code }}
            </td>
            <td class="text-start">
              <div class="d-flex flex-column">
                <span style="font-size: 14px">{{
                  item.chart_account?.name_kh
                }}</span>
                <span style="font-size: 12px">{{
                  item.chart_account?.name_en
                }}</span>
              </div>
            </td>
            <td class="text-start description-text">{{ item.description }}</td>
            <!-- <td class="text-start">{{ item.person?.name_kh }}</td> -->
            <td class="text-end">
              {{ formatNoneZero(item.balance) }}
            </td>
          </tr>

          <tr class="section-header font-weight-bold">
            <td
              class="text-end"
              colspan="4"
              style="background-color: rgba(211, 211, 211, 0.2)"
            >
              {{ $t("Total Expense") }}
            </td>
            <td
              class="text-end"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
            >
              {{ formatNoneZero(items.total_expense, currency.show) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="5" class="text-center">{{ $t("No expense found") }}</td>
        </tr>
      </tbody>
    </VTable>
    <VDivider />
  </AppCard>
</template>

<style scoped>
@page {
  size: A4;
  margin: 0.5cm 0.5cm 0.5cm 0.5cm !important;
}
/* Ensure table takes full width */
.striped-table {
  width: 100%;
}

/* Optional: Adjust padding for better spacing */
.v-table td,
.v-table th {
  padding: 2px;
  height: 40px !important;
}

.description-text {
  white-space: pre-wrap;
  max-width: 450px;
}
/* Print-specific styles */
@media print {
  /* h3 {
    font-family: moul, sans-serif !important;
  } */
  tr {
    page-break-inside: avoid;
  }
  .description-text {
    white-space: pre-wrap;
    max-width: 200px; /* Adjust as needed */
    font-size: 10px; /* Optional: reduce font size */
  }
  .printDiv {
    display: block;
  }
  .print-header {
    font-size: 12px;
  }

  .v-table td,
  .v-table th {
    padding: 2px;
    height: 30px !important;
    color: black;
    font-size: 12px;
  }
  /* Remove all margins and padding from the body, card, and table */

  .date-header {
    color: red !important;
    font-size: 12px;
  }
  .section-header {
    color: black;
    font-size: 12px;
  }
}
</style>
