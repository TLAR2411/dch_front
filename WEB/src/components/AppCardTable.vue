<script setup>
import { debounce } from "lodash";
import {
  computed,
  ref,
  watch,
  onMounted,
  useAttrs,
  useId,
  nextTick,
} from "vue";
import * as XLSX from "xlsx";
import setTableState from "@/utils/datatable/setTableState";
import getTableState from "@/utils/datatable/getTableState";
import { api } from "@/utils/api";
import hasPermission from "@/utils/hasPermission.js";
import { useI18n } from "vue-i18n";
import { useSettingStore } from "@/stores/settingStore";
import { useDialog } from "@/composable/useDialog";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import moment from "moment-timezone";
import { usePartStore } from "@/stores/partStore";
const partStore = usePartStore();
import {
  useRowActions,
  dataTableProps,
  dataTableEmits,
  getButtonColor,
  getButtonTitle,
  getButtonIcon,
  checkPermission,
} from "@/composable/useRowActions";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";
import { useYearStore } from "@/stores/yearStore";

const DEBOUNCE_DELAY = 300;
const { showDialog } = useDialog();
const router = useRouter();
const { mdAndUp, name: displayBreakpoint } = useDisplay();

const props = defineProps({
  ...dataTableProps,
  isReload: Boolean,
  canCreate: String,
  isBack: Boolean,

  createPage: String,
  createDialog: Boolean,
  isDialogCreateVisible: Boolean,
  isHeader: { type: Boolean, default: true },
  isTitle: { type: Boolean, default: true },
  title: { type: String, default: "DataTable" },
  titleIcon: { type: String, default: "tabler-code" },
  headers: { type: Array, default: () => [] },
  items: { type: Array, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  loading: Boolean,
  isCheckBranch: Boolean,
  hideHeader: Boolean,
  hideFooter: Boolean,
  isToggleColumn: { type: Boolean, default: true },
  limit: { type: Number, default: 25 },
  isHover: { type: Boolean, default: true },
  isPagination: { type: Boolean, default: true },
  disableSort: { type: Boolean, default: true },
  isExcel: Boolean,
  saveState: Boolean,
  isFilter: Boolean,
  repsonce: { type: Object, default: () => ({}) },
  showFilters: Boolean,
  isFullHeight: { type: Boolean, default: true },
  isFullHeightTab: Boolean,
  apiUrl: String,
  apiData: { type: Object, default: () => ({}) },
  filters: { type: Object, default: () => ({}) },
  border: { type: String, default: "border" },
  transformData: { type: Function, required: false, default: null },
  selectedItemHeader: { type: Object, default: () => ({}) },
  saveHeaderName: String,
  saveStateLeftName: String,
  saveStateName: String,
  variant: { type: String, default: "tonal" },
  showExpand: { type: Boolean, default: false },
  expandByDefault: { type: Boolean, default: false },
  itemValue: { type: String, default: "id" },
  isFixedColumnRight: { type: Boolean, default: true },
  enableMobileCard: { type: Boolean, default: false },
  mobileBreakpoint: { type: String, default: "xs" },
  isDeleteSelected: { type: Boolean, default: false },
  isImportHoliday: { type: Boolean, default: false },
});

const internalLoading = ref(false);
const { t } = useI18n();
const settingStore = useSettingStore();

const elementId = computed(() => {
  const attrs = useAttrs();
  const _elementIdToken = attrs.id;
  const _id = useId();
  return _elementIdToken ? `app-datatable-${_elementIdToken}` : _id;
});
const expandedRows = ref([]); // For desktop
const mobileExpanded = ref([]); // For mobile toggles

const toggleMobileRow = (id) => {
  if (mobileExpanded.value.includes(id)) {
    mobileExpanded.value = mobileExpanded.value.filter((item) => item !== id);
  } else {
    mobileExpanded.value.push(id);
  }
};

const savedOptions = props.saveState
  ? getTableState(props.saveStateName)
  : null;
const options = ref(savedOptions || { page: 1, limit: props.limit });
const filters = ref(savedOptions?.filter || { ...(props?.filters || []) });
const showFilters = ref(
  savedOptions?.showFilter || (props?.showFilters ? [0] : []),
);
const headerVisible = ref(savedOptions?.showHeader || props.isHeader);
const rightLog = ref();
const isFilterOpen = ref(
  Array.isArray(showFilters.value)
    ? showFilters.value.includes(0)
    : !!showFilters.value,
);
const renderFilterContent = ref(isFilterOpen.value);

const toggleFilters = async () => {
  const open = !isFilterOpen.value;
  isFilterOpen.value = open;
  if (open) {
    renderFilterContent.value = true;
    await nextTick();
  }
  showFilters.value = open ? [0] : [];
  saveState();
};

const saveState = () => {
  if (props.saveStateName && props.saveState) {
    setTableState(
      props.saveStateName,
      {
        page: options.value.page,
        limit: options.value.limit,
        filter: filters?.value || [],
        showFilter: showFilters?.value || [],
        showHeader: headerVisible.value,
      },
      30,
    );
  }
};

const emit = defineEmits([
  ...dataTableEmits,
  "update:isDialogCreateVisible",
  "on-delete-selected",
  "on-import-holiday",
  "exportToExcel",
  "update:response",
  "update:loading",
  "update:filters",
  "update:headerCount",
]);

const normalizePermissionFlags = (raw) => raw;
const { actionButtons } = useRowActions(emit, normalizePermissionFlags(props), {
  t,
  showDialog,
  debounce,
  DEBOUNCE_DELAY,
});

const dataItems = ref([]);
watch(
  () => props.loading,
  (n) => {
    if (n !== undefined) internalLoading.value = n;
  },
);

const calculateLength = (total, limit) => {
  if (!total || !limit) return 0;
  return Math.ceil(total / limit);
};

const isMobileView = computed(() => {
  if (!props.enableMobileCard) return false;
  const breakpoints = ["xs", "sm", "md", "lg", "xl", "xxl"];
  const currentIdx = breakpoints.indexOf(displayBreakpoint.value);
  const targetIdx = breakpoints.indexOf(props.mobileBreakpoint);
  return currentIdx <= targetIdx;
});

const getValue = (item, key) => {
  const keys = key.split(".");
  let value = item;
  for (const k of keys) {
    value = value ? value[k] : null;
  }
  return value || "";
};

const getRenderValue = (item, header) => {
  if (typeof header.value === "function") return header.value(item);
  if (typeof header.value === "string") return getValue(item, header.value);
  return getValue(item, header.key);
};

const mobileHeaders = computed(() => {
  const visible = headers.value.filter(
    (h) => h.key !== "actions" && h.visible !== false,
  );
  return {
    first: visible[0] || null,
    second: visible[1] || null,
    others: visible.slice(2) || [],
  };
});

const initData = async (item) => {
  internalLoading.value = true;
  emit("update:loading", true);
  if (props.expandByDefault) expandedRows.value = [];
  try {
    if (props.apiUrl != null) {
      const res = await api.post(props.apiUrl, {
        ...props.apiData,
        page: options.value.page,
        limit: options.value.limit === -1 ? 999999 : options.value.limit,
        filter: filters?.value || [],
      });
      emit("update:response", res.data);
      let items = res.data.data.data;
      if (props.transformData) items = props.transformData(items);
      dataItems.value = {
        data: items,
        links: res.data.data.links,
        meta: res.data.data.meta,
      };
      if (props.expandByDefault)
        expandedRows.value = dataItems.value.data.map(
          (item) => item[props.itemValue],
        );
    } else {
      let items = Array.isArray(props.items) ? [...props.items] : [];
      if (props.transformData) items = props.transformData(items);
      dataItems.value = {
        data: items,
        meta: { total: items.length },
        total: items.length,
      };
      if (props.expandByDefault)
        expandedRows.value = dataItems.value.data.map(
          (item) => item[props.itemValue],
        );
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    internalLoading.value = false;
    emit("update:loading", false);
  }
};

onMounted(() => {
  emit("update:filters", filters.value || {});
  initData();
});

const getButtonBackgroundClass = (button, item) => `${button.color}-bg`;
const dataTableRef = ref(null);

const exportToExcel = () => {
  const rows = (dataItems.value?.data || []).map((item) => {
    const row = {};
    exportHeaders.value.forEach((header) => {
      const title = header.title;
      let val = header.exportValue
        ? header.exportValue(item)
        : header.value && typeof header.value === "function"
          ? header.value(item)
          : getValue(item, header.key);
      if (typeof val === "string" && /^[\d,]+(\.\d+)?$/.test(val))
        val = val.replace(/,/g, "");
      if (!isNaN(val) && val !== "") val = Number(val);
      row[title] = val == null ? "" : val;
    });
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  const keys = Object.keys(rows[0] || {});
  ws["!cols"] = keys.map((k) => {
    const max = Math.max(
      k.length,
      ...rows.map((r) => (r[k] ? String(r[k]).length : 0)),
    );
    return { wch: Math.min(Math.max(max + 2, 10), 60) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(
    wb,
    `Excel-${useSettingStore().branch_symbol}-${moment().format(
      "YYYY-MM-DD HH:mm:ss",
    )}.xlsx`,
  );
};

watch(
  () => filters.value,
  debounce(() => {
    options.value.page = 1;
    saveState();
    initData();
  }, DEBOUNCE_DELAY),
  { deep: true },
);
watch(
  () => props.items,
  () => {
    if (props.apiUrl != null) return;
    initData();
  },
  { deep: true },
);
watch(
  () => ({
    page: options.value.page,
    branchId: settingStore.branch_id,
    limit: options.value.limit,
    yearId: useYearStore().year_id,
  }),
  (n, o) => {
    if (
      n.page !== o.page ||
      n.limit !== o.limit ||
      n.branchId !== o.branchId ||
      n.yearId !== o.yearId
    ) {
      saveState();
      initData();
    }

    // if (
    //   n.page !== o.page ||
    //   n.limit !== o.limit ||
    //   n.branchId !== o.branchId ||
    //   n.curId !== o.curId
    // ) {
    //   options.value.page = 1; // reset to first page for the new part
    //   saveState();
    //   initData();
    // }
  },
);

const savedHeader = props.saveState
  ? getTableState(props.saveHeaderName)
  : null;
function mergeSavedHeaders(original, saved) {
  return original.map((origCol) => {
    const savedCol = saved?.find((h) => h.key === origCol.key);
    return savedCol ? { ...origCol, ...savedCol } : origCol;
  });
}
const headers = ref(mergeSavedHeaders(props.headers, savedHeader));
const visibleHeaders = computed(() =>
  headers?.value.filter((h) => h.visible !== false),
);
const menu = ref(false);

watch(
  headers,
  (n) => {
    const cleanHeaders = headers.value.map(({ value, ...rest }) => ({
      ...rest,
    }));
    setTableState(
      props.saveHeaderName,
      cleanHeaders,
      1000 * 60 * 60 * 24 * 365,
    );
  },
  { deep: true },
);

function create() {
  if (props?.createPage) router.push({ name: props.createPage });
  else if (props?.createDialog)
    emit("update:isDialogCreateVisible", !props.isDialogCreateVisible);
}

const onBack = () => router.back();
const exportHeaders = computed(() =>
  headers.value.filter((header) => !header.excludeFromExport),
);
watch(headerVisible, (n, o) => saveState());
const reload = debounce(() => initData(), 500);
defineExpose({ reload, exportToExcel });
</script>

<template>
  <div :class="isFullHeightTab ? 'list-tab-height' : 'h-100 pb-4'">
    <VLayout
      class="app-card-layout"
      style="z-index: 0"
      :class="[isFullHeight ? 'h-100' : '', border]"
    >
      <VMain class="chat-content-container">
        <div class="d-flex flex-column" :class="[isFullHeight ? 'h-100' : '']">
          <template v-if="isHeader">
            <VCardItem
              v-slot:title
              style="
                padding: 0.5rem;
                background-color: rgba(211, 211, 211, 0.2);
              "
            >
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  height: 38px;
                  gap: 1rem;
                "
              >
                <h5 v-if="isTitle">
                  <div class="d-flex align-center text-primary">
                    <VAvatar
                      :icon="titleIcon"
                      rounded
                      color="primary"
                      variant="tonal"
                    />
                    <VCardTitle class="ml-2 text-primary"
                      ><span class="text-primary">{{
                        $t(title)
                      }}</span></VCardTitle
                    >
                  </div>
                </h5>
                <div
                  class="w-100 d-flex justify-end align-center scrollable-actions"
                >
                  <slot name="card-header"></slot>
                  <IconBtn
                    rounded
                    size="30"
                    class="mr-1"
                    @click.prevent="onBack"
                    ><VIcon icon="tabler-arrow-left" size="20"
                  /></IconBtn>

                  <IconBtn
                    rounded
                    size="30"
                    class="mr-1"
                    v-if="isDeleteSelected"
                    @click.prevent="emit('on-delete-selected')"
                  >
                    <VIcon icon="tabler-trash" size="20" />
                    <VTooltip
                      open-delay="500"
                      location="top"
                      activator="parent"
                    >
                      <span>{{ $t("Delete Selected") }}</span>
                    </VTooltip>
                  </IconBtn>

                  <IconBtn
                    rounded
                    size="30"
                    class="mr-1"
                    v-if="isImportHoliday"
                    @click.prevent="emit('on-import-holiday')"
                  >
                    <VIcon icon="tabler-download" size="20" />
                    <VTooltip
                      open-delay="500"
                      location="top"
                      activator="parent"
                    >
                      <span>{{ $t("Import Holiday") }}</span>
                    </VTooltip>
                  </IconBtn>
                  <IconBtn
                    rounded
                    v-if="isReload"
                    size="30"
                    class="mr-1"
                    @click.prevent="reload"
                    :loading="loading"
                    ><VIcon icon="tabler-refresh" size="20"
                  /></IconBtn>
                  <IconBtn
                    rounded
                    size="30"
                    class="mr-1"
                    v-if="isExcel"
                    @click.prevent="exportToExcel"
                    ><VIcon icon="tabler-file-spreadsheet" size="20"
                  /></IconBtn>
                  <VMenu
                    v-if="isToggleColumn"
                    v-model="menu"
                    :close-on-content-click="false"
                    scroll-strategy="none"
                    eager
                    :content-class="'filter-menu-content'"
                    location="left"
                  >
                    <template #activator="{ props }"
                      ><IconBtn rounded v-bind="props" size="30" class="mr-2"
                        ><VIcon icon="tabler-columns-3" size="20" /></IconBtn
                    ></template>
                    <VCard min-width="300" class="pb-4">
                      <VList
                        ><VListItem :title="$t('Toggle Columns')"
                          ><template v-slot:prepend
                            ><VIcon
                              icon="tabler-columns-3"
                            ></VIcon></template></VListItem
                      ></VList>
                      <VDivider />
                      <VList
                        v-for="(header, index) in headers"
                        :key="header?.key"
                        class="pt-0 pb-0"
                        ><VListItem
                          v-if="header?.key !== 'actions'"
                          style="padding-bottom: 0 !important"
                          ><VSwitch
                            v-model="header.visible"
                            :label="header.title"
                            color="primary"
                            hide-details /></VListItem
                      ></VList>
                    </VCard>
                  </VMenu>
                  <IconBtn
                    rounded
                    @click.prevent="toggleFilters"
                    size="30"
                    class="mr-2"
                    v-if="isFilter"
                    ><VIcon
                      :icon="
                        showFilters[0] == 0
                          ? 'tabler-filter-up'
                          : 'tabler-filter-down'
                      "
                      size="20"
                  /></IconBtn>
                  <VBtn
                    size="30"
                    v-if="
                      isCheckBranch
                        ? useSettingStore().branch_id != '*'
                        : true &&
                          (createDialog || createPage) &&
                          (!canCreate || hasPermission(canCreate))
                    "
                    @click.prevent="create"
                    variant="tonal"
                    ><VIcon icon="tabler-plus" size="20"
                  /></VBtn>
                </div>
              </div>
            </VCardItem>
            <VDivider />
          </template>

          <div id="app-card-filter-panel" v-if="isHeader">
            <VExpandTransition
              ><div v-if="renderFilterContent && isFilterOpen">
                <div class="pa-2 ma-1"><slot name="filter"></slot></div>
                <VDivider /></div
            ></VExpandTransition>
          </div>

          <div
            ref="rightLog"
            class="flex-grow-1 chat-log-container"
            style="background-color: white; overflow-y: auto"
          >
            <div
              v-if="isMobileView"
              class="mobile-card-container pa-3 table-scroll-wrapper"
              :class="[isFullHeight ? 'h-100' : '']"
            >
              <template v-if="internalLoading">
                <div class="text-center pa-5">
                  <VProgressCircular
                    indeterminate
                    color="primary"
                    aria-label="Loading progress Card Table"
                    role="progressbar"
                  ></VProgressCircular>
                </div>
              </template>
              <template
                v-else-if="!dataItems.data || dataItems.data.length === 0"
              >
                <div class="no-data-container text-center py-4">
                  <VIcon
                    icon="tabler-info-circle"
                    size="48"
                    color="warning"
                    class="mb-2"
                  />
                  <p class="text-medium-emphasis">
                    {{ $t("No Records Found") }}
                  </p>
                </div>
              </template>
              <template v-else>
                <div
                  v-for="(item, index) in dataItems.data"
                  :key="item[itemValue] || index"
                  class="mb-3"
                >
                  <VCard border elevation="1" class="rounded-lg">
                    <div
                      class="d-flex justify-space-between align-center px-4 py-3 cursor-pointer"
                      @click="toggleMobileRow(item[itemValue])"
                      v-ripple
                    >
                      <div class="d-flex flex-column" style="width: 60%">
                        <slot
                          v-if="mobileHeaders.first"
                          :name="`item.${mobileHeaders.first.key}`"
                          :item="item"
                          :index="index"
                          :value="getRenderValue(item, mobileHeaders.first)"
                        >
                          <span class="font-weight-bold text-truncate">{{
                            getRenderValue(item, mobileHeaders.first)
                          }}</span>
                        </slot>
                      </div>

                      <div
                        class="d-flex align-center justify-end"
                        style="width: 40%"
                      >
                        <div class="text-end mr-2">
                          <slot
                            v-if="mobileHeaders.second"
                            :name="`item.${mobileHeaders.second.key}`"
                            :item="item"
                            :index="index"
                            :value="getRenderValue(item, mobileHeaders.second)"
                          >
                            <div class="d-flex flex-column">
                              <span style="font-size: 0.8125rem">{{
                                mobileHeaders.second.title
                              }}</span>
                              <span class="font-weight-bold text-primary">{{
                                getRenderValue(item, mobileHeaders.second)
                              }}</span>
                            </div>
                          </slot>
                        </div>
                        <VIcon
                          :icon="
                            mobileExpanded.includes(item[itemValue])
                              ? 'tabler-chevron-up'
                              : 'tabler-chevron-down'
                          "
                          color="grey-lighten-1"
                        />
                      </div>
                    </div>

                    <VExpandTransition>
                      <div v-show="mobileExpanded.includes(item[itemValue])">
                        <VDivider />
                        <div class="bg-grey-lighten-5 px-4 py-3">
                          <div
                            v-for="header in mobileHeaders.others"
                            :key="header.key"
                            class="d-flex justify-space-between align-center mb-2 pb-1 border-b"
                            style="
                              border-bottom: 1px dashed rgba(0, 0, 0, 0.08) !important;
                            "
                          >
                            <span
                              class="text-medium-emphasis"
                              style="font-size: 0.8125rem"
                              >{{ header.title }}</span
                            >
                            <span
                              class="font-weight-medium text-end"
                              style="font-size: 0.8125rem"
                            >
                              <slot
                                :name="`item.${header.key}`"
                                :item="item"
                                :index="index"
                                :value="getRenderValue(item, header)"
                              >
                                {{ getRenderValue(item, header) }}
                              </slot>
                            </span>
                          </div>
                        </div>
                      </div>
                    </VExpandTransition>

                    <div
                      v-if="visibleHeaders.find((h) => h.key === 'actions')"
                      class="px-2 py-2 border-t bg-surface"
                    >
                      <div class="d-flex justify-end align-center gap-2">
                        <slot name="item.actions" :item="item" :index="index">
                          <template
                            v-for="(button, btnIndex) in actionButtons"
                            :key="btnIndex"
                          >
                            <VBtn
                              v-if="
                                !button.isDelete &&
                                button.show &&
                                (!button.permission ||
                                  checkPermission(button, item)) &&
                                (!button.condition || button.condition(item))
                              "
                              :color="button.color"
                              variant="tonal"
                              size="small"
                              class="px-3"
                              @click.stop="() => button.action(item)"
                            >
                              <VIcon
                                start
                                :icon="getButtonIcon(button, item)"
                                size="16"
                              />
                              {{ $t(getButtonTitle(button, item)) }}
                            </VBtn>
                          </template>

                          <IconBtn
                            v-if="
                              isMoreAction &&
                              (!isMoreActionCondition ||
                                isMoreActionCondition(item))
                            "
                            size="small"
                            color="medium-emphasis"
                          >
                            <VIcon icon="tabler-dots-vertical" />
                            <VMenu activator="parent">
                              <VList>
                                <template
                                  v-for="(button, index) in actionButtons"
                                  :key="index"
                                >
                                  <VListItem
                                    v-if="
                                      !button.btn &&
                                      button.show &&
                                      (!button.permission ||
                                        checkPermission(button, item)) &&
                                      (!button.condition ||
                                        button.condition(item))
                                    "
                                    @click="() => button.action(item)"
                                  >
                                    <template #prepend
                                      ><VIcon
                                        :icon="getButtonIcon(button, item)"
                                        size="20"
                                        class="mr-2"
                                    /></template>
                                    <span style="font-size: 0.8125rem">{{
                                      $t(getButtonTitle(button, item))
                                    }}</span>
                                  </VListItem>
                                </template>
                              </VList>
                            </VMenu>
                          </IconBtn>
                        </slot>
                      </div>
                    </div>
                  </VCard>
                </div>
              </template>
            </div>

            <div
              v-else
              class="table-wrapper d-flex flex-row w-100 table-scroll-wrapper"
              :class="[isFullHeight ? 'h-100' : '']"
            >
              <VDataTableVirtual
                v-bind="{
                  ...$attrs,
                  class: null,
                  label: undefined,
                  id: elementId,
                }"
                :key="locale"
                :fixed-header="isFullHeight"
                :headers="visibleHeaders"
                :items="dataItems?.data || []"
                :items-per-page="options?.limit"
                :items-length="dataItems?.total || 0"
                :page="options?.page"
                :sort-by="options.sortBy"
                :sort-desc="options.sortDesc"
                :options="options"
                :hide-default-header="hideHeader"
                :hide-default-footer="hideFooter"
                :loading="internalLoading"
                :hover="isHover"
                :disable-sort="disableSort"
                class="text-no-wrap no-scroll-table single-direction-scroll striped-table custom-datatable"
                :class="
                  isFixedColumnRight && mdAndUp
                    ? 'sticky-action-table striped-table'
                    : ''
                "
                :height="isFullHeight ? '600' : ''"
                :header-props="{
                  style:
                    'background-color: #F8F8F8; border-bottom: 1px solid #ddd; height: 40px !important; padding: 12px 8px; vertical-align: middle;',
                }"
                virtual-rows
                :ripple="false"
                :item-height="48"
                :bench="10"
                :show-expand="showExpand"
                v-model:expanded="expandedRows"
                :item-value="itemValue"
              >
                <template #no-data
                  ><div class="no-data-container text-center py-4">
                    <VIcon
                      icon="tabler-info-circle"
                      size="48"
                      color="warning"
                      class="mb-2"
                    />
                    <p class="text-medium-emphasis">
                      {{ $t("No Records Found") }}
                    </p>
                  </div></template
                >
                <template
                  v-for="(slotName, index) in Object.keys($slots)"
                  :key="index"
                  v-slot:[slotName]="slotProps"
                  ><slot :name="slotName" v-bind="slotProps"></slot
                ></template>
                <template #item.actions="{ item }">
                  <template
                    v-for="(button, index) in actionButtons"
                    :key="index"
                  >
                    <VBtn
                      rounded
                      :icon="getButtonIcon(button, item)"
                      size="small"
                      variant="text"
                      :color="button.color"
                      v-if="
                        button.btn &&
                        button.show &&
                        (!button.permission || checkPermission(button, item)) &&
                        (!button.condition || button.condition(item))
                      "
                      @click="() => button.action(item)"
                    >
                      <VIcon :icon="getButtonIcon(button, item)" /><VTooltip
                        open-delay="500"
                        location="top"
                        activator="parent"
                        ><span>{{
                          $t(getButtonTitle(button, item))
                        }}</span></VTooltip
                      >
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
                    <VIcon
                      icon="tabler-dots-vertical"
                      color="grey"
                      size="small"
                    /><VMenu activator="parent"
                      ><VList
                        ><template
                          v-for="(button, index) in actionButtons"
                          :key="index"
                          ><VListItem
                            v-if="
                              !button.btn &&
                              button.show &&
                              (!button.permission ||
                                checkPermission(button, item)) &&
                              (!button.condition || button.condition(item))
                            "
                            @click="() => button.action(item)"
                            :class="[
                              getButtonBackgroundClass(button, item),
                              `text-${getButtonColor(button, item)}`,
                            ]"
                            style="
                              display: flex;
                              align-items: center;
                              min-height: 20px;
                            "
                            ><template #prepend
                              ><VIcon
                                :icon="getButtonIcon(button, item)"
                                style="margin-right: 1px"
                                size="20" /></template
                            ><span style="font-size: 13px">{{
                              $t(getButtonTitle(button, item))
                            }}</span></VListItem
                          ></template
                        ></VList
                      ></VMenu
                    >
                  </IconBtn>
                </template>
              </VDataTableVirtual>
            </div>

            <table ref="dataTableRef" style="display: none">
              <thead>
                <tr>
                  <th v-for="header in exportHeaders" :key="header.key">
                    {{ header.title }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in dataItems.data" :key="item.id || item.code">
                  <td v-for="header in exportHeaders" :key="header.key">
                    {{
                      header.exportValue
                        ? header.exportValue(item)
                        : header.value && typeof header.value === "function"
                          ? header.value(item)
                          : getValue(item, header.key)
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div id="app-card-filter-panel" v-if="!isHeader">
            <VExpandTransition
              ><div v-if="renderFilterContent && isFilterOpen">
                <VDivider />
                <div class="pa-2 pt-3"><slot name="filter"></slot></div></div
            ></VExpandTransition>
          </div>
          <VForm class="chat-log-message-form sticky-footer"
            ><div v-if="isPagination">
              <VDivider /><VCol style="background-color: white" class="pa-2"
                ><VCardText style="padding: 0"
                  ><div
                    class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 align-center"
                  >
                    <div class="d-flex flex-row">
                      <AppSelect
                        density="compact"
                        v-model="options.limit"
                        :items="[
                          { title: $t('5'), value: 5 },
                          { title: $t('10'), value: 10 },
                          { title: $t('15'), value: 15 },
                          { title: $t('25'), value: 25 },
                          { title: $t('50'), value: 50 },
                          { title: $t('100'), value: 100 },
                          { title: $t('All'), value: -1 },
                        ]"
                        hide-details
                        style="
                          max-inline-size: 8rem;
                          min-inline-size: 5rem;
                          margin-right: 5px;
                        "
                      />

                      <IconBtn
                        rounded
                        size="30"
                        class="mr-1"
                        v-if="isExcel && !isHeader"
                        @click.prevent="exportToExcel"
                        ><VIcon icon="tabler-file-spreadsheet" size="20"
                      /></IconBtn>

                      <VMenu
                        v-if="isToggleColumn && !isHeader"
                        v-model="menu"
                        :close-on-content-click="false"
                        scroll-strategy="none"
                        eager
                        :content-class="'filter-menu-content'"
                        location="left"
                      >
                        <template #activator="{ props }"
                          ><IconBtn
                            rounded
                            v-bind="props"
                            size="30"
                            class="mr-2"
                            ><VIcon
                              icon="tabler-columns-3"
                              size="20" /></IconBtn
                        ></template>
                        <VCard min-width="300" class="pb-4">
                          <VList
                            ><VListItem :title="$t('Toggle Columns')"
                              ><template v-slot:prepend
                                ><VIcon
                                  icon="tabler-columns-3"
                                ></VIcon></template></VListItem
                          ></VList>
                          <VDivider />
                          <VList
                            v-for="(header, index) in headers"
                            :key="header?.key"
                            class="pt-0 pb-0"
                            ><VListItem
                              v-if="header?.key !== 'actions'"
                              style="padding-bottom: 0 !important"
                              ><VSwitch
                                v-model="header.visible"
                                :label="header.title"
                                color="primary"
                                hide-details /></VListItem
                          ></VList>
                        </VCard>
                      </VMenu>

                      <IconBtn
                        rounded
                        @click.prevent="toggleFilters"
                        size="30"
                        class="mr-2"
                        v-if="isFilter && !isHeader"
                      >
                        <VTooltip
                          location="top"
                          transition="scale-transition"
                          activator="parent"
                        >
                          {{ $t("Filter") }}
                        </VTooltip>
                        <VIcon
                          :icon="
                            showFilters[0] == 0
                              ? 'tabler-filter-down'
                              : 'tabler-filter-up'
                          "
                          size="20"
                        />
                      </IconBtn>
                    </div>
                    <div>
                      <VChip variant="outlined"
                        ><span style="font-size: 13px"
                          >{{ dataItems?.meta?.from || 0 }}-{{
                            dataItems?.meta?.to || 0
                          }}
                          of {{ dataItems?.meta?.total || 0 }}</span
                        ></VChip
                      >
                    </div>
                    <VPagination
                      v-model="options.page"
                      active-color="primary"
                      size="small"
                      :total-visible="$vuetify.display.smAndDown ? 4 : 7"
                      :length="
                        calculateLength(
                          dataItems?.meta?.total || 0,
                          options.limit,
                        )
                      "
                      class="bootstrap-style-pagination"
                      @click.prevent
                    /></div></VCardText
              ></VCol>
            </div>
            <slot name="footer"></slot
          ></VForm>
        </div>
      </VMain>
    </VLayout>
  </div>
</template>

<style lang="scss">
@use "@styles/variables/vuetify";
@use "@core/scss/base/mixins";
@use "@layouts/styles/mixins" as layoutsMixins;
$app-card-header-height: 76px;
%chat-header {
  display: flex;
  align-items: center;
  min-block-size: $app-card-header-height;
  padding-inline: 1.5rem;
}
.app-card-layout {
  border-radius: vuetify.$card-border-radius;
  @include mixins.elevation(vuetify.$card-elevation);
  $sel-app-card-layout: &;
  @at-root {
    .skin--bordered {
      @include mixins.bordered-skin($sel-app-card-layout);
    }
  }
  .chat-list-header,
  .active-chat-header {
    @extend %chat-header;
  }
}
</style>

<style scoped>
.mobile-card-container {
  overflow-y: auto;
}
[class^="filter-menu-content-"] {
  overflow: visible;
}
.custom-datatable :deep(.v-table__wrapper) {
  overflow-x: auto;
  overflow-y: auto;
}
.custom-datatable :deep(.v-table__wrapper:hover) {
  overflow-y: auto;
}
.sticky-footer {
  position: sticky;
  bottom: 0;
  background-color: white;
  z-index: 10;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
:deep(.filter-menu-content) {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  border-radius: 12px;
}
.scrollable-actions {
  overflow-x: auto;
  white-space: nowrap;
}
.scrollable-actions::-webkit-scrollbar {
  height: 6px;
}
.table-scroll-wrapper {
  scroll-snap-type: y mandatory;
}
.list-tab-height {
  height: calc(100dvh - 147px);
  display: flex;
  flex-direction: column;
}
@media (max-width: 768px) {
  .list-tab-height {
    height: calc(100dvh - 147px);
    position: relative;
  }
  .h-100 {
    height: 100% !important;
    min-height: 0;
  }
}
.striped-table tbody tr:nth-of-type(odd) {
  background-color: rgba(0, 0, 0, 0.05);
}
.sticky-action-table :deep(.v-data-table) {
  position: relative;
  isolation: isolate;
}
.sticky-action-table :deep(.v-data-table-header) {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: #f8f8f8;
}
.sticky-action-table :deep(th:last-child) {
  position: sticky;
  right: 0;
  top: 0;
  z-index: 1200;
  background-color: #f8f8f8;
  border-left: 1px solid #e0dfe1;
}
.sticky-action-table :deep(td:last-child) {
  position: sticky;
  right: 0;
  z-index: 0;
  background-color: #ffffff;
  border-left: 1px solid #e0dfe1;
}
</style>
