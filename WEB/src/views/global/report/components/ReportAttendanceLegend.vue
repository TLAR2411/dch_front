<script setup>
defineProps({
  showScheduleNote: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <div class="report-legend">
    <span class="legend-item"><strong>✓</strong> {{ $t("Present") }}</span>
    <span class="legend-item"><strong>A</strong> {{ $t("Absent") }}</span>
    <span class="legend-item"><strong>P</strong> {{ $t("Ask Permission") }}</span>
    <span class="legend-item"><strong>L</strong> {{ $t("Late") }}</span>
    <span v-if="showScheduleNote" class="legend-item legend-muted">
      {{ $t("Grey cell = weekend, holiday, or subject not scheduled that day") }}
    </span>
  </div>
</template>

<style scoped>
.report-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin-bottom: 12px;
}

.legend-item strong {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

.legend-muted {
  font-style: italic;
}

@media print {
  .report-legend {
    color: #333;
    margin-bottom: 8px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
