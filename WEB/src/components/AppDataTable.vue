<script setup>
import { debounce, sortBy } from "lodash";
import {
  computed,
  ref,
  watch,
  onMounted,
  onUnmounted,
  useAttrs,
  useId,
} from "vue";
import * as XLSX from "xlsx"; // Add XLSX import
import setTableState from "@/utils/datatable/setTableState";
import getTableState from "@/utils/datatable/getTableState";
import { api } from "@/utils/api";
import hasPermission from "@/utils/hasPermission.js";
import { useI18n } from "vue-i18n";
import { useSettingStore } from "@/stores/settingStore";
import { useDialog } from "@/composable/useDialog";
import { auth } from "@/utils/auth";
import {
  useRowActions,
  dataTableProps,
  dataTableEmits,
  getButtonColor,
  getButtonTitle,
  getButtonIcon,
} from "@/composable/useRowActions";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";
import { useYearStore } from "@/stores/yearStore";

const { showDialog } = useDialog();
const DEBOUNCE_DELAY = 300;
const props = defineProps({
  ...dataTableProps,
  title: { type: String, default: "DataTable" },
  headers: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  showSelect: { type: Boolean, default: false },

  hideHeader: { type: [Boolean, Number], default: false },
  hideFooter: { type: [Boolean, Number], default: false },
  limit: { type: Number, default: 15 },
  sortBy: { type: Array, default: () => [] },
  mobileViews: { type: Boolean, default: false },
  mobileWidth: { type: Number, default: 678 },
  isHover: { type: Boolean, default: true },
  isPagination: { type: Boolean, default: true },
  disableSort: { type: Boolean, default: true },
  isExcel: { type: Boolean, default: false },
  saveState: { type: Boolean, default: false },
  apiUrl: { type: String, default: null },
  apiData: { type: Object, default: () => ({}) },
  filters: { type: Object, default: () => ({}) },
  repsonce: { type: Object, default: () => ({}) },
  transformData: {
    type: Function,
    required: false,
    default: null,
  },
});

const internalLoading = ref(false);
const { t } = useI18n();
const loading = computed(() => props.loading);
const isMobile = ref(window.innerWidth < props.mobileWidth);
const updateSize = () => {
  isMobile.value = window.innerWidth < props.mobileWidth;
};

const elementId = computed(() => {
  const attrs = useAttrs();
  const _elementIdToken = attrs.id;
  const _id = useId();

  return _elementIdToken ? `app-datatable-${_elementIdToken}` : _id;
});

// const options = computed(() => props.options);
const savedOptions = props.saveState ? getTableState(props.apiUrl) : null;
const options = ref(
  savedOptions || { page: 1, limit: props.limit, sortBy: props.sortBy },
);
const filters = ref(savedOptions?.filter || { ...(props?.filters || []) });

const emit = defineEmits([
  ...dataTableEmits,
  "update:response",
  "exportToExcel",
  "update:loading",
  "update:filters",
]);

const dataItems = ref([]);

watch(
  () => props.loading,
  (newVal) => {
    if (newVal !== undefined) {
      internalLoading.value = newVal; // Respect external loading
    }
  },
);

const calculateLength = (total, limit) => {
  if (!total || !limit) return 0;
  return Math.ceil(total / limit);
};

const initData = async (item) => {
  internalLoading.value = true;
  emit("update:loading", true);
  try {
    if (props.apiUrl != null) {
      const res = await api.post(props.apiUrl, {
        ...props.apiData,
        page: options.value.page,
        sort: options.value.sortBy,
        limit: options.value.limit,
        filter: filters?.value || [],
      });

      emit("update:response", res.data);
      console.log(res.data);

      // Apply the transformation if provided
      let items = res.data.data.data;

      // Apply the transformation if provided
      if (props.transformData) {
        items = props.transformData(items);
      }

      dataItems.value = {
        data: items,
        links: res.data.data.links,
        meta: res.data.data.meta,
      };
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    internalLoading.value = false;
    emit("update:loading", false);
  }
};

onMounted(() => {
  emit("update:filters", filters.value);
  initData();
});
onUnmounted(() => window.removeEventListener("resize", updateSize));

const normalizePermissionFlags = (raw) => raw;

const { actionButtons } = useRowActions(emit, normalizePermissionFlags(props), {
  t,
  showDialog,
  debounce,
  DEBOUNCE_DELAY,
});

const getButtonBackgroundClass = (button, item) => `${button.color}-bg`;

const getValue = (item, key) => {
  const keys = key.split(".");
  let value = item;
  for (const k of keys) {
    value = value ? value[k] : null;
  }
  return value || "";
};

// Ref for the hidden table
const dataTableRef = ref(null);

// Export to Excel function
const exportToExcel = () => {
  const tableElement = dataTableRef.value;
  if (!tableElement) {
    console.warn(
      "Table element not found. Check if the hidden table is rendered.",
    );
    return;
  }

  const worksheet = XLSX.utils.table_to_sheet(tableElement);
  const workbook = XLSX.utils.book_new();

  // Auto-adjust column widths
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const colWidths = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    let maxWidth = 10; // Default minimum width

    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];

      if (cell && cell.v) {
        const textLength = String(cell.v).length;
        maxWidth = Math.max(maxWidth, textLength + 2); // Add padding
      }
    }
    colWidths.push({ wch: maxWidth });
  }

  worksheet["!cols"] = colWidths; // Apply column widths

  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${props.title}.xlsx`); // Customize filename if needed
};

const reload = debounce(() => initData(), 500);

defineExpose({
  reload,
  exportToExcel,
});

watch(
  filters.value,
  debounce(() => {
    options.value.page = 1;
    initData();
    if (props.apiUrl && props.saveState) {
      setTableState(
        props.apiUrl,
        {
          page: options.value.page,
          sort: options.value.sortBy,
          limit: options.value.limit,
          filter: filters?.value || [],
        },
        30,
      );
    }
  }, 500),
);

watch(
  () => ({
    page: options.value.page,
    sort: options.value.sortBy,
    limit: options.value.limit,
    branchId: useSettingStore().branch_id,
    YearId: useYearStore().year_id,
  }),
  (newVal, oldVal) => {
    if (
      newVal.page !== oldVal.page ||
      newVal.limit !== oldVal.limit ||
      newVal.sortBy !== oldVal.sortBy ||
      newVal.branchId !== oldVal.branchId ||
      newVal.YearId !== oldVal.YearId
    ) {
      if (props.apiUrl && props.saveState) {
        setTableState(
          props.apiUrl,
          {
            page: options.value.page,
            sort: options.value.sortBy,
            limit: options.value.limit,
            filter: filters?.value || [],
          },
          30,
        );
      }
      initData();
    }
  },
);
</script>

<template>
  <div class="table-wrapper">
    <VRow>
      <VDataTableServer
        v-bind="{
          ...$attrs,
          class: null,
          label: undefined,
          id: elementId,
        }"
        :headers="headers"
        :items="dataItems?.data || []"
        :items-per-page="options.limit"
        :items-length="dataItems?.data?.length || 0"
        :page="options.page"
        :sort-by="options.sortBy"
        :sort-desc="options.sortDesc"
        :show-select="showSelect"
        :options="options"
        :hide-default-header="hideHeader"
        :hide-default-footer="hideFooter"
        :loading="internalLoading"
        :mobile="isMobile && mobileViews"
        :hover="isHover"
        :disable-sort="disableSort"
        class="text-no-wrap custom-header custom-datatable"
        expand-on-click
        fixed-header
        :height="height != null ? height : ''"
        virtual-rows
        :ripple="false"
      >
        <template #no-data>
          <div class="no-data-container text-center py-4">
            <VIcon
              icon="tabler-info-circle"
              size="48"
              color="warning"
              class="mb-2"
            />
            <p class="text-medium-emphasis" style="font-size: 14px">
              {{ $t("No Records Found") }}
            </p>
            <p class="text-disabled" style="font-size: 13px">
              {{ $t("Try adjusting your search or check back later.") }}
            </p>
          </div>
        </template>

        <template
          v-for="(slotName, index) in Object.keys($slots)"
          :key="index"
          v-slot:[slotName]="slotProps"
        >
          <slot :name="slotName" v-bind="slotProps"></slot>
        </template>

        <template #item.actions="{ item }">
          <template v-for="(button, index) in actionButtons" :key="index">
            <VBtn
              rounded
              :icon="getButtonIcon(button, item)"
              size="small"
              variant="text"
              :color="button.color"
              v-if="
                button.btn &&
                button.show &&
                (!button.permission || hasPermission(button.permission)) &&
                (!button.condition || button.condition(item))
              "
              @click="() => button.action(item)"
            >
              <VIcon :icon="getButtonIcon(button, item)" />
              <VTooltip open-delay="500" location="top" activator="parent">
                <span>{{ $t(button.title) }}</span>
              </VTooltip>
            </VBtn>
          </template>

          <IconBtn
            rounded
            v-if="
              isMoreAction &&
              (!isMoreActionCondition || isMoreActionCondition(item))
            "
            size="small"
          >
            <VIcon icon="tabler-dots-vertical" color="grey" size="small" />
            <VMenu activator="parent">
              <VList>
                <template v-for="(button, index) in actionButtons" :key="index">
                  <VListItem
                    v-if="
                      !button.btn &&
                      button.show &&
                      (!button.permission ||
                        hasPermission(button.permission)) &&
                      (!button.condition || button.condition(item))
                    "
                    @click="() => button.action(item)"
                    :class="[
                      getButtonBackgroundClass(button, item),
                      `text-${getButtonColor(button, item)}`,
                    ]"
                    style="display: flex; align-items: center; min-height: 30px"
                  >
                    <template #prepend>
                      <VIcon
                        :icon="getButtonIcon(button, item)"
                        style="margin-right: 1px"
                        size="20"
                      />
                    </template>
                    <span style="font-size: 13px">{{ $t(button.title) }}</span>
                  </VListItem>
                </template>
              </VList>
            </VMenu>
          </IconBtn>
        </template>
        <template #bottom>
          <div v-if="isPagination">
            <VDivider />
            <VCol>
              <VCardText style="padding: 0">
                <div
                  class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 align-center"
                >
                  <AppSelect
                    density="compact"
                    v-model="options.limit"
                    :items="[15, 25, 50, 100, 500, 10000]"
                    hide-details
                    style="
                      max-inline-size: 8rem;
                      min-inline-size: 5rem;
                      margin-right: 5px;
                    "
                  />

                  <div>
                    <span class="text-subtitle-2"
                      >Showing {{ dataItems?.meta?.from || 0 }} to
                      {{ dataItems?.meta?.to || 0 }} of
                      {{ dataItems?.meta?.total || 0 }} results</span
                    >
                  </div>
                  <!-- Add Export Button -->

                  <VPagination
                    v-model="options.page"
                    active-color="primary"
                    size="small"
                    :total-visible="$vuetify.display.smAndDown ? 3 : 5"
                    :length="
                      calculateLength(
                        dataItems?.meta?.total || 0,
                        options.limit,
                      )
                    "
                    @click.prevent
                  />
                </div>
              </VCardText>
            </VCol>
          </div>

          <slot name="footer"></slot>
        </template>

        <!--        <slot name="footer"></slot>-->
      </VDataTableServer>

      <!-- Hidden table for export -->
      <table ref="dataTableRef" style="display: none">
        <thead>
          <tr>
            <th v-for="header in headers" :key="header.key">
              {{ header.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in dataItems.data" :key="item.id || item.code">
            <td v-for="header in headers" :key="header.key">
              <slot :name="`item.${header.key}`" :item="item">
                {{
                  header.value ? header.value(item) : getValue(item, header.key)
                }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </VRow>
  </div>
</template>
<style scoped>
.custom-datatable :deep(.v-table__wrapper) {
  overflow-x: auto;
  overflow-y: auto;
}

/* Disable Y scroll when X is scrolling */
.custom-datatable :deep(.v-table__wrapper:hover) {
  overflow-y: auto;
}

/* Alternative: Use only one scroll at a time with JavaScript */
</style>
