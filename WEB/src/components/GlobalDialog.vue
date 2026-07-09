<!-- components/GlobalDialog.vue -->
<template>
  <VDialog v-if="isTimer == false" v-model="isOpen" persistent max-width="400">
    <!-- Dialog close btn -->
    <!-- <DialogCloseBtn @click="isOpen = !isOpen" /> -->

    <!-- Dialog Content -->
    <VCard>
      <!-- <VCardTitle style="padding: 16px; padding-bottom: 0">
        
      </VCardTitle> -->
      <!-- <VDivider /> -->
      <VCardText class="pb-4">
        <div class="d-flex flex-row align-center">
          <div class="d-flex flex-column align-center">
            <VIcon v-if="icon == 'success'" color="success" size="22px"
              >tabler-circle-check-filled</VIcon
            >
            <VIcon v-if="icon == 'error'" color="error" size="22px"
              >tabler-alert-triangle-filled</VIcon
            >
            <VIcon v-if="icon == 'warning'" color="warning" size="22px"
              >tabler-alert-circle-filled</VIcon
            >
            <VIcon v-if="icon == 'delete'" color="error" size="22px"
              >tabler-trash</VIcon
            >
          </div>

          <div class="d-flex flex-column ml-2 align-start">
            <span
              v-if="icon == 'success'"
              class="text-h5 font-weight-bold"
              style="font-size: 16px !important"
              >Success</span
            >
            <span
              v-if="icon == 'error'"
              class="text-h5 font-weight-bold"
              style="font-size: 16px !important"
              >Error</span
            >
            <span
              v-if="icon == 'warning'"
              class="text-h5 font-weight-bold"
              style="font-size: 16px !important"
              >Warning</span
            >
            <span
              v-if="icon == 'delete'"
              class="text-h5 font-weight-bold"
              style="font-size: 16px !important"
              >Delete</span
            >
          </div>
        </div>
        <div class="mt-2">
          <span style="font-size: 0.9rem; display: block">
            {{ title }}
          </span>
        </div>
      </VCardText>

      <!-- <VDivider /> -->
      <VCardText
        class="d-flex justify-end gap-3 flex-wrap"
        style="padding: 16px"
      >
        <VBtn
          v-if="isCancle"
          color="secondary"
          variant="tonal"
          size="small"
          @click="onCancel"
        >
          {{ $t(cancelText) }}
        </VBtn>
        <VBtn
          v-if="isConfirm"
          :color="confirmColor"
          @click="onConfirm"
          size="small"
        >
          {{ $t(confirmText) }}
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>

  <VSnackbar v-else v-model="isOpen">
    <VIcon :color="icon">{{ iconMapping[icon] }}</VIcon>
    {{ title }}

    <template #actions>
      <VBtn color="error" @click="isOpen = false"> Close </VBtn>
    </template>
  </VSnackbar>

  <!-- <VSnackbar v-else v-model="isOpen" location="top"> </VSnackbar> -->
</template>
<script setup>
import { ref } from "vue";

const isOpen = ref(false);
const isCancle = ref(true);
const isConfirm = ref(true);
const title = ref("");
const icon = ref(null);
const confirmColor = ref("primary");
let resolvePromise = null;
const timeoutId = ref(null);
const isTimer = ref(false);

const cancelText = ref(null);
const confirmText = ref(null);
const iconMapping = {
  success: "tabler-check",
  error: "tabler-x",
  warning: "tabler-question-mark",
};

const openDialog = (
  dialogTitle,
  dialogIcon,
  dialogIsCancle,
  dialogIsConfirm,
  dialogConfirmColor,
  autoCloseDelay = 0,
  dialogCancelText,
  dialogConfirmText,
) => {
  title.value = dialogTitle;
  icon.value = dialogIcon;
  isOpen.value = true;
  isCancle.value = dialogIsCancle ?? true;
  isConfirm.value = dialogIsConfirm ?? true;
  confirmColor.value = dialogConfirmColor;
  isTimer.value = autoCloseDelay > 0 ? true : false;
  cancelText.value = dialogCancelText ?? "Close";
  confirmText.value = dialogConfirmText ?? "OK";

  // Clear any existing timeout
  if (timeoutId.value) {
    clearTimeout(timeoutId.value);
    timeoutId.value = null;
  }

  // Set auto-close timeout if delay is specified
  if (autoCloseDelay > 0) {
    timeoutId.value = setTimeout(() => {
      onConfirm();
    }, autoCloseDelay);
  }

  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
};

const onConfirm = () => {
  isOpen.value = false;
  if (timeoutId.value) {
    clearTimeout(timeoutId.value);
    timeoutId.value = null;
  }
  if (resolvePromise) resolvePromise(true);
};

const onCancel = () => {
  isOpen.value = false;
  if (timeoutId.value) {
    clearTimeout(timeoutId.value);
    timeoutId.value = null;
  }
  if (resolvePromise) resolvePromise(false);
};

defineExpose({ openDialog });
</script>
