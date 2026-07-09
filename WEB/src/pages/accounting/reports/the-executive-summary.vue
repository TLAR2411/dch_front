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
    title: "The Executive Summary",
    layout: "default",
    subject: "Auth",
    navActiveLink: "reports",
  },
});

const isLoading = ref(true);
const items = ref([]);
const options = ref([]);
const currency = ref({});
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const filter = ref({
  start_date: yesterday,
  end_date: new Date(),
});

const initData = async () => {
  try {
    isLoading.value = true;

    const res = await api.post("the-executive-summary-reports", {
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

const getFin = (item) => {
  if (!item.date) return {};
  const firstDateKey = Object.keys(item.date)[0];
  const data = item.date[firstDateKey];
  return {
    ...data,
    total_cash: (parseFloat(data.cash) || 0) + (parseFloat(data.bank) || 0),
  };
};

const getSortedDates = (item) => {
  if (!item.date) return [];
  const keys = Object.keys(item.date).sort((a, b) => new Date(a) - new Date(b));

  // If only one date exists in the object (because start/end are same)
  // we manually return an array with that key twice to force 2 rows in the template
  if (keys.length === 1) {
    return [keys[0], keys[0]];
  }

  return keys;
};

// Calculate the difference between two values
const getDiff = (newVal, oldVal) => {
  const n = parseFloat(newVal) || 0;
  const o = parseFloat(oldVal) || 0;
  return n - o;
};

// Helper to get color class based on growth/drop
const getStatusClass = (val) => {
  if (val > 0) return "text-success font-weight-bold"; // Green for growth
  if (val < 0) return "text-error font-weight-bold"; // Red for drop
  return "text-grey";
};

// Calculate Total Cash (Cash + Bank)
const calculateTotal = (data) => {
  return (parseFloat(data.cash) || 0) + (parseFloat(data.bank) || 0);
};

// Formatting helper for the date label (optional)
const formatDateLabel = (dateStr, index) => {
  return index === 0 ? "ថ្ងៃនេះ" : "ថ្ងៃមុន"; // "Today" vs "Previous Day"
};

// 1. Create a computed property to ensure list is an Array and Sorted by Region
const sortedList = computed(() => {
  if (!items.value?.list) return [];

  // Convert object to array if necessary
  const listArray = Array.isArray(items.value.list)
    ? items.value.list
    : Object.values(items.value.list);

  // Filter out items that don't meet your ">= 2 dates" requirement
  // (matches your template v-if)
  const validItems = listArray.filter(
    (item) => getSortedDates(item).length >= 2,
  );

  // Sort by Region ID
  return validItems.sort(
    (a, b) => (a.branch.region || 0) - (b.branch.region || 0),
  );
});

// 2. Calculate the Region Rowspan
// This counts: (Number of Dates + 1 Compare Row) for EVERY branch in this region
const getRegionSpan = (index) => {
  const currentItem = sortedList.value[index];
  const prevItem = sortedList.value[index - 1];

  // If this isn't the first branch of the region, hide the cell
  if (prevItem && prevItem.branch.region === currentItem.branch.region) {
    return 0;
  }

  // Calculate total rows for this region
  let totalSpan = 0;
  for (let i = index; i < sortedList.value.length; i++) {
    const item = sortedList.value[i];

    // Stop if we hit a different region
    if (item.branch.region !== currentItem.branch.region) break;

    // Add rows for this branch:
    // Dates count + 1 (for the "Compare/Summary" row at the bottom)
    const datesCount = getSortedDates(item).length;
    totalSpan += datesCount + 1;
  }

  return totalSpan;
};

// 3. Calculate Branch Rowspan (Dates + 1 Summary Row)
const getBranchSpan = (item) => {
  return getSortedDates(item).length + 1;
};
</script>

<template>
  <AppCard
    title="The Executive Summary"
    is-print
    is-filter
    show-filters
    title-icon="tabler-chart-bar"
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
        <VCol cols="12" sm="6" md="2">
          <AppDateTimePicker
            v-model="filter.end_date"
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
    <VDivider class="mt-2" />
    <VTable class="text-no-wrap custom-header">
      <thead>
        <tr>
          <th rowspan="2" class="border-e-sm border-s-sm">ភូមិភាគ</th>
          <th rowspan="2" class="border-e-sm">សាខា</th>
          <th rowspan="2" class="border-e-sm">ធៀបរវាងថ្ងៃ</th>
          <th colspan="2" class="text-center border-e-sm">
            ធៀបប្រមូល/ទំលាក់ទុន
          </th>
          <th colspan="3" class="text-center border-e-sm">ធៀបចំណេញ/ខាត</th>
          <th colspan="3" class="text-center border-e-sm">ធៀបសាច់ប្រាក់</th>
        </tr>
        <tr>
          <th class="border-e-sm text-center">ប្រមូល</th>
          <th class="border-e-sm text-center">ទំលាក់ទុន</th>
          <th class="border-e-sm text-center">ចំណូល</th>
          <th class="border-e-sm text-center">ចំណាយ</th>
          <th class="border-e-sm text-center">ចំណេញ/ខាត</th>
          <th class="border-e-sm text-center">លុយក្នុងដៃ</th>
          <th class="border-e-sm text-center">លុយក្នុងធនាគា</th>
          <th class="border-e-sm text-center">សរុបសាច់ប្រាក់</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="sortedList.length > 0">
          <template
            v-for="(item, itemIndex) in sortedList"
            :key="item.branch.id"
          >
            <tr
              v-for="(dateKey, dateIndex) in getSortedDates(item)"
              :key="dateKey"
            >
              <td
                v-if="dateIndex === 0 && getRegionSpan(itemIndex) > 0"
                :rowspan="getRegionSpan(itemIndex)"
                class="border-e-sm border-s-sm text-center font-weight-bold"
                style="
                  background-color: rgb(var(--v-theme-primary), 0.3);
                  vertical-align: middle;
                "
              >
                {{
                  item.branch.region === 0
                    ? "HQ"
                    : `ភូមិភាគទី ${item.branch.region}`
                }}
              </td>

              <td
                v-if="dateIndex === 0"
                :rowspan="getBranchSpan(item)"
                class="border-e-sm font-weight-bold"
                style="
                  background-color: rgb(var(--v-theme-primary), 0.2);
                  vertical-align: middle;
                "
              >
                {{ item.branch.name_kh }}
              </td>

              <td
                class="border-e-sm text-center"
                style="padding-left: 24px; background-color: #f0f4f8 !important"
              >
                {{ dateKey }}
              </td>

              <td class="border-e-sm text-right px-2">
                {{ formatNoneZero(item.date[dateKey]?.receive) }}
              </td>
              <td class="border-e-sm text-right px-2">
                {{ formatNoneZero(item.date[dateKey]?.loan) }}
              </td>
              <td class="border-e-sm text-right px-2">
                {{ formatNoneZero(item.date[dateKey]?.income) }}
              </td>
              <td class="border-e-sm text-right px-2">
                {{ formatNoneZero(item.date[dateKey]?.expense) }}
              </td>
              <td class="border-e-sm text-right px-2">
                {{
                  formatNoneZero(
                    item.date[dateKey]?.income - item.date[dateKey]?.expense,
                  )
                }}
              </td>
              <td class="border-e-sm text-right px-2">
                {{ formatNoneZero(item.date[dateKey]?.cash) }}
              </td>
              <td class="border-e-sm text-right px-2">
                {{ formatNoneZero(item.date[dateKey]?.bank) }}
              </td>
              <td class="border-e-sm text-right px-2">
                {{
                  formatNoneZero(
                    parseFloat(item.date[dateKey]?.cash) +
                      parseFloat(item.date[dateKey]?.bank),
                  )
                }}
              </td>
            </tr>

            <tr
              class="bg-light-variance font-weight-bold"
              style="background-color: rgb(var(--v-theme-primary), 0.1)"
            >
              <td class="border-e-sm text-center">កើន/ថយ</td>

              <td
                class="border-e-sm text-end"
                :style="getStatusClass(item?.compare?.loan)"
              >
                {{ formatNoneZero(item?.compare?.loan) }}
              </td>
              <td
                class="border-e-sm text-end"
                :style="getStatusClass(item?.compare?.receive)"
              >
                {{ formatNoneZero(item?.compare?.receive) }}
              </td>
              <td
                class="border-e-sm text-end"
                :style="getStatusClass(item?.compare?.income)"
              >
                {{ formatNoneZero(item?.compare?.income) }}
              </td>
              <td
                class="border-e-sm text-end"
                :style="getStatusClass(item?.compare?.expense)"
              >
                {{ formatNoneZero(item?.compare?.expense) }}
              </td>
              <td
                class="border-e-sm text-end"
                :style="getStatusClass(item?.compare?.profit_loss)"
              >
                {{ formatNoneZero(item?.compare?.profit_loss) }}
              </td>
              <td
                class="border-e-sm text-end"
                :style="getStatusClass(item?.compare?.cash)"
              >
                {{ formatNoneZero(item?.compare?.cash) }}
              </td>
              <td
                class="border-e-sm text-end"
                :style="getStatusClass(item?.compare?.bank)"
              >
                {{ formatNoneZero(item?.compare?.bank) }}
              </td>
              <td
                class="border-e-sm text-end"
                :style="getStatusClass(item?.compare?.total_amount)"
              >
                {{ formatNoneZero(item?.compare?.total_amount) }}
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </VTable>
    <VDivider />
  </AppCard>
</template>

<style scoped>
.bg-light-gray {
  background-color: #f8f9fa !important;
}
.custom-header th {
  background-color: #eee !important;
  /* font-family: "Khmer OS Battambang", sans-serif; */
  /* font-size: 12px; */
  font-weight: bold;
  text-align: center;
}

.text-primary {
  color: #1976d2 !important;
  font-weight: 600;
}

.bg-light-total {
  background-color: #f0f4f8 !important; /* Subtle blue-grey for totals */
}

.branch-separator td {
  height: 8px !important;
  background-color: #eeeeee !important;
  border: none !important;
}

/* Ensure borders look clean in print */
.border-e-sm {
  border-right: 1px solid #ddd !important;
}
.border-s-sm {
  border-left: 1px solid #ddd !important;
}
@page {
  size: A4 landscape !important;
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
    font-size: 12px !important;
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
