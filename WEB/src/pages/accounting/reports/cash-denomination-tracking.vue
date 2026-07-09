<script setup>
import { api } from "@/utils/api.js";
import AppCard from "@/components/AppCard.vue";
import AppDateTimePicker from "@core/components/app-form-elements/AppDateTimePicker.vue";
import { useSettingStore } from "@/stores/settingStore.js";
import { getCurrencies } from "@/services/dataService";
import MianLogo from "@images/logo/main-logo-1.svg?url";
import formatNoneZero from "@/utils/formater/formatNoneZero";
import { auth } from "@/utils/auth";
import formatCurrency from "@/utils/formater/formatCurrency";

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
const currency = ref({});

const filter = ref({
  start_date: new Date(),
});

const initData = async () => {
  try {
    isLoading.value = true;

    const res = await api.post("cash-denomination-tracking-reports", {
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
    title="Cash Denomination Tracking"
    is-print
    is-filter
    show-filters
    title-icon="tabler-cash"
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
          របាយការណ៍ កំណត់ត្រាសាច់ប្រាក់ប្រចាំថ្ងៃ
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
    <VRow>
      <VCol cols="6">
        <VTable
          class="text-no-wrap custom-header flex-grow-1 custom-table-fixed border-e-sm border-s-sm"
        >
          <tbody>
            <tr
              class="section-header font-weight-bold"
              style="
                background-color: rgb(var(--v-theme-primary), 0.2);
                font-size: 16px;
              "
            >
              <td style="width: 100px" class="border-e-sm text-center">
                សាច់ប្រាក់
              </td>
              <td class="text-center" style="width: 100px">ចំនួន</td>
              <td class="text-end" style="width: 100px">សរុប</td>
            </tr>
            <template
              v-if="
                items?.cash_denomination?.[0]?.cash_denomination_types?.length >
                0
              "
            >
              <tr
                v-for="(item, idx) in items?.cash_denomination?.[0]
                  ?.cash_denomination_types"
              >
                <td class="text-center">{{ formatCurrency(item.value) }}</td>
                <td class="text-center">
                  {{ formatNoneZero(item.total_value) }}
                </td>
                <td class="text-end">
                  {{ formatNoneZero(item.value * item.total_value) }}
                </td>
              </tr>
            </template>

            <tr v-else>
              <td colspan="3" class="text-center">
                {{ $t("No record found") }}
              </td>
            </tr>

            <tr
              class="section-header font-weight-bold"
              style="
                background-color: rgb(var(--v-theme-primary), 0.2);
                font-size: 16px;
              "
            >
              <td class="text-center" colspan="2">សាច់ប្រាក់សរុប</td>
              <td
                class="text-end balance-amount"
                style="
                  background-color: rgb(var(--v-theme-primary), 0.2);
                  font-size: 16px;
                  width: 100px;
                "
              >
                {{ formatNoneZero(items?.cash_denomination?.[0]?.cash_amount) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCol>
      <VCol cols="6" class="ml-0 pl-0">
        <VTable
          class="text-no-wrap custom-header flex-grow-1 custom-table-fixed border-e-sm border-s-sm"
          style=""
        >
          <tbody>
            <!----header-->
            <tr
              class="section-header font-weight-bold"
              style="
                background-color: rgb(var(--v-theme-primary), 0.2);
                font-size: 16px;
              "
            >
              <!-- <td style="width: 25px !important" class="text-start">ល.រ</td> -->
              <td class="text-start">បរិយាយ</td>
              <td class="text-end">សរុប</td>
            </tr>
            <!----body-->
            <tr>
              <!-- <td style="width: 25px" class="text-center">1</td> -->
              <td class="text-start">សាច់ប្រាក់ជាក់ស្ដែងក្នុងប្រព័ន្ធ</td>
              <td class="text-end">
                {{ formatNoneZero(items?.cash_denomination?.[0]?.cash_amount) }}
              </td>
            </tr>
            <tr>
              <!-- <td style="width: 25px" class="text-center">2</td> -->
              <td class="text-start">ប្រាក់ដែលបានបាត់</td>
              <td class="text-end">
                {{ formatNoneZero(items?.cash_lost) }}
              </td>
            </tr>
            <tr style="background-color: rgb(255, 250, 227)">
              <!-- <td style="width: 25px" class="text-center">3</td> -->
              <td class="text-start">សាច់ប្រាក់ជាក់ស្ដែងក្នុងសាខា</td>
              <td class="text-end">
                {{ formatNoneZero(items?.real_cash_branch) }}
              </td>
            </tr>
            <!----footer-->
            <tr
              class="section-header font-weight-bold"
              style="font-size: 16px"
              :style="[
                items?.cash_denomination?.[0]?.cash_amount +
                  items?.cash_lost -
                  items?.real_cash_branch <
                0
                  ? 'background-color: rgb(var(--v-theme-error), 0.2);'
                  : 'background-color: rgb(var(--v-theme-primary), 0.2);',
              ]"
            >
              <td class="text-center" colspan="1">លំអៀង</td>
              <td
                class="text-end balance-amount"
                style="font-size: 16px; width: 150px"
                :style="[
                  items?.cash_denomination?.[0]?.cash_amount +
                    items?.cash_lost -
                    items?.real_cash_branch <
                  0
                    ? 'background-color: rgb(var(--v-theme-error), 0.2);'
                    : 'background-color: rgb(var(--v-theme-primary), 0.2);',
                ]"
              >
                {{
                  formatNoneZero(
                    parseFloat(items?.cash_denomination?.[0]?.cash_amount) +
                      parseFloat(items?.cash_lost) -
                      parseFloat(items?.real_cash_branch),
                  )
                }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCol>
    </VRow>
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

/* Ensure the VTable container takes full height of the Column */
:deep(.custom-table-fixed) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Force the internal table element to fill the space */
:deep(.custom-table-fixed .v-table__wrapper) {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

:deep(.custom-table-fixed table) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Push tbody to fill space and keep the last row at the bottom */
:deep(.custom-table-fixed tbody) {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

/* This targets the specific 'Total' rows you created */
:deep(.custom-table-fixed tbody tr:last-child) {
  margin-top: auto;
  width: 100%;
  display: table; /* Maintains table cell alignment for the last row */
  table-layout: fixed;
}

/* Ensure standard rows still look like table rows */
:deep(.custom-table-fixed tbody tr:not(:last-child)) {
  display: table;
  width: 100%;
  table-layout: fixed;
}
</style>
