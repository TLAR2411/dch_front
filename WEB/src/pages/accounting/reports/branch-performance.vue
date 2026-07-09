<script setup>
import MianLogo from "@images/logo/main-logo-1.svg?url";
import { auth } from "@/utils/auth";

definePage({
  meta: {
    title: "Branch Performance",
    layout: "default",
    subject: "Auth",
    navActiveLink: "reports",
  },
});

const filter = ref({
  start_date: new Date().toISOString().substr(0, 10),
  // end_date: new Date().toISOString().substr(0, 10),
});
const items = ref({});
</script>

<template>
  <AppCard
    title="Branch Performance"
    title-icon="tabler-file-analytics"
    is-print
    is-filter
    show-filters
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
              {{ $t("Date") }}
            </template>
          </AppDateTimePicker>
        </VCol>
        <!-- <VCol cols="12" sm="6" md="4" lg="3">
          <AppDateTimePicker v-model="filter.end_date">
            <template #label>
              {{ $t("End Date") }}
            </template>
          </AppDateTimePicker>
        </VCol> -->
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
          របាយការណ៍ លទ្ធផលប្រតិបត្តិការសាខា
        </span>
      </div>
      <div class="d-flex flex-row justify-space-between mb-2">
        <div style="color: black; font-size: 12px">
          {{ items.selected_branch }}
        </div>
        <div style="color: red; font-size: 12px">{{ items.selected_date }}</div>
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
          <span style="margin-top: 90px">{{ auth()?.user?.name_kh }}</span>
        </div>
      </div>
    </template>

    <VTable class="text-no-wrap">
      <tbody>
        <tr class="cell-main">
          <td colspan="3">I. សកម្មភាពហិរញ្ញវត្ថុស្នូល</td>
        </tr>
        <tr>
          <td></td>
          <td class="text-start">ប្រាក់ទម្លាក់ទុន</td>
          <td class="text-end">0</td>
        </tr>
        <tr>
          <td></td>
          <td class="text-start">ប្រាក់ប្រមូល</td>
          <td class="text-end">0</td>
        </tr>
        <tr class="cell-main">
          <td colspan="3">II. សេចក្តីសង្ខេបពីប្រាក់ចំណេញ</td>
        </tr>
        <tr>
          <td></td>
          <td class="text-start">ចំណូល</td>
          <td class="text-end">0</td>
        </tr>
        <tr>
          <td></td>
          <td class="text-start">ចំណាយ</td>
          <td class="text-end">0</td>
        </tr>
        <tr>
          <td style="background-color: rgba(211, 211, 211, 0.2)"></td>
          <td
            class="text-start"
            style="background-color: rgba(211, 211, 211, 0.2)"
          >
            ប្រាក់ចំណេញ/ខាត
          </td>
          <td class="text-end footer-cell">0</td>
        </tr>
        <tr class="cell-main">
          <td colspan="3">III. ស្ថានភាពសាច់ប្រាក់</td>
        </tr>
        <tr>
          <td></td>
          <td class="text-start">សរុបប្រាក់នៅក្នុងដៃ</td>
          <td class="text-end">0</td>
        </tr>
        <tr>
          <td></td>
          <td class="text-start">សរុបប្រាក់ក្នុងធនាគារ</td>
          <td class="text-end">0</td>
        </tr>
        <tr>
          <td style="background-color: rgba(211, 211, 211, 0.2)"></td>
          <td
            class="text-start"
            style="background-color: rgba(211, 211, 211, 0.2)"
          >
            សរុបសមតុល្យប្រាក់
          </td>
          <td class="text-end footer-cell">0</td>
        </tr>
      </tbody>
    </VTable>
  </AppCard>
</template>
<style scoped>
.cell-main {
  font-weight: 600;
  background-color: rgb(var(--v-theme-primary), 0.2);
}

.footer-cell {
  font-weight: 600;
  background-color: rgb(var(--v-theme-primary), 0.1);
}

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
  /* Remove all margins and padding from the body, card, and table */

  .date-header {
    color: red !important;
  }
  .section-header {
    color: black;
  }
}
</style>
