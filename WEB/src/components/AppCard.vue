<script setup>
import { nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useVueToPrint } from "vue-to-print";
import { debounce } from "lodash";

import {
  VBtn,
  VCardTitle,
  VCarouselItem,
  VCol,
  VDivider,
} from "vuetify/lib/components/index.mjs";
import hasPermission from "@/utils/hasPermission.js";
import { useDialog } from "@/composable/useDialog";

const componentRef = ref();
const { t } = useI18n();
const showPrintDiv = ref(false);

const printAreaRef = ref(null);
const refForm = ref();

const dataTableRef = ref(null);
const { showDialog } = useDialog();

const props = defineProps({
  modelValue: { type: [String, Number, Date, Array], default: null },
  title: { type: String, default: "Card" },
  titleIcon: { type: String, default: "tabler-code" },
  dataExport: { type: Array, default: () => [] },
  createPage: String,
  editPage: String,
  createDialog: Boolean,
  editDialog: Boolean,
  isDialogCreateVisible: Boolean,
  isDialogEditVisible: Boolean,
  canCreate: String,
  canEdit: String,
  isFilter: Boolean,
  isPrint: Boolean,
  isPrintEmpty: Boolean,
  isExcel: Boolean,
  isRefresh: Boolean,
  isBack: { type: Boolean, default: true },
  loading: { type: Boolean, required: false, default: false },
  submitText: { type: String, default: "Submit" },
  submitIcon: { type: String, default: "tabler-check" },
  submitCondition: {
    type: [Function, Boolean],
    default: null,
  },
  isSubmit: Boolean,
  canSubmit: String,
  isSubmitPrint: Boolean,
  canSubmitPrint: Boolean,
  isUpdate: Boolean,
  canUpdate: String,
  isClear: Boolean,
  isHeader: { type: Boolean, default: true },
  isTitle: { type: Boolean, default: true },
  isCheckBranch: Boolean,
  isSearch: Boolean,
  footerAlign: { type: String, default: "justify-end" },
  border: { type: String, default: "border" },
  showFilters: Boolean,
  isFullHeight: Boolean,
  isFullHeightTab: Boolean,
});
import { useSettingStore } from "@/stores/settingStore";
const showFilters = ref(props?.showFilters ? [0] : []);
const router = useRouter();

const { handlePrint } = useVueToPrint({
  content: () => {
    showPrintDiv.value = true;
    return printAreaRef.value;
  },
  documentTitle: props.title || null,
  onAfterPrint: () => {
    showPrintDiv.value = false;
  },
});

const emit = defineEmits([
  "update:isDialogCreateVisible",
  "update:isDialogEditVisible",
  "onSubmit",
  "onUpdate",
  "onClear",
  "onExcel",
  "onPrint",
  "update:loading",
]);

const onPrint = () => {
  emit("onPrint");
};
const scrollToBottom = async () => {
  try {
    // Wait for multiple ticks if needed
    await nextTick();
    await nextTick();

    const el = printAreaRef.value?.$el || printAreaRef.value;

    if (el) {
      // More reliable scroll methods
      el.scrollTo({
        top: el?.scrollHeight,
        behavior: "smooth",
      });

      // Alternative approach if above doesn't work
      setTimeout(() => {
        el.scrollTop = el?.scrollHeight;
      }, 100);
    }
  } catch (error) {
    console.error("Scroll error:", error);
  }
};

// function toggleFilters() {
//   showFilters.value = showFilters.value.includes(0) ? [] : [0];
// }

const isFilterOpen = ref(
  Array.isArray(showFilters.value)
    ? showFilters.value.includes(0)
    : !!showFilters.value,
);

// keep your existing toggleFilters but also keep a boolean for rendering
const renderFilterContent = ref(isFilterOpen.value);

// const toggleFilters = () => {
//   showFilters.value = showFilters.value.includes(0) ? [] : [0];
//   saveState();

//   // console.log(showFilters.value);
// };

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
  // saveState();
};

function create() {
  if (props?.createPage) {
    router.push({ name: props.createPage });
  } else if (props?.createDialog) {
    emit("update:isDialogCreateVisible", !props.isDialogCreateVisible);
  }
}

function edit() {
  if (props?.editPage) {
    router.push({ name: props.editPage });
  } else if (props?.editDialog) {
    emit("update:isDialogEditVisible", !props.isDialogEditVisible);
  }
}

const onBack = () => {
  router.back();
};

const onSubmit = () => {
  if (props.isCheckBranch) {
    useSettingStore().branch_id === "*"
      ? showDialog({
          title: "សូមជ្រើសរើសសាខា មុនពេលបញ្ចូលទិន្នន័យផ្សេងៗ!",
          icon: "warning",
          isConfirm: false,
        })
      : emit("onSubmit", refForm.value?.validate());
  } else {
    emit("onSubmit", refForm.value?.validate());
  }
};

const onSubmitPrint = () => {
  if (props.isCheckBranch) {
    useSettingStore().branch_id === "*"
      ? showDialog({
         title: "សូមជ្រើសរើសសាខា មុនពេលបញ្ចូលទិន្នន័យផ្សេងៗ!",
          icon: "warning",
          isConfirm: false,
        })
      : emit("onSubmitPrint", refForm.value?.validate());
  } else {
    emit("onSubmitPrint", refForm.value?.validate());
  }
};

const onUpdate = debounce((item) => emit("onUpdate", item), 500);

const onClear = () => {
  emit("onClear");
};

const _loading = ref(false);

const $loading = computed({
  get() {
    return props.loading !== undefined ? props.loading : _loading.value;
  },
  set(value) {
    props.loading !== undefined
      ? emit("update:loading", value)
      : (_loading.value = value);
  },
});

const triggerExcel = () => {
  emit("onExcel");
};
defineExpose({
  onSubmit,
  handlePrint,
  toggleFilters,
  scrollToBottom,
});
</script>

<template>
  <div
    :class="{
      'data-tab-list-height': isFullHeightTab,
      'data-list-height': isFullHeight,
    }"
  >
    <VLayout class="chat-app-layout h-100" style="z-index: 0" :class="border">
      <VMain class="chat-content-container">
        <div class="d-flex flex-column h-100">
          <VCard style="overflow-x: auto" no-actions class="border-none">
            <!---Card Header-->
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
                    gap: 1rem; /* Added gap for spacing */
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
                      <VCardTitle class="ml-2 text-primary">
                        <span class="text-primary">{{ $t(title) }}</span>
                      </VCardTitle>
                    </div>
                  </h5>

                  <!---Card Action Button-->
                  <div class="w-100 d-flex justify-end align-center">
                    <slot name="card-header"></slot>
                    <IconBtn
                      rounded
                      v-if="isBack"
                      size="30"
                      class="mr-1"
                      @click.prevent="onBack"
                      :aria-label="$t('Back')"
                    >
                      <VIcon icon="tabler-arrow-left" size="20" />
                      <VTooltip
                        location="top"
                        transition="scale-transition"
                        :aria-label="$t('Back')"
                      >
                        <span>{{ $t("Back") }}</span>
                      </VTooltip>
                    </IconBtn>
                    <IconBtn
                      rounded
                      v-if="isRefresh"
                      size="30"
                      class="mr-1"
                      :aria-label="$t('Refresh')"
                    >
                      <VIcon icon="tabler-refresh" size="20" />
                      <VTooltip
                        location="top"
                        transition="scale-transition"
                        activator="parent"
                        :aria-label="$t('Refresh')"
                      >
                        {{ $t("Refresh") }}
                      </VTooltip>
                    </IconBtn>
                    <IconBtn
                      rounded
                      size="30"
                      class="mr-1"
                      v-if="isExcel"
                      @click.prevent="triggerExcel"
                      :aria-label="$t('Excel')"
                    >
                      <VTooltip
                        location="top"
                        transition="scale-transition"
                        activator="parent"
                        :aria-label="$t('Excel')"
                      >
                        {{ $t("Excel") }}
                      </VTooltip>
                      <VIcon icon="tabler-file-spreadsheet" size="20" />
                    </IconBtn>
                    <IconBtn
                      rounded
                      size="30"
                      class="mr-1"
                      v-if="isPrint"
                      @click.prevent="handlePrint"
                      :aria-label="$t('Print')"
                    >
                      <VTooltip
                        location="top"
                        transition="scale-transition"
                        activator="parent"
                        :aria-label="$t('Print')"
                      >
                        {{ $t("Print") }}
                      </VTooltip>
                      <VIcon icon="tabler-printer" size="20" />
                    </IconBtn>
                    <IconBtn
                      rounded
                      size="30"
                      class="mr-1"
                      v-if="isPrintEmpty"
                      @click.prevent="onPrint"
                      :aria-label="$t('Print')"
                    >
                      <VTooltip
                        location="top"
                        transition="scale-transition"
                        activator="parent"
                        :aria-label="$t('Print')"
                      >
                        {{ $t("Print") }}
                      </VTooltip>
                      <VIcon icon="tabler-printer" size="20" />
                    </IconBtn>
                    <!-- <IconBtn
                      rounded
                      @click.prevent="toggleFilters"
                           size="30"
                      v-if="isFilter"
                      class="mr-2"
                    >
                      <VTooltip
                        location="top"
                        transition="scale-transition"
                        activator="parent"
                      >
                        {{ $t("Filter") }}
                      </VTooltip>
                      <VIcon icon="tabler-search" size="20" />
                    </IconBtn> -->
                    <IconBtn
                      rounded
                      @click.prevent="toggleFilters"
                      size="30"
                      class="mr-2"
                      v-if="isFilter"
                      :aria-label="$t('Filter')"
                    >
                      <VTooltip
                        location="top"
                        transition="scale-transition"
                        activator="parent"
                        :aria-label="$t('Filter')"
                      >
                        {{ $t("Filter") }}
                      </VTooltip>
                      <VIcon
                        :icon="
                          showFilters[0] == 0
                            ? 'tabler-filter-up'
                            : 'tabler-filter-down'
                        "
                        size="20"
                      />
                    </IconBtn>
                    <VBtn
                      size="30"
                      v-if="
                        (createDialog || createPage) &&
                        (!canCreate || hasPermission(canCreate))
                      "
                      @click.prevent="create"
                      variant="tonal"
                      :aria-label="$t('Create')"
                    >
                      <VTooltip
                        location="top"
                        transition="scale-transition"
                        activator="parent"
                        :aria-label="$t('Create')"
                      >
                        {{ $t("Create") }}
                      </VTooltip>
                      <VIcon icon="tabler-plus" size="20" />
                    </VBtn>

                    <VBtn
                      size="30"
                      v-if="
                        (editDialog || editPage) &&
                        (!canEdit || hasPermission(canEdit))
                      "
                      @click.prevent="edit"
                      variant="tonal"
                      color="warning"
                      :aria-label="$t('Edit')"
                    >
                      <VTooltip
                        location="top"
                        transition="scale-transition"
                        activator="parent"
                        :aria-label="$t('Edit')"
                      >
                        {{ $t("Edit") }}
                      </VTooltip>
                      <VIcon icon="tabler-pencil" size="20" />
                    </VBtn>
                  </div>
                </div>
              </VCardItem>
              <VDivider />
            </template>

            <!---Card Filter Slot-->
            <!-- <div id="app-card-filter-panel" v-if="isFilter">
              <VExpansionPanels v-model="showFilters">
                <VExpansionPanel>
                  <VExpansionPanelText>
                    <slot name="filter"></slot>
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </div> -->
            <div id="app-card-filter-panel">
              <VExpandTransition>
                <div v-if="renderFilterContent && isFilterOpen">
                  <div class="pa-2 ma-1">
                    <slot name="filter"></slot>
                  </div>
                  <VDivider />
                </div>
              </VExpandTransition>
            </div>

            <!---Card Body Slot-->
            <VCol
              ref="printAreaRef"
              id="app-card-print-area"
              class="h-100 p-0"
              :class="{
                'content-scroll': isFullHeightTab || isFullHeight,
              }"
            >
              <div class="print-hide-div">
                <slot name="headerPrint"></slot>
              </div>
              <VForm
                ref="refForm"
                validate-on="submit"
                @submit.prevent="onSubmit"
                class="p-0"
              >
                <slot />
              </VForm>
              <div class="print-hide-div">
                <slot name="footerPrint"></slot>
              </div>
            </VCol>

            <VOverlay
              v-model="$loading"
              contained
              persistent
              scroll-strategy="none"
              class="align-center justify-center"
            >
              <VProgressCircular
                indeterminate
                aria-label="Loading progress App Card"
                role="progressbar"
              />
            </VOverlay>
          </VCard>
          <VForm class="chat-log-message-form">
            <template v-if="isSubmit || isClear || isUpdate">
              <VDivider />
              <div>
                <VCol class="d-flex flex-row" :class="footerAlign">
                  <VBtn
                    v-if="isClear"
                    color="error"
                    class="mr-1"
                    @click.prevent="onClear"
                    :loading="loading"
                  >
                    <VIcon start icon="tabler-x" />
                    {{ $t("Clear") }}
                  </VBtn>

                  <div class="d-flex flex-row">
                    <VBtn
                      v-if="
                        isUpdate && (!canUpdate || hasPermission(canUpdate))
                      "
                      @click.prevent="onUpdate"
                      :loading="loading"
                      color="warning"
                    >
                      <VIcon start icon="tabler-pencil" />
                      {{ $t("Update") }}
                    </VBtn>
                    <VBtn
                      v-if="isSubmitPrint"
                      @click.prevent="onSubmitPrint"
                      :loading="loading"
                      color="warning"
                    >
                      <VIcon start icon="tabler-printer" />
                      {{ $t("Submit & Print") }}
                    </VBtn>
                    <VBtn
                      id="page-tour-submit"
                      v-if="isSubmit"
                      @click.prevent="onSubmit"
                      :loading="loading"
                      class="ml-2"
                    >
                      <VIcon start icon="tabler-check" />
                      {{ $t("Submit") }}
                    </VBtn>
                  </div>
                </VCol>
              </div>
            </template>
          </VForm>
        </div>
      </VMain>
    </VLayout>
  </div>
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
/* Ensure the VCard takes the full viewport height minus any offsets */

/* Ensure the card's content area expands to fill available space */
#app-card-print-area {
  flex: 1;
  overflow-y: auto; /* Allow scrolling within the content area */
}

/* Maintain existing print and filter panel styles */
.print-hide-div {
  display: none;
}

@media print {
  .print-hide-div {
    display: block !important;
  }
}

#app-card-print-area {
  flex: 1 1 auto;
  overflow: visible;
  max-height: none;
  min-height: 0;
}

/* When scrollable, cap by computed var that includes tab height */
#app-card-print-area.content-scroll {
  overflow-y: auto;
  max-height: var(--appcard-max, calc(100dvh - 84px));
}

:deep(#app-card-filter-panel .v-expansion-panel) {
  box-shadow: none !important;
  border: none;
}

:deep(#app-card-filter-panel .v-expansion-panel__shadow) {
  box-shadow: none !important;
  border: none;
}

:deep(#app-card-filter-panel .v-expansion-panel-text__wrapper) {
  padding: 12px 12px 12px 12px !important;
  border: none;
}

.data-list-height {
  max-height: calc(100dvh - 84px); /* Use dvh instead of vh */
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .data-list-height {
    max-height: calc(100dvh - 84px); /* Adjust as needed */
    position: relative;
  }

  /* Ensure the table container takes full available height */
  .h-100 {
    max-height: 100% !important;
    min-height: 0; /* Important for flex children */
  }
}

.data-tab-list-height {
  max-height: calc(100dvh - 155px); /* Use dvh instead of vh */
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .data-tab-list-height {
    max-height: calc(100dvh - 155px); /* Adjust as needed */
    position: relative;
  }

  /* Ensure the table container takes full available height */
  .h-100 {
    max-height: 100% !important;
    min-height: 0; /* Important for flex children */
  }
}
</style>
