<script setup>
import { useTheme } from "vuetify";
import { hexToRgb } from "@layouts/utils";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import formatCurrency from "@/utils/formater/formatCurrency";
import * as XLSX from "xlsx";
import { useSettingStore } from "@/stores/settingStore";
import { watch } from "vue";
// import { set } from "vue-demi";
import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";
import themes from "@/plugins/vuetify/theme";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";

const vuetifyTheme = useTheme();

const themeColor = themes.light;
const refVueApexChart = ref();
const { t } = useI18n();
const currentMonthIndex = new Date().getMonth();

const currentYear = new Date().getFullYear();
const selectedYear = ref(currentYear);

const items = ref({
  income: [],
  expense: [],
  profit: [],
});

const chartConfig = computed(() => {
  const currentTheme = vuetifyTheme.current.value.colors;
  const variableTheme = vuetifyTheme.current.value.variables;

  const legendColor = `rgba(${hexToRgb(currentTheme["on-background"])},${
    variableTheme["high-emphasis-opacity"]
  })`;
  const borderColor = `rgba(${hexToRgb(
    String(variableTheme["border-color"]),
  )},${variableTheme["border-opacity"]})`;
  const labelColor = `rgba(${hexToRgb(currentTheme["on-surface"])},${
    variableTheme["disabled-opacity"]
  })`;

  // Generate colors for x-axis labels (highlight current month)
  const generateLabelColors = () => {
    const colors = [];
    for (let i = 0; i < 12; i++) {
      if (i === currentMonthIndex) {
        colors.push(`rgba(${hexToRgb(currentTheme["primary"])}, 1)`); // Highlight current month
      } else {
        colors.push(labelColor); // Default color for other months
      }
    }
    return colors;
  };

  const showLabel = [
    "មករា",
    "កុម្ភៈ",
    "មីនា",
    "មេសា",
    "ឧសភា",
    "មិថុនា",
    "កក្កដា",
    "សីហា",
    "កញ្ញា",
    "តុលា",
    "វិច្ឆិកា",
    "ធ្នូ",
  ];

  const labelColors = generateLabelColors();

  return {
    chart: {
      type: "line",
      stacked: false,
      parentHeightOffset: 0,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    colors: [
      `rgba(${hexToRgb(currentTheme.success)}, 1)`, // Color for income line
      `rgba(${hexToRgb(currentTheme.error)}, 1)`, // Color for expense line
      `rgba(${hexToRgb(currentTheme["primary"])}, 1)`, // Color for expense line
    ],
    stroke: {
      curve: "smooth",
      width: [0, 0, 4],
      lineCap: "round",
      colors: [
        "transparent", // Income bar
        "transparent", // Expense bar
        `rgba(${hexToRgb(currentTheme.primary)}, 1)`, // Profit line color
      ],
    },
    markers: {
      size: 5,
      colors: "#fff",
      strokeColors: [
        "transparent", // Income bar - no markers
        "transparent", // Expense bar - no markers
        `rgba(${hexToRgb(currentTheme["primary"])}, 1)`, // Profit line -['primary'] color border
      ],

      hover: { size: 6 },
      borderRadius: 4,
    },
    dataLabels: {
      enabled: false,
      formatter(val) {
        return parseFloat(val) == 0 ? "" : `${formatCurrency(val / 1000000)} M`;
      },
      offsetY: -10,
      style: {
        fontSize: "13px",
        colors: [legendColor],
        fontWeight: "600",
        fontFamily: "notosans",
        rotate: -90,
      },
    },
    legend: {
      show: true, // Show legend to distinguish lines
      position: "top",
      horizontalAlign: "left",
      fontSize: "14px",
      fontFamily: "notosans",
      markers: {
        width: 8,
        height: 8,
        offsetX: -3,
      },
    },
    tooltip: {
      enabled: true,
      shared: true, // Show both values in tooltip
      intersect: false,
      y: {
        formatter(val) {
          return `${formatCurrency(val / 1000000)} M`;
        },
      },

      style: {
        fontSize: "13px",
        fontFamily: "notosans",
      },
    },
    xaxis: {
      categories: showLabel,
      axisBorder: {
        show: true,
        color: borderColor,
      },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: labelColors, // Use the generated colors array to highlight current month
          fontSize: "13px",
          fontFamily: "notosans",
        },
      },
    },
    yaxis: {
      labels: {
        offsetX: -15,
        formatter(val) {
          return `${formatCurrency(val / 1000000)} M`;
        },
        style: {
          fontSize: "13px",
          colors: labelColor,
          fontFamily: "notosans",
        },
      },
    },
    grid: {
      show: true,
      borderColor: borderColor,
      strokeDashArray: 3,
      padding: {
        top: 0,
        bottom: 0,
        left: -10,
      },
    },
    // In your chartConfig computed property, update the responsive section:

    responsive: [
      {
        breakpoint: 1441,
        options: {
          xaxis: {
            labels: {
              style: {
                colors: labelColors,
                fontSize: "12px",
              },
            },
          },
          dataLabels: {
            show: false,
            style: {
              rotate: -90, // Add rotation for medium screens
            },
          },
        },
      },
      {
        breakpoint: 590, // Small screens
        options: {
          dataLabels: {
            enabled: false,
            formatter(val) {
              return parseFloat(val) == 0
                ? ""
                : `${formatCurrency(val / 1000000)} M`;
            },
            offsetY: -5, // Adjust offset for better positioning when rotated
            offsetX: 0, // You might need to adjust this too
            style: {
              fontSize: "10px",
              fontWeight: "400",
              rotate: -90, // This rotates the dataset values 90 degrees
              colors: [legendColor],
              fontFamily: "notosans",
            },
          },
          grid: {
            padding: {
              right: 0,
              left: -10,
              top: 15, // Add more top padding to accommodate rotated labels
            },
          },
          xaxis: {
            labels: {
              rotate: -90,
              rotateAlways: true,
              style: {
                colors: labelColors,
                fontSize: "10px",
              },
            },
          },
          yaxis: {
            labels: {
              offsetX: -15,
              formatter(val) {
                return `${formatCurrency(val / 1000000)} M`;
              },
              style: {
                fontSize: "10px",
                colors: labelColor,
                fontFamily: "notosans",
              },
            },
          },
        },
      },
    ],
  };
});

// Combined series for both lines
// const chartSeries = computed(() => [
//   {
//     name: t("income"),
//     data: items.value.income || [],
//     type: "column",
//   },
//   {
//     name: t("expense"),
//     data: items.value.expense || [],
//     type: "column",
//   },
// ]);

const chartSeries = computed(() => {
  const colors = vuetifyTheme.current.value.colors;
  const rgba = (hex, a) => `rgba(${hexToRgb(hex)}, ${a})`;

  const months = [
    "មករា",
    "កុម្ភៈ",
    "មីនា",
    "មេសា",
    "ឧសភា",
    "មិថុនា",
    "កក្កដា",
    "សីហា",
    "កញ្ញា",
    "តុលា",
    "វិច្ឆិកា",
    "ធ្នូ",
  ];

  const makeSeriesData = (arr, baseHex) =>
    months.map((m, i) => {
      const y = (arr && arr[i]) ?? 0;
      const alpha = i === currentMonthIndex ? 1 : 0.5;
      return {
        x: m,
        y,
        fillColor: rgba(baseHex, alpha),
        strokeColor: rgba(baseHex, alpha),
      };
    });

  const makeSeriesDataProfit = (arr, baseHex) =>
    months.map((m, i) => {
      const y = (arr && arr[i]) ?? 0;
      const alpha = i === currentMonthIndex ? 1 : 0.5;
      return {
        x: m,
        y,
      };
    });

  return [
    {
      name: t("Income"),
      data: makeSeriesData(items.value.income, colors.success),
      type: "bar",
    },
    {
      name: t("Expense"),
      data: makeSeriesData(items.value.expense, colors.error),
      type: "bar",
    },
    {
      name: t("Profit Loss"),
      data: makeSeriesDataProfit(items.value.profit, colors["primary"]),
      type: "line",
      showInLegend: false, // Hide from legend
    },
  ];
});

// Download functions
const downloadCSV = () => {
  const months = [
    "មករា",
    "កុម្ភៈ",
    "មីនា",
    "មេសា",
    "ឧសភា",
    "មិថុនា",
    "កក្កដា",
    "សីហា",
    "កញ្ញា",
    "តុលា",
    "វិច្ឆិកា",
    "ធ្នូ",
  ];

  // Prepare data for CSV
  const csvData = [];

  // Add headers
  csvData.push(["Month", "income", "expense"]);

  // Add data rows
  for (let i = 0; i < 12; i++) {
    csvData.push([
      months[i],
      items.value.income ? items.value.income[i] || 0 : 0,
      items.value.expense ? items.value.expense[i] || 0 : 0,
      items.value.profit ? items.value.profit[i] || 0 : 0,
    ]);
  }

  // Convert to CSV string
  const csvContent = csvData.map((row) => row.join(",")).join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `loans_dashboard_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const downloadExcel = () => {
  const months = [
    "មករា",
    "កុម្ភៈ",
    "មីនា",
    "មេសា",
    "ឧសភា",
    "មិថុនា",
    "កក្កដា",
    "សីហា",
    "កញ្ញា",
    "តុលា",
    "វិច្ឆិកា",
    "ធ្នូ",
  ];

  // Prepare data for Excel
  const excelData = [];

  // Add headers
  excelData.push(["Month", "income", "expense", "profit"]);

  // Add data rows
  for (let i = 0; i < 12; i++) {
    excelData.push([
      months[i],
      items.value.income ? items.value.income[i] || 0 : 0,
      items.value.expense ? items.value.expense[i] || 0 : 0,
      items.value.profit ? items.value.profit[i] || 0 : 0,
    ]);
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(excelData);

  // Set column widths
  ws["!cols"] = [
    { width: 15 }, // Month column
    { width: 20 }, // income column
    { width: 20 }, // expense column
    { width: 20 }, // expense column
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Loans Dashboard");

  // Save file
  XLSX.writeFile(
    wb,
    `loans_dashboard_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

const settingStore = useSettingStore();

const getData = async () => {
  const res = await api.post("accounting-dashboard-income-expense-profit", {
    year: selectedYear.value,
  });
  if (res.data.status) {
    items.value = res.data.data;
  }
};
onMounted(async () => {
  getData();
});

watch(
  () => settingStore.branch_id,
  (n, o) => {
    getData();
  },
);

watch(selectedYear, (n, o) => {
  getData();
});

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, i) => currentYear - i);
});
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard :title="$t('Profit Loss')">
        <template #append>
          <div class="d-flex gap-2">
            <VBtn
              icon
              size="small"
              color="success"
              variant="text"
              @click="downloadExcel"
            >
              <VIcon icon="tabler-file-spreadsheet" />
              <VTooltip activator="parent" location="top">
                Download Excel
              </VTooltip>
            </VBtn>
          </div>
          <div class="ml-2">
            <AppSelect
              v-model="selectedYear"
              :items="yearOptions"
              :label="$t('Year')"
              variant="outlined"
              hide-details
            />
          </div>
        </template>
        <VCardText>
          <VueApexCharts
            ref="refVueApexChart"
            :options="chartConfig"
            :series="chartSeries"
            height="350"
            class="mt-3"
          />
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
