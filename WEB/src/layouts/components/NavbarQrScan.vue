<script setup>
import LeaveQrScanDialog from "@/views/qr-scan/LeaveQrScanDialog.vue";

const isDialog = ref(false);
const onDialog = () => {
  isDialog.value = true;
};
</script>

<template>
  <LeaveQrScanDialog v-if="isDialog" v-model:isDialogVisible="isDialog" />
  <VBtn icon="tabler-scan" variant="text" color="primary" @click="onDialog" />
</template>
