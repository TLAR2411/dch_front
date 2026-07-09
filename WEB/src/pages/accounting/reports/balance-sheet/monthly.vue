<script setup>
import { api } from "@/utils/api.js";
import AppCard from "@/components/AppCard.vue";
import AppDateTimePicker from "@core/components/app-form-elements/AppDateTimePicker.vue";
import { useSettingStore } from "@/stores/settingStore.js";
import MianLogo from "@images/logo/main-logo-1.svg?url";
import moment from "moment-timezone";
import formatCurrency from "@/utils/formater/formatCurrency";
import formatNoneZero from "@/utils/formater/formatNoneZero";

definePage({
  meta: {
    title: "Balance Sheet",
    layout: "default",
    subject: "Auth",
    navActiveLink: "reports",
  },
});

const isLoading = ref(true);
const items = ref([]);
const options = ref([]);
const reportRef = ref(null);

const filter = ref({
  start_date: moment()
    .tz("Asia/Phnom_Penh")
    .format("YYYY-MM-DDTHH:mm:ss.SSS+07:00"),
});

const initData = async () => {
  try {
    isLoading.value = true;

    const res = await api.post("balance-sheet-monthly-reports", {
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
      <VCol cols="6" sm="6" md="2">
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
    </VRow>
  </VCol>
  <VDivider class="mb-3" />
  <VCol>
    <VRow class="justify-center">
      <h3>របាយការណ៍ តារាងតុល្យការ</h3>
    </VRow>
  </VCol>
  <VDivider class="mt-3" />
  <AppCard
    ref="reportRef"
    title="Balance Sheet"
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
          របាយការណ៍ តារាងតុល្យការ
        </span>
      </div>
    </template>
    <span
      style="color: #000000; font-family: moul, sans-serif !important"
    ></span>
    <!-- <h3
      class="text-center mt-1 moul"
      style="color: #000000; font-family: moul, sans-serif !important"
    >
      របាយការណ៍ តារាងតុល្យការ
    </h3> -->
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
    <VTable class="text-no-wrap">
      <tbody>
        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <td class="text-start font-weight-bold" style="font-size: 13px">
            ទ្រព្យ - Assets
          </td>
          <td
            class="font-weight-bold text-center"
            v-for="item in items.months_khmer"
          >
            {{ item }}
          </td>
          <td class="font-weight-bold text-center">{{ items.year }}</td>
        </tr>
        <template v-if="items?.asset?.length > 0">
          <tr v-for="item in items.asset" :key="item.chart_account_code">
            <td class="text-start">
              <div class="d-flex flex-row align-start">
                <div class="d-flex flex-row">
                  <span>{{ item.chart_account_code }}</span>
                </div>
                &nbsp;&nbsp;
                <div class="d-flex flex-column">
                  <span style="font-size: 14px">{{
                    item.chart_account_name_kh
                  }}</span>
                  <span style="font-size: 12px">{{
                    item.chart_account_name_en
                  }}</span>
                </div>
              </div>
            </td>
            <td
              class="text-end"
              v-for="amount in item.monthly_amounts"
              :key="amount"
            >
              {{ formatNoneZero(amount) }}
            </td>
            <td class="text-end">
              {{ formatNoneZero(item?.total) }}
            </td>
          </tr>

          <tr
            class="section-header font-weight-bold"
            style="background-color: rgb(var(--v-theme-primary), 0.05)"
          >
            <td class="text-end">{{ $t("Total Asset") }}</td>
            <td
              class="font-weight-bold text-end"
              v-for="item in items.total_asset_per_month"
              :key="item"
            >
              {{ formatNoneZero(item, items.currency) }}
            </td>
            <td class="font-weight-bold text-end">
              {{ formatNoneZero(items?.grand_total_asset, items.currency) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="14" class="text-center">{{ $t("No assets found") }}</td>
        </tr>

        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <td
            colspan="14"
            class="text-start font-weight-bold"
            style="font-size: 13px"
          >
            បំណុល - Liabilities
          </td>
        </tr>
        <template v-if="items?.liabilities?.length > 0">
          <tr v-for="item in items.liabilities" :key="item.chart_account_code">
            <td class="text-start">
              <div class="d-flex flex-row align-start">
                <div class="d-flex flex-row">
                  <span>{{ item.chart_account_code }}</span>
                </div>
                &nbsp;&nbsp;
                <div class="d-flex flex-column">
                  <span style="font-size: 14px">{{
                    item.chart_account_name_kh
                  }}</span>
                  <span style="font-size: 12px">{{
                    item.chart_account_name_en
                  }}</span>
                </div>
              </div>
            </td>
            <td
              class="text-end"
              v-for="amount in item.monthly_amounts"
              :key="amount"
            >
              {{ formatNoneZero(amount) }}
            </td>
            <td class="text-end">
              {{ formatNoneZero(item?.total) }}
            </td>
          </tr>

          <tr
            class="section-header font-weight-bold"
            style="background-color: rgb(var(--v-theme-primary), 0.05)"
          >
            <td class="text-end">{{ $t("Total Liabilities") }}</td>
            <td
              class="font-weight-bold text-end"
              v-for="item in items.total_liabilities_per_month"
              :key="item"
            >
              {{ formatNoneZero(item, items.currency) }}
            </td>
            <td class="font-weight-bold text-end">
              {{
                formatNoneZero(items?.grand_total_liabilities, items.currency)
              }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="14" class="text-center">
            {{ $t("No liabilities found") }}
          </td>
        </tr>

        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <td
            colspan="14"
            class="text-start font-weight-bold"
            style="font-size: 13px"
          >
            ដើមទុន - Equity
          </td>
        </tr>

        <template v-if="items?.equity?.length > 0">
          <tr v-for="item in items.equity" :key="item.chart_account_code">
            <td class="text-start">
              <div class="d-flex flex-row align-start">
                <div class="d-flex flex-row">
                  <span>{{ item.chart_account_code }}</span>
                </div>
                &nbsp;&nbsp;
                <div class="d-flex flex-column">
                  <span style="font-size: 14px" class="print-text-span">{{
                    item.chart_account_name_kh
                  }}</span>
                  <span style="font-size: 12px" class="print-text-span">{{
                    item.chart_account_name_en
                  }}</span>
                </div>
              </div>
            </td>
            <td
              class="text-end"
              v-for="amount in item.monthly_amounts"
              :key="amount"
            >
              {{ formatNoneZero(amount) }}
            </td>
            <td class="text-end">
              {{ formatNoneZero(item?.total) }}
            </td>
          </tr>

          <tr
            class="section-header font-weight-bold"
            style="background-color: rgb(var(--v-theme-primary), 0.05)"
          >
            <td class="text-end">{{ $t("Total Liabilities") }}</td>
            <td
              class="font-weight-bold text-end"
              v-for="item in items.total_equity_per_month"
              :key="item"
            >
              {{ formatNoneZero(item, items.currency) }}
            </td>
            <td class="font-weight-bold text-end">
              {{ formatNoneZero(items?.grand_total_equity, items.currency) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="14" class="text-center">{{ $t("No equity found") }}</td>
        </tr>

        <tr
          class="section-header font-weight-bold"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <td class="text-end">
            {{ $t("Total Liabilities and Equity") }}
          </td>
          <td
            class="font-weight-bold text-end"
            v-for="item in items.total_LEP_per_month"
            :key="item"
          >
            {{ formatNoneZero(item, items.currency) }}
          </td>
          <td class="font-weight-bold text-end">
            {{ formatNoneZero(items?.grand_total_LEP, items.currency) }}
          </td>
        </tr>
      </tbody>
    </VTable>
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

/* Print-specific styles */
@media print {
  /* h3 {
    font-family: moul, sans-serif !important;
  } */
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

  .print-text-span {
    font-size: 11px !important;
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
