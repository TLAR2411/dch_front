<script setup>
import { PerfectScrollbar } from "vue3-perfect-scrollbar";
import { useDisplay, useTheme } from "vuetify";
import { themes } from "@/plugins/vuetify/theme";

import { debounce } from "lodash";
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
import {
  useRowActions,
  dataTableProps,
  dataTableEmits,
  getButtonColor,
  getButtonTitle,
  getButtonIcon,
} from "@/composable/useRowActions";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";

const DEBOUNCE_DELAY = 300;
const { showDialog } = useDialog();
const { mdAndUp } = useDisplay();
const props = defineProps({
  ...dataTableProps,
  title: { type: String, default: "DataTable" },
  headersRight: { type: Object, default: () => [] },
  headersLeft: { type: Object, default: () => [] },
  items: { type: Object, default: () => [] },
  meta: { type: Object, default: () => ({}) },
  loading: Boolean,
  isReload: Boolean,
  canCreate: String,
  isBack: { type: Boolean, default: true },
  isHeaderEdit: Boolean,
  canHeaderEdit: String,
  isHeaderDelete: Boolean,
  canHeaderDelete: String,
  isHeaderPrice: Boolean,
  canHeaderPrice: String,

  hideHeader: Boolean,
  hideFooter: Boolean,
  limitRight: { type: Number, default: 25 },
  limitLeft: { type: Number, default: 25 },
  mobileViews: Boolean,
  mobileWidth: { type: Number, default: 678 },
  isHover: { type: Boolean, default: true },
  isPagination: { type: Boolean, default: true },
  disableSort: { type: Boolean, default: true },
  isExcel: Boolean,
  saveState: Boolean,
  rightHeaderShow: {
    type: Object,
    default: () => ({
      isSmallTitle: false,
      smallTitle: null,
      smallTitleValue: null,
    }),
  },
  isLeftSideStatus: Boolean,
  isFilter: Boolean,

  isFilterLeft: Boolean,

  apiUrlRight: String,
  apiUrlLeft: String,

  apiDataRight: { type: Object, default: () => ({}) },
  apiDataLeft: { type: Object, default: () => ({}) },

  selectedItem: { type: Number, default: null },

  filtersRight: { type: Object, default: () => ({}) },
  filtersLeft: {
    type: Object,
    default: () => ({}),
  },
  border: { type: String, default: "border" },
  transformData: {
    type: Function,
    required: false,
    default: null,
  },
  selectedItemHeader: { type: Object, default: () => ({}) },
  saveHeaderName: String,
  saveStateLeftName: String,
  saveStateRightName: String,
  isFixedColumnRight: { type: Boolean, default: true },
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

const savedOptionsRight = props.saveState
  ? getTableState(props.saveStateRightName)
  : null;
const savedOptionsLeft = props.saveState
  ? getTableState(props.saveStateLeftName)
  : null;

const optionsRight = ref(
  savedOptionsRight || { page: 1, limit: props.limitRight },
);
const filtersRight = ref(
  savedOptionsRight?.filter || { ...(props?.filtersRight || []) },
);

const optionsLeft = ref(
  savedOptionsLeft || { page: 1, limit: props.limitLeft },
);
const filtersLeft = ref(
  savedOptionsLeft?.filter || { ...(props?.filtersLeft || []) },
);

const rightLog = ref();
const leftLog = ref();

const scrollToTopOfTableRight = () => {
  const scrollEl = rightLog.value.$el || rightLog.value;

  scrollEl.scrollTop = 0;
};

const scrollToTopOfTableLeft = () => {
  const scrollEl = leftLog.value.$el || leftLog.value;

  scrollEl.scrollTop = 0;
};

// Active chat user profile sidebar
const isLeftSideBar = ref(false);

const showFilters = ref(
  savedOptionsLeft?.showFilter || (props?.showFilters ? [0] : []),
);

const saveStateLeft = () => {
  if (props.saveStateLeftName && props.saveState) {
    setTableState(
      props.saveStateLeftName,
      {
        page: optionsLeft.value.page,
        limit: optionsLeft.value.limit,
        filter: filtersLeft?.value || [],
        selectedItem: selectedItem.value,
        showFilter: showFilters?.value || [],
      },
      30,
    );
  }
};

const isFilterOpen = ref(
  Array.isArray(showFilters.value)
    ? showFilters.value.includes(0)
    : !!showFilters.value,
);

// keep your existing toggleFilters but also keep a boolean for rendering
const renderFilterContent = ref(isFilterOpen.value);

const toggleFilters = async () => {
  const open = !isFilterOpen.value;
  isFilterOpen.value = open;

  // mount content only when opening
  if (open) {
    renderFilterContent.value = true;
    await nextTick(); // let DOM update before animating
  }

  // keep your saved state (if you want the [0] array shape)
  showFilters.value = open ? [0] : [];
  saveStateLeft();
};

const selectedItem = ref(
  savedOptionsLeft?.selectedItem || props.selectedItem || null,
);
const selectedItemObject = ref(null); // For full item object

const saveStateRight = () => {
  if (props.saveStateRightName && props.saveState) {
    setTableState(
      props.saveStateRightName,
      {
        page: optionsRight.value.page,
        limit: optionsRight.value.limit,
        filter: filtersRight?.value || [],
      },
      30,
    );
  }
};

const onLeftSideSelectItem = (item) => {
  if (selectedItem.value === item[props.headersLeft.id]) {
    selectedItem.value = null;
    selectedItemObject.value = null;
    // console.log("unselect");
  } else {
    selectedItem.value = item[props.headersLeft.id];
    selectedItemObject.value = item;
    // console.log("select");
  }
  saveStateLeft();
};
const isItemSelected = computed(() => (item) => {
  return (
    selectedItem?.value === item[props.headersLeft.id] ||
    selectedItem?.value?.id === item[props.headersLeft.id]
  );
});

// DataTable Function

const emit = defineEmits([
  ...dataTableEmits,
  "update:isDialogCreateVisible",
  "exportToExcel",
  "update:response",
  "update:filtersRight",
  "update:filtersLeft",
  "update:selectedItem",
  "update:loading",
  "update:filters",
]);

const normalizePermissionFlags = (raw) => raw;

const { actionButtons } = useRowActions(emit, normalizePermissionFlags(props), {
  t,
  showDialog,
  debounce,
  DEBOUNCE_DELAY,
});

const dataItemsRight = ref([]);
const dataItemsLeft = ref([]);

watch(
  () => props.loading,
  (n) => {
    if (n !== undefined) {
      internalLoading.value = n; // Respect external loading
    }
  },
);

const calculateLength = (total, limit) => {
  if (!total || !limit) return 0;
  return Math.ceil(total / limit);
};

const initDataRight = async (item) => {
  internalLoading.value = true;
  emit("update:loading", true);
  try {
    if (props.apiUrlRight != null) {
      const res = await api.post(props.apiUrlRight, {
        ...props.apiDataRight,
        page: optionsRight.value.page,
        limit:
          optionsRight.value.limit != -1 ? optionsRight.value.limit : 9999999,
        filter: filtersRight?.value || [],
      });

      let items = res.data.data.data;

      // Apply the transformation if provided
      if (props.transformData) {
        items = props.transformData(items);
      }

      dataItemsRight.value = {
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

const initDataLeft = async (item) => {
  internalLoading.value = true;
  emit("update:loading", true);
  try {
    if (props.apiUrlLeft != null) {
      const res = await api.post(props.apiUrlLeft, {
        ...props.apiDataLeft,
        page: optionsLeft.value.page,
        limit: optionsLeft.value.limit,
        filter: filtersLeft?.value || [],
      });

      let items = res.data.data.data;

      // Apply the transformation if provided
      if (props.transformData) {
        items = props.transformData(items);
      }

      dataItemsLeft.value = {
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
  emit("update:filtersRight", filtersRight.value);
  emit("update:filtersLeft", filtersLeft.value);
  emit("update:selectedItem", selectedItem.value);
  initDataLeft();
  initDataRight();
  // console.log(filters.value);

  window.addEventListener("resize", updateSize);

  // const wrapper = document.querySelector(".v-table__wrapper");

  // if (wrapper) {
  //   let activeScrollAxis = null;
  //   let scrollTimeout;

  //   wrapper.addEventListener("scroll", (e) => {
  //     const target = e.target;
  //     const deltaX = Math.abs(target.scrollLeft - (target.lastScrollLeft || 0));
  //     const deltaY = Math.abs(target.scrollTop - (target.lastScrollTop || 0));

  //     // Determine which axis is being scrolled
  //     if (deltaX > 0 || deltaY > 0) {
  //       clearTimeout(scrollTimeout);

  //       // Set active axis only if not already set
  //       if (!activeScrollAxis) {
  //         if (deltaX > deltaY) {
  //           activeScrollAxis = "x";
  //           target.style.overflowY = "hidden";
  //         } else {
  //           activeScrollAxis = "y";
  //           target.style.overflowX = "hidden";
  //         }
  //       }

  //       // Check if we've reached the boundary of active scroll axis
  //       const reachedXBoundary =
  //         activeScrollAxis === "x" &&
  //         (target.scrollLeft === 0 ||
  //           target.scrollLeft >= target.scrollWidth - target.clientWidth - 1);

  //       const reachedYBoundary =
  //         activeScrollAxis === "y" &&
  //         (target.scrollTop === 0 ||
  //           target.scrollTop >= target.scrollHeight - target.clientHeight - 1);

  //       // Reset when reaching boundary
  //       if (reachedXBoundary || reachedYBoundary) {
  //         target.style.overflowX = "auto";
  //         target.style.overflowY = "auto";
  //         activeScrollAxis = null;
  //       }

  //       // Also reset after inactivity
  //       scrollTimeout = setTimeout(() => {
  //         target.style.overflowX = "auto";
  //         target.style.overflowY = "auto";
  //         activeScrollAxis = null;
  //       }, 150);
  //     }

  //     // Store last scroll positions
  //     target.lastScrollLeft = target.scrollLeft;
  //     target.lastScrollTop = target.scrollTop;
  //   });

  //   // Reset on mouse leave
  //   wrapper.addEventListener("mouseleave", () => {
  //     clearTimeout(scrollTimeout);
  //     wrapper.style.overflowX = "auto";
  //     wrapper.style.overflowY = "auto";
  //     activeScrollAxis = null;
  //   });
  // }
});
onUnmounted(() => window.removeEventListener("resize", updateSize));

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
  XLSX.writeFile(workbook, `${props.saveHeaderName}.xlsx`); // Customize filename if needed
};

const reload = debounce(() => {
  initDataLeft();
  initDataRight();
}, 500);
const reloadLeft = debounce(() => {
  initDataLeft();
}, 500);
const reloadRight = debounce(() => {
  initDataRight();
}, 500);

defineExpose({
  reload,
  reloadLeft,
  reloadRight,
  exportToExcel,
});

watch(
  filtersRight.value,
  debounce(() => {
    optionsRight.value.page = 1;
    saveStateRight();
    initDataRight();
  }, 500),
);

watch(
  () => ({
    page: optionsLeft.value.page,
    limit: optionsLeft.value.limit,
    branchId: useSettingStore().branch_id,
  }),
  (n, o) => {
    if (
      n.page !== o.page ||
      n.limit !== o.limit ||
      n.branchId !== o.branchId ||
      n.selectedItem !== o.selectedItem
    ) {
      saveStateLeft();
      initDataLeft();
      // scrollToTopOfTableLeft();
    }
  },
);

watch(
  () => ({
    page: optionsRight.value.page,
    limit: optionsRight.value.limit,
    branchId: useSettingStore().branch_id,
  }),
  (n, o) => {
    if (n.page !== o.page || n.limit !== o.limit || n.branchId !== o.branchId) {
      saveStateRight();
      initDataRight();
      scrollToTopOfTableRight();
    }
  },
);

watch(
  () => selectedItem.value,
  (n, o) => {
    if (n != o) {
      saveStateLeft();
      emit("update:selectedItem", selectedItem.value);
    }
  },
);

const isMobileNav = ref(window.innerWidth < 1280);
const updateMobileNav = () => {
  isMobileNav.value = window.innerWidth < 1280;
};

onMounted(() => {
  window.addEventListener("resize", updateMobileNav);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateMobileNav);
});

watch(
  filtersLeft.value,
  debounce(() => {
    console.log("hi");

    optionsLeft.value.page = 1;
    initDataLeft();
    saveStateLeft();
    scrollToTopOfTableLeft();
  }, 500),
);

const _loading = ref(false);

const $loading = computed({
  get() {
    return internalLoading.value !== undefined
      ? internalLoading.value
      : _loading.value;
  },
  set(value) {
    internalLoading.value !== undefined
      ? emit("update:loading", value)
      : (_loading.value = value);
  },
});

const savedHeaderRight = props.saveState
  ? getTableState(props.saveHeaderName)
  : null;

const isLeftSidebarOpen = ref(
  props.saveState ? getTableState(`${props.saveHeaderName}-hide-side`) : true,
);

function mergeSavedHeaders(original, saved) {
  return original.map((origCol) => {
    const savedCol = saved?.find((h) => h.key === origCol.key);
    return savedCol ? { ...origCol, ...savedCol } : origCol;
  });
}

const headersRight = ref(
  mergeSavedHeaders(props.headersRight, savedHeaderRight),
);

const visibleHeaders = computed(() =>
  headersRight?.value.filter((h) => h.visible !== false),
);

const menu = ref(false);

watch(
  headersRight,
  (n) => {
    // Strip out non-serializable properties (like functions)
    const cleanHeaders = headersRight.value.map(({ value, ...rest }) => ({
      ...rest,
    }));
    setTableState(
      props.saveHeaderName,
      cleanHeaders,
      1000 * 60 * 60 * 24 * 365, // 1 year
    );
  },
  { deep: true },
);

watch(
  () => isLeftSidebarOpen.value,
  (n, o) => {
    if (props.saveState) {
      setTableState(`${props.saveHeaderName}-hide-side`, n);
    }
  },
);
</script>

<template>
  <VLayout class="chat-app-layout h-100" style="z-index: 0" :class="border">
    <!-- 👉 Chat content -->
    <!-- Left Side Content  -->
    <VNavigationDrawer
      v-model="isLeftSidebarOpen"
      data-allow-mismatch
      absolute
      touchless
      location="start"
      :width="isMobile ? 250 : 300"
      :temporary="$vuetify.display.smAndDown"
      class="chat-list-sidebar"
      :permanent="$vuetify.display.mdAndUp"
    >
      <div
        class="active-chat-header d-flex align-center text-medium-emphasis bg-surface pl-3 pr-0"
      >
        <!-- <div
          class="d-flex align-center cursor-pointer w-100"
          @click="isLeftSideBar = true"
        >
          <VTextField v-model="filtersLeft.search" label="Search" />
        </div> -->
        <template v-if="isFilterLeft">
          <slot name="filtersLeft"></slot>
        </template>
        <template v-else>
          <VRow class="w-100">
            <VCol cols="12">
              <AppTextField v-model="filtersLeft.search">
                <template #label>{{ $t("Search") }}</template>
              </AppTextField>
            </VCol>
          </VRow>
        </template>

        <VSpacer />
      </div>
      <VDivider />
      <div
        ref="leftLog"
        class="flex-grow-1 chat-log-container"
        style="background-color: white; overflow-y: auto"
      >
        <div class="table-wrapper">
          <VList
            v-if="dataItemsLeft?.data?.length > 0"
            :loading="internalLoading"
            nav
          >
            <VListItem
              v-for="item in dataItemsLeft.data"
              :key="item.id"
              :value="item.id"
              class="border-thin"
              :active="isItemSelected(item)"
              @click="onLeftSideSelectItem(item)"
            >
              <!-- <VListItemSubtitle class="mt-1"> # </VListItemSubtitle> -->
              <VListItemTitle class="pt-1">
                {{ item[headersLeft.subTitle] }} - {{ item[headersLeft.title] }}
              </VListItemTitle>

              <template #append>
                <div v-if="isLeftSideStatus">
                  <VIcon
                    icon="tabler-check"
                    v-if="item.is_active"
                    color="success"
                    size="small"
                  />
                  <VIcon icon="tabler-check" v-else size="small" />
                </div>
              </template>
            </VListItem>
          </VList>
        </div>
      </div>
      <VForm class="chat-log-message-form">
        <VDivider />
        <VCol style="background-color: white">
          <VCardText style="padding: 0">
            <div
              class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 align-center"
            >
              <AppSelect
                density="compact"
                v-model="optionsLeft.limit"
                :items="[15, 25, 50, 100, 500, 10000]"
                hide-details
                style="
                  max-inline-size: 8rem;
                  min-inline-size: 5rem;
                  margin-right: 5px;
                "
              />
              <!-- Add Export Button -->

              <VPagination
                v-model="optionsLeft.page"
                active-color="primary"
                size="small"
                :total-visible="$vuetify.display.smAndDown ? 3 : 3"
                :length="
                  calculateLength(
                    dataItemsLeft?.meta?.total || 0,
                    optionsLeft.limit,
                  )
                "
                @click.prevent
              />
            </div>
          </VCardText>
        </VCol>
      </VForm>
    </VNavigationDrawer>

    <VMain class="chat-content-container">
      <div class="d-flex flex-column h-100">
        <!-- Right Side Content -->
        <div
          class="active-chat-header d-flex align-center text-medium-emphasis bg-surface pl-3 pr-3 pt-2 pb-2"
        >
          <IconBtn
            rounded
            class="me-3"
            @click="isLeftSidebarOpen = !isLeftSidebarOpen"
          >
            <VIcon icon="tabler-menu-2" />
          </IconBtn>
          <div
            class="d-flex align-center cursor-pointer"
            @click="isLeftSideBar = true"
          >
            <div
              class="d-flex flex-column text-primary"
              v-if="selectedItem != null"
            >
              <div class="d-flex flex-row align-center">
                <span class="mr-2" style="font-size: 18px">{{
                  selectedItemHeader?.title
                }}</span>
                <div
                  class="d-flex flex-row text-secondary"
                  v-if="
                    selectedItemHeader?.subTitle ||
                    selectedItemHeader?.subTitleValue
                  "
                >
                  <span v-if="selectedItemHeader?.subTitle">{{
                    $t(selectedItemHeader?.subTitle)
                  }}</span>
                  <span v-if="selectedItemHeader?.subTitleValue"
                    >:&nbsp;{{ selectedItemHeader?.subTitleValue ?? 0 }}</span
                  >
                </div>
              </div>
              <!-- <VDivider class="border-opacity-100 mt-1 mb-1" /> -->
              <div
                v-if="selectedItemHeader?.objectList"
                class="d-flex mt-1"
                :class="
                  selectedItemHeader?.listFlex ? 'flex-row' : 'flex-column'
                "
              >
                <template
                  v-for="(item, index) in selectedItemHeader?.objectList"
                >
                  <!-- <div class="d-flex align-center flex-row">
                    <span class="text-secondary" style="font-size: 13px"
                      >{{ $t(item.title) }}:&nbsp;</span
                    >
                    <span class="text-secondary" style="font-size: 13px">{{
                      item.value
                    }}</span>
                  </div> -->

                  <VChip
                    class="mr-2"
                    size="small"
                    v-if="item.value"
                    :class="selectedItemHeader?.listFlex ? '' : 'mb-1'"
                  >
                    <span class="text-secondary" style="font-size: 13px"
                      >{{ $t(item.title) }}:&nbsp;</span
                    >
                    <span class="text-secondary" style="font-size: 13px">{{
                      item.value
                    }}</span>
                  </VChip>
                  <!-- <VDivider
                    class="border-opacity-100 ml-1 mr-1"
                    vertical
                    v-if="
                      selectedItemHeader?.objectList.length > 1 &&
                      index !== selectedItemHeader?.objectList.length - 1
                    "
                  /> -->
                </template>
              </div>
            </div>

            <div class="d-flex flex-column text-primary" v-else>
              <div class="d-flex flex-row align-center">
                <span class="mr-2" style="font-size: 18px">{{
                  $t("Please Select")
                }}</span>
              </div>
              <div class="d-flex flex-column">
                <VDivider class="mt-1 mb-1" />
                <div class="d-flex flex-row align-center">
                  <span class="text-secondary" style="font-size: 13px">{{
                    $t("To see detail information.")
                  }}</span>
                </div>
              </div>
            </div>
          </div>
          <VSpacer />

          <div class="d-sm-flex align-center text-medium-emphasis">
            <template v-if="selectedItem != null">
              <IconBtn
                rounded
                v-if="
                  isHeaderPrice &&
                  (!canHeaderPrice || hasPermission(canHeaderPrice))
                "
                @click.prevent="headerPriceCallback"
                size="38"
                class="mr-2"
              >
                <VTooltip
                  location="top"
                  transition="scale-transition"
                  activator="parent"
                >
                  {{ $t("Price") }}
                </VTooltip>
                <VIcon icon="tabler-cash" size="22" />
              </IconBtn>

              <IconBtn
                rounded
                v-if="
                  isHeaderEdit &&
                  (!canHeaderEdit || hasPermission(canHeaderEdit))
                "
                @click.prevent="headerEditCallback"
                size="38"
                class="mr-2"
              >
                <VTooltip
                  location="top"
                  transition="scale-transition"
                  activator="parent"
                >
                  {{ $t("Edit") }}
                </VTooltip>
                <VIcon icon="tabler-edit" size="22" />
              </IconBtn>

              <IconBtn
                rounded
                v-if="
                  isHeaderDelete &&
                  (!canHeaderDelete || hasPermission(canHeaderDelete))
                "
                @click.prevent="headerDeleteCallback"
                size="38"
                class="mr-2"
              >
                <VTooltip
                  location="top"
                  transition="scale-transition"
                  activator="parent"
                >
                  {{ $t("Delete") }}
                </VTooltip>
                <VIcon icon="tabler-trash" size="22" />
              </IconBtn>

              <!-- <IconBtn
               rounded @click.prevent="toggleEdit" size="38" class="mr-2">
                <VTooltip
                  location="top"
                  transition="scale-transition"
                  activator="parent"
                >
                  {{ $t("Edit") }}
                </VTooltip>
                <VIcon icon="tabler-coin" size="22" />
              </IconBtn> -->
            </template>
            <VMenu
              v-model="menu"
              :close-on-content-click="false"
              location="bottom"
              :content-class="'filter-menu-content'"
            >
              <template #activator="{ props }">
                <IconBtn rounded v-bind="props" size="38" class="mr-2">
                  <VTooltip
                    location="top"
                    transition="scale-transition"
                    activator="parent"
                  >
                    {{ $t("Toggle Columns") }}
                  </VTooltip>
                  <VIcon icon="tabler-columns-3" size="22" />
                </IconBtn>
              </template>

              <VCard min-width="300" class="pb-4">
                <VList>
                  <VListItem :title="$t('Toggle Columns')" />
                </VList>
                <VDivider />
                <VList
                  v-for="(header, index) in headersRight"
                  :key="header?.key"
                  class="pt-0 pb-0"
                >
                  <VListItem
                    v-if="header?.key !== 'actions'"
                    style="padding-bottom: 0 !important"
                  >
                    <VSwitch
                      v-model="header.visible"
                      :label="header.title"
                      color="primary"
                      hide-details
                    />
                  </VListItem>
                </VList>
              </VCard>
            </VMenu>

            <IconBtn
              v-if="isExcel"
              rounded
              @click.prevent="exportToExcel"
              size="38"
              class="mr-2"
            >
              <VTooltip
                location="top"
                transition="scale-transition"
                activator="parent"
              >
                {{ $t("Excel") }}
              </VTooltip>
              <VIcon icon="tabler-file-spreadsheet" size="22" />
            </IconBtn>

            <IconBtn
              rounded
              @click.prevent="toggleFilters"
              size="38"
              class="mr-2"
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
                    ? 'tabler-filter-up'
                    : 'tabler-filter-down'
                "
                size="22"
              />
            </IconBtn>
          </div>
        </div>
        <VDivider />
        <!-- <div id="app-card-filter-panel">
          <VExpansionPanels v-model="showFilters">
            <VExpansionPanel>
              <VExpansionPanelText>
                <slot name="filtersRight"></slot>
                <VDivider class="mt-3" />
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </div> -->
        <div id="app-card-filter-panel">
          <VExpandTransition>
            <div v-if="renderFilterContent && isFilterOpen">
              <div class="pa-2">
                <slot name="filtersRight"></slot>
              </div>
              <VDivider />
            </div>
          </VExpandTransition>
        </div>

        <!-- Chat log -->
        <div
          ref="rightLog"
          class="flex-grow-1 chat-log-container"
          style="background-color: white; overflow-y: auto"
        >
          <div class="table-wrapper d-flex flex-row w-100 h-100">
            <VDataTableServer
              v-bind="{
                ...$attrs,
                class: null,
                label: undefined,
                id: elementId,
              }"
              fixed-header
              :headers="visibleHeaders"
              :items="dataItemsRight?.data || []"
              :items-per-page="optionsRight?.limit"
              :items-length="dataItemsRight?.data?.length || 0"
              :page="optionsRight?.page"
              :sort-by="optionsRight.sortBy"
              :sort-desc="optionsRight.sortDesc"
              :options="optionsRight"
              :hide-default-header="hideHeader"
              :hide-default-footer="hideFooter"
              :loading="internalLoading"
              :mobile="isMobile && mobileViews"
              :hover="isHover"
              :disable-sort="disableSort"
              class="text-no-wrap custom-header custom-datatable"
              expand-on-click
              height="300px"
              :header-props="{
                style:
                  'background-color: #F8F8F8; border-bottom: 1px solid #ddd; height: 40px !important; padding: 12px 8px; vertical-align: middle;',
              }"
              virtua
              :class="
                isFixedColumnRight && mdAndUp
                  ? 'sticky-action-table striped-table'
                  : ''
              "
              l-rows
              :ripple="false"
            >
              <!-- <template v-slot:loading>
          <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
        </template> -->

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
                      (!button.permission ||
                        hasPermission(button.permission)) &&
                      (!button.condition || button.condition(item))
                    "
                    @click="() => button.action(item)"
                  >
                    <VIcon :icon="getButtonIcon(button, item)" />
                    <VTooltip
                      open-delay="500"
                      location="top"
                      activator="parent"
                    >
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
                  <VIcon
                    icon="tabler-dots-vertical"
                    color="grey"
                    size="small"
                  />
                  <VMenu activator="parent">
                    <VList>
                      <template
                        v-for="(button, index) in actionButtons"
                        :key="index"
                      >
                        <!-- <VDivider
                            v-if="
                              button.isDelete &&
                              !button.btn &&
                              button.show &&
                              (!button.permission ||
                                hasPermission(button.permission)) &&
                              (!button.condition || button.condition(item))
                            "
                          /> -->
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
                          style="
                            display: flex;
                            align-items: center;
                            min-height: 30px;
                          "
                        >
                          <template #prepend>
                            <VIcon
                              :icon="getButtonIcon(button, item)"
                              style="margin-right: 1px"
                              size="20"
                            />
                          </template>
                          <span style="font-size: 13px">{{
                            $t(button.title)
                          }}</span>
                        </VListItem>
                      </template>
                    </VList>
                  </VMenu>
                </IconBtn>
              </template>

              <template #bottom>
                <div></div>
              </template>

              <!--        <slot name="footer"></slot>-->
            </VDataTableServer>

            <!-- Hidden table for export -->
            <table ref="dataTableRef" style="display: none">
              <thead>
                <tr>
                  <th v-for="header in headersRight" :key="header.key">
                    {{ header.title }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in dataItemsRight.data"
                  :key="item.id || item.code"
                >
                  <td v-for="header in headersRight" :key="header.key">
                    <slot :name="`item.${header.key}`" :item="item">
                      {{
                        header.value
                          ? header.value(item)
                          : getValue(item, header.key)
                      }}
                    </slot>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Message form -->
        <VForm class="chat-log-message-form">
          <VDivider />
          <VCol style="background-color: white">
            <VCardText style="padding: 0">
              <div
                class="d-flex flex-wrap justify-center justify-sm-space-between gap-y-2 align-center"
              >
                <AppSelect
                  density="compact"
                  v-model="optionsRight.limit"
                  :items="[
                    { title: $t('15'), value: 15 },
                    { title: $t('25'), value: 25 },
                    { title: $t('50'), value: 50 },
                    { title: $t('100'), value: 100 },
                    { title: $t('500'), value: 500 },
                    { title: $t('All'), value: -1 },
                  ]"
                  hide-details
                  style="
                    max-inline-size: 8rem;
                    min-inline-size: 5rem;
                    margin-right: 5px;
                  "
                />

                <div>
                  <VChip variant="outlined">
                    <span style="font-size: 13px"
                      >{{ dataItemsRight?.meta?.from || 0 }}-{{
                        dataItemsRight?.meta?.to || 0
                      }}
                      of
                      {{ dataItemsRight?.meta?.total || 0 }}</span
                    >
                  </VChip>
                </div>
                <!-- Add Export Button -->

                <VPagination
                  v-model="optionsRight.page"
                  active-color="primary"
                  size="small"
                  :total-visible="$vuetify.display.smAndDown ? 3 : 5"
                  :length="
                    calculateLength(
                      dataItemsRight?.meta?.total || 0,
                      optionsRight.limit,
                    )
                  "
                  @click.prevent
                />
              </div>
            </VCardText>
          </VCol>
        </VForm>
      </div>
      <!-- <VOverlay
        v-model="$loading"
        contained
        persistent
        scroll-strategy="none"
        class="align-center justify-center"
      >
        <VProgressCircular indeterminate />
      </VOverlay> -->
    </VMain>
  </VLayout>
</template>

<style lang="scss">
@use "@styles/variables/vuetify";
@use "@core/scss/base/mixins";
@use "@layouts/styles/mixins" as layoutsMixins;

// Variables
$chat-app-header-height: 76px;

// Placeholders
%chat-header {
  display: flex;
  align-items: center;
  min-block-size: $chat-app-header-height;
  padding-inline: 1.5rem;
}

.chat-app-layout {
  border-radius: vuetify.$card-border-radius;

  @include mixins.elevation(vuetify.$card-elevation);

  $sel-chat-app-layout: &;

  @at-root {
    .skin--bordered {
      @include mixins.bordered-skin($sel-chat-app-layout);
    }
  }
  .chat-list-header,
  .active-chat-header {
    @extend %chat-header;
  }

  .chat-list-sidebar {
    .v-navigation-drawer__content {
      display: flex;
      flex-direction: column;
    }
  }
}
</style>

<style scoped>
:deep(#app-card-filter-panel .v-expansion-panel) {
  box-shadow: none !important;
  border: none;
}

:deep(#app-card-filter-panel .v-expansion-panel__shadow) {
  box-shadow: none !important;
  border: none;
}

:deep(#app-card-filter-panel .v-expansion-panel-text__wrapper) {
  padding: 12px 12px 0px 12px !important;
  border: none;
}

[class^="filter-menu-content-"] {
  overflow: visible;
}

:deep(.filter-menu-content) {
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.18),
    0 4px 12px rgba(0, 0, 0, 0.12);
  border-radius: 12px;
}

.custom-datatable :deep(.v-table__wrapper) {
  overflow-x: auto;
  overflow-y: auto;
}

/* Disable Y scroll when X is scrolling */
.custom-datatable :deep(.v-table__wrapper:hover) {
  overflow-y: auto;
}

.sticky-action-table :deep(.v-data-table) {
  position: relative;
  isolation: isolate; /* IMPORTANT */
}

.sticky-action-table :deep(.v-data-table-header) {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: #f8f8f8;
}

/* Header row & cells */
.sticky-action-table :deep(.v-data-table-header th) {
  z-index: 1000;
  background-color: #f8f8f8;
}

.sticky-action-table :deep(.v-virtual-scroll) {
  position: relative;
  z-index: 1;
}

.sticky-action-table :deep(.v-virtual-scroll__item) {
  position: relative;
  z-index: 1;
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
