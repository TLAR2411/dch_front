<script setup>
import { api } from "@/utils/api.js";
import AppCard from "@/components/AppCard.vue";
import { useSettingStore } from "@/stores/settingStore.js";
import MianLogo from "@images/logo/main-logo-1.svg?url";
import "flatpickr/dist/plugins/monthSelect/style.css";
import moment from "moment-timezone";
import formatNoneZero from "@/utils/formater/formatNoneZero";
import { getCurrencies } from "@/services/dataService";

definePage({
  meta: {
    title: "Profit And Loss Summary",
    layout: "default",
    subject: "Auth",
    navActiveLink: "reports",
  },
});

const reportRef = ref(null);
const isLoading = ref(true);
const items = ref([]);
const options = ref([]);
const currency = ref({});

const filter = ref({
  start_date: moment()
    .tz("Asia/Phnom_Penh")
    .format("YYYY-MM-DDTHH:mm:ss.SSS+07:00"),
});

const initData = async () => {
  try {
    isLoading.value = true;

    const res = await api.post("profit-and-loss-monthly-reports", {
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

onMounted(async () => {
  const dataCurrencies = await getCurrencies();
  currency.value = dataCurrencies.find((v) => v.default == true);
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
</script>

<template>
  <VCol>
    <VRow class="justify-space-between">
      <VCol cols="4" sm="6" md="2">
        <VBtn
          class="mr-1"
          color="warning"
          @click="
            () => {
              reportRef.handlePrint();
            }
          "
        >
          <VIcon start icon="tabler-printer" />
          {{ $t("Print") }}
        </VBtn>
      </VCol>
      <!-- <VCol cols="8" sm="6" md="10" lg="10">
        <VRow class="justify-end">
          <VCol cols="12" sm="12" md="4" lg="3">
            <AppDateTimePicker v-model="filter.start_date">
              <template #label>{{ $t("Date") }}</template>
            </AppDateTimePicker>
          </VCol>
        </VRow>
      </VCol> -->
    </VRow>
  </VCol>
  <VDivider class="mb-3" />
  <VCol>
    <VRow class="justify-center">
      <h3>របាយការណ៍ ចំណេញ/ខាត</h3>
    </VRow>
  </VCol>
  <VDivider class="mt-3" />
  <AppCard
    ref="reportRef"
    title="Profit And Loss"
    is-print
    is-filter
    title-icon="tabler-file-analytics"
    :loading="isLoading"
    border="border-0"
    :is-header="false"
  >
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
          របាយការណ៍ ចំណេញ ខាត
        </span>
      </div>
    </template>
    <span
      style="color: #000000; font-family: moul, sans-serif !important"
    ></span>
    <template #footerPrint>
      <div></div>
    </template>

    <div class="d-flex flex-row justify-space-between">
      <h4 class="section-header text-start print-header">
        {{ items.selected_branch }}
      </h4>
      <h4 class="date-header text-end print-header">
        {{ items.selected_date }}
      </h4>
    </div>
    <VTable class="text-no-wrap custom-header">
      <tbody>
        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <td class="text-start font-weight-bold" style="font-size: 13px">
            ចំណូល - Revenue
          </td>

          <td
            class="font-weight-bold text-center"
            v-for="item in items.months_khmer"
          >
            {{ item }}
          </td>
          <td class="font-weight-bold text-center">{{ items.this_year }}</td>
        </tr>

        <tr v-for="income in items.incomes" :key="income.chart_account_code">
          <!-- Column for the account name -->
          <td>
            <!-- {{ income.chart_account_code }}&nbsp;
            {{ income.chart_account_name_kh }} -->
            <div class="d-flex flex-row align-start">
              <div class="d-flex flex-row">
                <span>{{ income.chart_account_code }}</span>
              </div>
              &nbsp;&nbsp;
              <div class="d-flex flex-column">
                <span style="font-size: 14px" class="print-text-span">{{
                  income.chart_account_name_kh
                }}</span>
                <span style="font-size: 13px" class="print-text-span">{{
                  income.chart_account_name_en
                }}</span>
              </div>
            </div>
          </td>

          <!-- 2. Now loop through the 'monthly_amounts' for the current income object -->
          <td
            v-for="amount in income.monthly_amounts"
            :key="amount"
            class="text-end"
          >
            {{ formatNoneZero(amount) }}
          </td>

          <!-- Column for the row total -->
          <td class="text-end">
            {{ formatNoneZero(income.total) }}
          </td>
        </tr>

        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.05)"
        >
          <td class="text-start font-weight-bold" style="font-size: 13px">
            ចំណូលសរុប - TOTAL REVENUE
          </td>
          <td
            class="font-weight-bold text-end"
            v-for="item in items.summary?.income_per_month"
            :key="item"
          >
            {{ formatNoneZero(item, items.currency) }}
          </td>
          <td class="font-weight-bold text-end">
            {{
              formatNoneZero(items?.summary?.grand_total_income, items.currency)
            }}
          </td>
        </tr>

        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <td
            class="text-start font-weight-bold"
            style="font-size: 13px"
            colspan="14"
          >
            ចំណាយ - Expense
          </td>
        </tr>
        <tr v-for="expense in items.expenses" :key="expense.chart_account_code">
          <!-- Column for the account name -->
          <td>
            <div class="d-flex flex-row align-start">
              <div class="d-flex flex-row">
                <span>{{ expense.chart_account_code }}</span>
              </div>
              &nbsp;&nbsp;
              <div class="d-flex flex-column">
                <span style="font-size: 14px" class="print-text-span">{{
                  expense.chart_account_name_kh
                }}</span>
                <span style="font-size: 13px" class="print-text-span">{{
                  expense.chart_account_name_en
                }}</span>
              </div>
            </div>
          </td>

          <!-- 2. Now loop through the 'monthly_amounts' for the current expense object -->
          <td
            v-for="amount in expense.monthly_amounts"
            :key="amount"
            class="text-end"
          >
            {{ formatNoneZero(amount) }}
          </td>

          <!-- Column for the row total -->
          <td class="text-end">
            {{ formatNoneZero(expense.total) }}
          </td>
        </tr>

        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.05)"
        >
          <td class="text-start font-weight-bold" style="font-size: 13px">
            ចំណាយសរុប - TOTAL EXPENSES
          </td>
          <td
            class="font-weight-bold text-end"
            v-for="item in items.summary?.expense_per_month"
            :key="item"
          >
            {{ formatNoneZero(item, items.currency) }}
          </td>
          <td class="font-weight-bold text-end">
            {{
              formatNoneZero(
                items?.summary?.grand_total_expense,
                items.currency,
              )
            }}
          </td>
        </tr>

        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.3)"
        >
          <td class="text-start font-weight-bold" style="font-size: 13px">
            ប្រាក់ចំណេញសុទ្ធ - NET PROFIT
          </td>
          <td
            class="font-weight-bold text-end"
            v-for="item in items.summary?.pnl_per_month"
            :key="item"
          >
            {{ formatNoneZero(item, items.currency) }}
          </td>
          <td class="font-weight-bold text-end">
            {{
              formatNoneZero(
                items?.summary?.grand_total_profit_and_loss,
                items.currency,
              )
            }}
          </td>
        </tr>
      </tbody>
    </VTable>
    <VDivider />
  </AppCard>
</template>

<style scoped>
@page {
  size: A4 landscape !important;
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
  border-right: 1px solid #dddddd;
}

/* Print-specific styles */
@media print {
  .printDiv {
    display: block;
  }
  .print-header {
    font-size: 13px;
  }
  .v-table td,
  .v-table th {
    padding: 2px;
    height: 30px !important;
    color: black;
    font-size: 13px;
  }
  /* Remove all margins and padding from the body, card, and table */

  .date-header {
    color: red !important;
  }
  .section-header {
    color: black;
  }
}
</style>
