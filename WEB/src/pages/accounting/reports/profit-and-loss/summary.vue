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
import { regexValidator } from "@/@core/utils/validators";
import formatDate from "@/utils/formater/formatDate";

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

    const res = await api.post("profit-and-loss-by-branch-reports", {
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

const getRowSpan = (index) => {
  const list = items.value?.list || [];
  const currentItem = list[index];
  const prevItem = list[index - 1];

  // 1. If it's not the first row, and the region is the same as the previous row,
  // we return 0. This tells the template NOT to render this cell (hidden).
  if (index > 0 && prevItem && prevItem.region === currentItem.region) {
    return 0;
  }

  // 2. If it is the start of a new region, count how many rows share this region
  let span = 1;
  for (let i = index + 1; i < list.length; i++) {
    if (list[i].region === currentItem.region) {
      span++;
    } else {
      break;
    }
  }
  return span;
};
</script>

<template>
  <AppCard
    ref="reportRef"
    title="Summary Profit And Loss"
    is-print
    is-filter
    title-icon="tabler-file-analytics"
    :loading="isLoading"
    showFilters
  >
    <template #filter>
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
          របាយការណ៍ សង្ខេបចំណេញ ខាត
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

    <div class="d-flex flex-row justify-space-between mb-2">
      <h4 class="section-header text-start print-header">
        {{ items.selected_branch }}
      </h4>
      <div class="d-flex flex-column text-end">
        <h4 class="date-header text-end print-header" style="color: red">
          ចាប់ពីថ្ងៃទី&nbsp;&nbsp;{{ formatDate(items.start_date) }}
        </h4>
        <h4 class="date-header text-end print-header" style="color: red">
          រហូតដល់ថ្ងៃទី&nbsp;&nbsp;{{ formatDate(items.end_date) }}
        </h4>
      </div>
    </div>
    <VTable class="text-no-wrap">
      <tbody>
        <tr
          class="section-header font-weight-bold"
          style="background-color: rgb(var(--v-theme-primary), 0.2)"
        >
          <!-- <td style="width: 10px">ល.រ</td> -->
          <td>ភូមិភាគ</td>
          <td>សាខា</td>
          <td class="text-end">ចំណូលសរុប</td>
          <td class="text-end">ចំណាយសរុប</td>
          <td class="text-end">ចំណេញ/ខាតសរុប</td>
        </tr>
        <template v-if="items?.list?.length > 0">
          <tr v-for="(item, index) in items.list" :key="item.branch_name">
            <td
              v-if="getRowSpan(index) > 0"
              :rowspan="getRowSpan(index)"
              class="text-center border-s-sm"
              style="
                vertical-align: middle;
                border-right: 1px solid
                  rgba(var(--v-border-color), var(--v-border-opacity));
              "
            >
              {{ item.region > 0 ? `ភូមិភាគទី ${item.region}` : "HQ" }}
            </td>

            <td class="pl-6">{{ item.branch_name }}</td>
            <td class="text-end">{{ formatNoneZero(item.income) }}</td>
            <td class="text-end">{{ formatNoneZero(item.expense) }}</td>
            <td
              class="text-end border-e-sm"
              :style="[
                item.income - item.expense < 0 ? 'color:red' : 'color:green',
              ]"
            >
              {{ formatNoneZero(item.income - item.expense) }}
            </td>
          </tr>

          <tr class="section-header font-weight-bold">
            <td
              class="text-end"
              colspan="2"
              style="background-color: rgb(var(--v-theme-primary), 0.3)"
            >
              {{ $t("Total") }}
            </td>
            <td
              class="text-end"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
            >
              {{ formatNoneZero(items.total_income, currency.show) }}
            </td>
            <td
              class="text-end"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
            >
              {{ formatNoneZero(items.total_expense, currency.show) }}
            </td>
            <td
              class="text-end"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
              :style="[items.profit_loss < 0 ? 'color:red' : 'color:green']"
            >
              {{ formatNoneZero(items.profit_loss, currency.show) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="5" class="text-center">{{ $t("No revenue found") }}</td>
        </tr>
      </tbody>
    </VTable>
  </AppCard>
</template>

<style scoped>
@page {
  size: A4 portrait !important;
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
    height: 25px !important;
    color: black;
    font-size: 12px;
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
