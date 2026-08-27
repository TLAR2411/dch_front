<script setup>
import { ref, computed } from "vue";
import PageTourHelpButton from "@/components/PageTourHelpButton.vue";

const props = defineProps({
  title: String,
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  isUpdate: Boolean,
  loading: Boolean,
  /** Show ? in the title bar to replay the create-dialog tour. */
  showTourHelp: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "onCloseDialog",
  "onSubmit",
  "update:isDialogVisible",
  "onTourHelp",
]);

const refForm = ref();

const onFormSubmit = async () => {
  emit("onSubmit", refForm.value?.validate());
};

// Drag-to-resize state
const minHeight = 30; // vh, below this = close
const defaultHeight = computed(() => (props.isUpdate ? 90 : 60)); // vh
const maxHeight = 95; // vh

const sheetHeight = ref(defaultHeight.value);
const dragging = ref(false);
const startY = ref(0);
const startHeight = ref(0);

const onDragStart = (e) => {
  dragging.value = true;
  startY.value = e.touches ? e.touches[0].clientY : e.clientY;
  startHeight.value = sheetHeight.value;
  window.addEventListener("touchmove", onDragMove, { passive: false });
  window.addEventListener("touchend", onDragEnd);
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);
};

const onDragMove = (e) => {
  if (!dragging.value) return;
  e.preventDefault();
  const currentY = e.touches ? e.touches[0].clientY : e.clientY;
  const deltaY = startY.value - currentY; // positive = dragged up
  const deltaVh = (deltaY / window.innerHeight) * 100;
  const newHeight = startHeight.value + deltaVh;
  sheetHeight.value = Math.min(Math.max(newHeight, 10), maxHeight);
};

const onDragEnd = () => {
  dragging.value = false;
  window.removeEventListener("touchmove", onDragMove);
  window.removeEventListener("touchend", onDragEnd);
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);

  if (sheetHeight.value < minHeight) {
    emit("onCloseDialog");
    emit("update:isDialogVisible", false);
  } else {
    // Snap back to a reasonable height if dragged too small but above close threshold
    sheetHeight.value = Math.max(sheetHeight.value, 40);
  }
};

// Reset height whenever the sheet opens
watch(
  () => props.isDialogVisible,
  (val) => {
    if (val) sheetHeight.value = defaultHeight.value;
  },
);
</script>

<template>
  <v-bottom-sheet
    :model-value="isDialogVisible"
    @update:model-value="emit('update:isDialogVisible', $event)"
  >
    <v-card style="border-radius: 16px 16px 0 0; overflow: hidden">
      <div
        class="d-flex flex-column"
        :style="{
          height: sheetHeight + 'vh',
          transition: dragging ? 'none' : 'height 0.2s ease',
        }"
      >
        <!-- Drag handle -->
        <div
          class="d-flex justify-center pt-3 pb-2 flex-shrink-0"
          style="cursor: grab; touch-action: none"
          @touchstart="onDragStart"
          @mousedown="onDragStart"
        >
          <div
            style="
              width: 36px;
              height: 4px;
              border-radius: 99px;
              background: rgba(0, 0, 0, 0.2);
            "
          />
        </div>

        <!-- Header -->
        <div
          class="d-flex justify-space-between align-center px-4 pb-3 flex-shrink-0"
        >
          <span class="text-subtitle-1 font-weight-medium">{{ title }}</span>
          <div class="d-flex align-center">
            <PageTourHelpButton
              v-if="showTourHelp"
              button-id="page-tour-dialog-help-btn"
              tooltip="How to use this form"
              @click="emit('onTourHelp')"
            />
            <v-btn
              icon
              variant="text"
              size="small"
              @click="emit('onCloseDialog')"
            >
              <v-icon>tabler-x</v-icon>
            </v-btn>
          </div>
        </div>

        <v-divider class="flex-shrink-0" />

        <VForm
          ref="refForm"
          class="pa-4"
          style="overflow-y: auto; flex: 1 1 auto; min-height: 0"
          @submit.prevent="onFormSubmit"
        >
          <slot />
        </VForm>

        <v-divider class="flex-shrink-0" />

        <div class="d-flex gap-3 pa-4 flex-shrink-0">
          <v-btn
            id="page-tour-dialog-submit"
            block
            color="primary"
            variant="flat"
            :loading="loading"
            @click="onFormSubmit"
          >
            {{ isUpdate ? "Update" : "Create" }}
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-bottom-sheet>
</template>
