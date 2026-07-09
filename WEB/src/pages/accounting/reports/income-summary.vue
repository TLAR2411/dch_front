<script setup>
import { api } from "@/utils/api.js";
import AppCard from "@/components/AppCard.vue";
import AppDateTimePicker from "@core/components/app-form-elements/AppDateTimePicker.vue";
import { useSettingStore } from "@/stores/settingStore.js";

definePage({
  meta: {
    title: "Income Summary",
    layout: "default",
    subject: "Auth",
    navActiveLink: "reports",
  },
});

const isLoading = ref(true);
const items = ref([]);
const options = ref([]);

const filter = ref({
  start_date: new Date(),
});

const initData = async () => {
  try {
    isLoading.value = true;

    const res = await api.post("balance-sheet-summary-reports", {
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
</script>

<template>
  <AppCard
    title="Balance Sheet"
    is-print
    is-filter
    title-icon="tabler-file-analytics"
    :loading="isLoading"
  >
    <template #filter>
      <VRow class="justify-end">
        <!----Filter Input-->
        <VCol cols="12" sm="6" md="2">
          <AppDateTimePicker v-model="filter.start_date">
            <template #label>Date</template>
          </AppDateTimePicker>
        </VCol>
      </VRow>
    </template>

    <template #headerPrint>
      <h4 class="text-center mt-5" style="color: #000000">
        {{ $t("Balance Sheet Reports") }}
      </h4>
    </template>

    <template #footerPrint>
      <div></div>
    </template>
    <div class="d-flex flex-row justify-space-between">
      <h4 class="section-header text-start">{{ items.selected_branch }}</h4>
      <h4 class="date-header text-end">{{ items.selected_date }}</h4>
    </div>
    <VTable>
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
            ទ្រព្យ - Assets
          </td>
        </tr>
        <template v-if="items?.asset?.length > 0">
          <tr v-for="item in items.asset" :key="item.chart_account_code">
            <td class="text-start">{{ item.chart_account_code }}</td>
            <td class="text-start">
              {{ item.chart_account_name_kh }} -
              {{ item.chart_account_name_en }}
            </td>
            <td class="text-end">{{ formatAmount(item.total_amount) }}</td>
          </tr>

          <tr class="section-header font-weight-bold">
            <td class="text-end" colspan="2">{{ $t("Total Asset") }}</td>
            <td
              class="text-end"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
            >
              {{ formatAmount(items.total_asset) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="3" class="text-center">No assets found</td>
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
            បំណុល - Liabilities
          </td>
        </tr>

        <template v-if="items?.liabilities?.length > 0">
          <tr v-for="item in items.liabilities" :key="item.chart_account_code">
            <td class="text-start">{{ item.chart_account_code }}</td>
            <td class="text-start">
              {{ item.chart_account_name_kh }} -
              {{ item.chart_account_name_en }}
            </td>
            <td class="text-end">{{ formatAmount(item.total_amount) }}</td>
          </tr>

          <tr class="section-header font-weight-bold">
            <td class="text-end" colspan="2">
              {{ $t("Total Liabilities") }}
            </td>
            <td
              class="text-end"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
            >
              {{ formatAmount(items.total_liabilities) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="3" class="text-center">No liabilities found</td>
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
            ដើមទុន - Equity
          </td>
        </tr>

        <template v-if="items?.equity?.length > 0">
          <tr v-for="item in items.equity" :key="item.chart_account_code">
            <td class="text-start">{{ item.chart_account_code }}</td>
            <td class="text-start">
              {{ item.chart_account_name_kh }} -
              {{ item.chart_account_name_en }}
            </td>
            <td class="text-end">{{ formatAmount(item.total_amount) }}</td>
          </tr>

          <tr class="section-header font-weight-bold">
            <td class="text-end" colspan="2">{{ $t("Total Equity") }}</td>
            <td
              class="text-end"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
            >
              {{ formatAmount(items.total_equity) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="3" class="text-center">No equity found</td>
        </tr>

        <tr
          class="section-header font-weight-bold"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <td class="text-end" colspan="2">
            {{ $t("Total Liabilities and Equity") }}
          </td>
          <td class="text-end">
            {{ formatAmount(items.total_LEP) }}
          </td>
        </tr>
      </tbody>
    </VTable>
  </AppCard>
</template>

<style scoped>
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

  /* Remove all margins and padding from the body, card, and table */
  body,
  .v-card,
  .striped-table,
  .v-table {
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    color: black !important;
  }

  .v-table .v-table__wrapper > table > tbody > tr:not(:last-child) > td,
  .v-table .v-table__wrapper > table > tbody > tr:not(:last-child) > th {
    border-bottom: none !important;
  }

  /* Set smaller font size for compactness (e.g., 10px or 11px) */
  .v-table td,
  .v-table th,
  .font-weight-bold {
    height: 25px !important;
    font-size: 10px !important; /* Adjusted to 10px for compactness, match screenshot */
  }
  /* Style section headers for print with smaller font and fallback background */
  .section-header {
    /* background-color: #f5f5f5 !important; /* Light gray fallback for print */
    font-size: 10px !important;
    padding: 2px !important; /* Reduced padding for compactness */
    color: black !important;
  }

  .date-header {
    /* background-color: #f5f5f5 !important; /* Light gray fallback for print */
    font-size: 10px !important;
    padding: 2px !important; /* Reduced padding for compactness */
    color: red !important;
  }
}
</style>
