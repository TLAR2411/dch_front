<script setup>
import { api } from "@/utils/api.js";
import AppCard from "@/components/AppCard.vue";
import AppDateTimePicker from "@core/components/app-form-elements/AppDateTimePicker.vue";
import { useSettingStore } from "@/stores/settingStore.js";
import { getCurrencies } from "@/services/dataService";
import MianLogo from "@images/logo/main-logo-1.svg?url";
import formatNoneZero from "@/utils/formater/formatNoneZero";
import { auth } from "@/utils/auth";

definePage({
  meta: {
    title: "Cash Flow",
    layout: "default",
    subject: "Auth",
    navActiveLink: "reports",
  },
});

const isLoading = ref(true);
const items = ref([]);
const options = ref([]);
const currency = ref({});

const filter = ref({
  start_date: new Date(),
});

const initData = async () => {
  try {
    isLoading.value = true;

    const res = await api.post("cash-flow-summary-reports", {
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
const balance = ref(0);

const runningBalancesHand = computed(() => {
  if (!items.value?.cash?.data?.length) return [];

  let currentBalance = parseFloat(items.value?.cash?.first_balance || 0);
  return items.value?.cash?.data.map((item) => {
    currentBalance += parseFloat(item.balance) || 0;
    return currentBalance;
  });
});

const runningBalancesBank = computed(() => {
  if (!items.value?.bank?.data?.length) return [];

  let currentBalance = parseFloat(items.value.bank?.first_balance || 0);
  return items.value?.bank?.data.map((item) => {
    currentBalance += parseFloat(item.balance) || 0;
    return currentBalance;
  });
});

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
    title="Cash Flow"
    is-print
    is-filter
    show-filters
    title-icon="tabler-file-analytics"
    :loading="isLoading"
    :is-back="false"
  >
    <template #filter>
      <VRow class="justify-end">
        <!----Filter Input-->
        <VCol cols="12" sm="6" md="2">
          <AppDateTimePicker
            v-model="filter.start_date"
            :config="{
              allowInput: true,
            }"
            autocomplete="off"
            prepend-inner-icon="tabler-calendar-due"
          >
            <template #label>{{ $t("Date") }}</template>
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
          របាយការណ៍ លំហូរសាច់ប្រាក់
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
      <h4 class="section-header text-start">{{ items.selected_branch }}</h4>
      <h4 class="date-header text-end">{{ items.selected_date }}</h4>
    </div>
    <VDivider class="mt-2" />
    <VTable class="text-no-wrap custom-header">
      <tbody>
        <tr
          class="section-header font-weight-bold"
          style="
            background-color: rgb(var(--v-theme-primary), 0.2);
            font-size: 16px;
          "
        >
          <td class="text-start" colspan="2">
            {{ items?.cash?.chart_account?.name_kh }}
          </td>
          <td class="text-end" colspan="2">
            {{ $t("First Balance") }}
          </td>
          <td
            class="text-end balance-amount"
            style="
              background-color: rgb(var(--v-theme-primary), 0.2);
              font-size: 16px;
              width: 135px;
            "
          >
            {{ formatNoneZero(items?.cash?.first_balance) }}&nbsp;{{
              currency.symbol
            }}
          </td>
        </tr>

        <tr
          class="section-header font-weight-bold"
          style="
            background-color: rgb(var(--v-theme-primary), 0.1);
            font-size: 16px;
          "
        >
          <td style="width: 10px">{{ $t("No") }}</td>
          <td>{{ $t("Description") }}</td>
          <td class="text-end" style="width: 100px">{{ $t("Debit") }}</td>
          <td class="text-end" style="width: 100px">{{ $t("Credit") }}</td>
          <td class="text-end">{{ $t("Balance") }}</td>
        </tr>

        <template v-if="items?.cash?.data?.length > 0">
          <tr v-for="(item, idx) in items?.cash?.data" :key="item.code">
            <td>{{ idx + 1 }}</td>
            <td
              :style="{
                'word-break': 'break-word',
                'white-space': 'normal',
              }"
            >
              <span>{{ item.description }}</span>
            </td>
            <td class="text-end">
              {{ formatNoneZero(item.debit) }}
            </td>
            <td class="text-end">
              {{ formatNoneZero(item.credit) }}
            </td>
            <td class="text-end">
              {{ formatNoneZero(runningBalancesHand[idx]) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="5" class="text-center">{{ $t("No record found") }}</td>
        </tr>

        <tr
          class="section-header font-weight-bold"
          style="
            background-color: rgb(var(--v-theme-primary), 0.2);
            font-size: 16px;
          "
        >
          <td class="text-end" colspan="4">
            {{ $t("Last Balance") }}
          </td>
          <td
            class="text-end balance-amount"
            style="
              background-color: rgb(var(--v-theme-primary), 0.2);
              font-size: 16px;
              width: 135px;
            "
          >
            {{ formatNoneZero(items?.cash?.last_balance) }}&nbsp;{{
              currency.symbol
            }}
          </td>
        </tr>
      </tbody>
    </VTable>

    <VTable class="text-no-wrap custom-header mt-2">
      <tbody>
        <tr
          class="section-header font-weight-bold"
          style="
            background-color: rgb(var(--v-theme-primary), 0.2);
            font-size: 16px;
          "
        >
          <td class="text-start" colspan="2">
            {{ items?.bank?.chart_account?.name_kh }}
          </td>
          <td class="text-end" colspan="2">
            {{ $t("First Balance") }}
          </td>
          <td
            class="text-end balance-amount"
            style="
              background-color: rgb(var(--v-theme-primary), 0.2);
              font-size: 16px;
              width: 135px;
            "
          >
            {{ formatNoneZero(items?.bank?.first_balance) }}&nbsp;{{
              currency.symbol
            }}
          </td>
        </tr>

        <tr
          class="section-header font-weight-bold"
          style="
            background-color: rgb(var(--v-theme-primary), 0.1);
            font-size: 16px;
          "
        >
          <td style="width: 10px">{{ $t("No") }}</td>
          <td>{{ $t("Description") }}</td>
          <td class="text-end" style="width: 100px">{{ $t("Debit") }}</td>
          <td class="text-end" style="width: 100px">{{ $t("Credit") }}</td>
          <td class="text-end">{{ $t("Balance") }}</td>
        </tr>

        <template v-if="items?.bank?.data?.length > 0">
          <tr v-for="(item, idx) in items?.bank?.data" :key="item.code">
            <td>{{ idx + 1 }}</td>
            <td
              :style="{
                'word-break': 'break-word',
                'white-space': 'normal',
              }"
            >
              <span>{{ item.description }}</span>
            </td>
            <td class="text-end">
              {{ formatNoneZero(item.debit) }}
            </td>
            <td class="text-end">
              {{ formatNoneZero(item.credit) }}
            </td>
            <td class="text-end">
              {{ formatNoneZero(runningBalancesBank[idx]) }}
            </td>
          </tr>
        </template>

        <tr v-else>
          <td colspan="5" class="text-center">{{ $t("No record found") }}</td>
        </tr>

        <tr
          class="section-header font-weight-bold"
          style="
            background-color: rgb(var(--v-theme-primary), 0.2);
            font-size: 16px;
          "
        >
          <td class="text-end" colspan="4">
            {{ $t("Last Balance") }}
          </td>
          <td
            class="text-end balance-amount"
            style="
              background-color: rgb(var(--v-theme-primary), 0.2);
              font-size: 16px;
              width: 135px;
            "
          >
            {{ formatNoneZero(items?.bank?.last_balance) }}&nbsp;{{
              currency.symbol
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
  size: A4 !important;
  margin: 0.5cm !important;
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

  .balance-amount {
    font-size: 13px !important;
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
    font-size: 13px;
  }
  .section-header {
    color: black;
    font-size: 13px;
  }
}
</style>
