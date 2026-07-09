<script setup>
import { api } from "@/utils/api.js";
import AppCard from "@/components/AppCard.vue";
import AppDateTimePicker from "@core/components/app-form-elements/AppDateTimePicker.vue";
import { useSettingStore } from "@/stores/settingStore.js";
import MianLogo from "@images/logo/main-logo-1.svg?url";
import moment from "moment-timezone";
import formatNoneZero from "@/utils/formater/formatNoneZero";
import { auth } from "@/utils/auth";
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
  start_date: moment.utc().startOf("month").toISOString(),
  end_date: moment()
    .tz("Asia/Phnom_Penh")
    .format("YYYY-MM-DDTHH:mm:ss.SSS+07:00"),
});

const initData = async () => {
  try {
    isLoading.value = true;

    const res = await api.post("profit-and-loss-summary-reports", {
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
      <VCol cols="8" sm="6" md="10" lg="10">
        <VRow class="justify-end">
          <!----Filter Input-->
          <VCol cols="6" lg="2">
            <AppDateTimePicker
              v-model="filter.start_date"
              :config="{
                allowInput: true,
              }"
              autocomplete="off"
              prepend-inner-icon="tabler-calendar-due"
            >
              <template #label>{{ $t("Start Date") }}</template>
            </AppDateTimePicker>
          </VCol>
          <VCol cols="6" lg="2">
            <AppDateTimePicker
              v-model="filter.end_date"
              :config="{
                allowInput: true,
              }"
              autocomplete="off"
              prepend-inner-icon="tabler-calendar-due"
            >
              <template #label>{{ $t("End Date") }}</template>
            </AppDateTimePicker>
          </VCol>
        </VRow>
      </VCol>
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
      <div
        class="d-flex flex-row justify-space-between mt-6 mr-4 section-header"
      >
        <div
          class="d-flex flex-column text-center"
          style="
            margin-top: 80px;
            margin-left: 80px;
            color: black;
            font-size: 13px;
          "
        >
          <span>ត្រួតពិនិត្យដោយ</span>
          <span style="margin-top: 90px">.................</span>
        </div>
        <div
          class="d-flex flex-column text-center"
          style="margin-right: 30px; font-size: 13px"
        >
          <span>{{ items.selected_date }}</span>
          <span>រៀបចំដោយ</span>
          <span style="margin-top: 90px">{{ auth().user.name_kh }}</span>
        </div>
      </div>
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
          <td
            colspan="3"
            class="text-start font-weight-bold"
            style="font-size: 13px"
          >
            ចំណូល - Revenue
          </td>
        </tr>
        <template v-if="items?.incomes?.length > 0">
          <tr v-for="item in items.incomes" :key="item.chart_account_code">
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
                  <span style="font-size: 13px" class="print-text-span">{{
                    item.chart_account_name_en
                  }}</span>
                </div>
              </div>
            </td>
            <td class="text-start"></td>
            <td class="text-end">
              {{ formatNoneZero(item.total_amount) }}
            </td>
          </tr>

          <tr class="section-header font-weight-bold">
            <td class="text-end" colspan="2">{{ $t("Total Income") }}</td>
            <td
              class="text-end"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
            >
              {{ formatNoneZero(items.total_income, currency.show) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="3" class="text-center">{{ $t("No revenue found") }}</td>
        </tr>

        <tr
          class="section-header"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <td
            colspan="3"
            class="text-start font-weight-bold"
            style="font-size: 13px"
          >
            ចំណាយ - Expense
          </td>
        </tr>

        <template v-if="items?.expenses?.length > 0">
          <tr v-for="item in items.expenses" :key="item.chart_account_code">
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
                  <span style="font-size: 13px" class="print-text-span">{{
                    item.chart_account_name_en
                  }}</span>
                </div>
              </div>
            </td>
            <td class="text-start"></td>
            <td class="text-end">
              {{ formatNoneZero(item.total_amount) }}
            </td>
          </tr>

          <tr class="section-header font-weight-bold">
            <td class="text-end" colspan="2">{{ $t("Total Expense") }}</td>
            <td
              class="text-end"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
            >
              {{ formatNoneZero(items.total_expense, currency.show) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="3" class="text-center">{{ $t("No expense found") }}</td>
        </tr>

        <tr
          class="section-header font-weight-bold"
          style="
            background-color: rgb(var(--v-theme-primary), 0.2);
            font-size: 16px;
          "
        >
          <td class="text-end" colspan="2">
            {{ $t("Profit And Loss") }}
          </td>
          <td class="text-end">
            {{ formatNoneZero(items.total_profit_and_loss, currency.show) }}
          </td>
        </tr>
      </tbody>
    </VTable>
  </AppCard>
</template>

<style scoped>
@page {
  size: A4 !important;
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
