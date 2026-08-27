<script setup>
/**
 * Printed attendance report header — logo + title + class / program meta.
 * Matches the school sheet layout (green labels, orange values).
 */
defineProps({
  title: {
    type: String,
    required: true,
  },
  classLabel: {
    type: String,
    default: "—",
  },
  programName: {
    type: String,
    default: "—",
  },
  useKhmerMoul: {
    type: Boolean,
    default: false,
  },
  logoSrc: {
    type: String,
    default: "/logo/dchlogoheader.png",
  },
});
</script>

<template>
  <div id="page-tour-att-report-sheet-header" class="report-sheet-header">
    <div class="report-sheet-brand">
      <div class="report-logo-wrap">
        <img
          :src="logoSrc"
          alt="Dewey Childcare House"
          class="report-logo"
        />
      </div>
      <div
        id="page-tour-att-report-sheet-title"
        class="report-title"
        :class="{ moul: useKhmerMoul }"
      >
        {{ title }}
      </div>
    </div>

    <div
      id="page-tour-att-report-sheet-meta"
      class="report-meta d-flex justify-space-between mb-3"
    >
      <div :class="{ moul: useKhmerMoul }">
        <div>
          <span class="meta-label">{{ $t("class:") }}</span>
          <span class="meta-class-name">{{ classLabel }}</span>
        </div>
        <slot name="left-extra" />
      </div>
      <div class="text-end" :class="{ moul: useKhmerMoul }">
        <div>
          <span class="meta-label">{{ $t("program:") }}</span>
          <span class="meta-class-name">{{ programName }}</span>
        </div>
        <slot name="right-extra" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-sheet-brand {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 10px;
}

.report-logo-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.report-logo {
  display: block;
  max-width: 620px;
  max-height: 110px;
  width: auto;
  height: auto;
  object-fit: contain;
  margin-inline: auto;
}

.report-title {
  margin-top: 10px;
  width: 100%;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: center;
  line-height: 1.35;
  color: #00620d !important;
}

.report-title.moul,
.report-meta .moul {
  font-family: "moul", sans-serif !important;
  font-weight: 400 !important;
}

.report-meta {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.55;
}

.meta-label {
  font-weight: 700;
  margin-right: 4px;
  color: #00620d !important;
}

.meta-class-name {
  font-weight: 700;
  color: #e6a100 !important;
}

@media print {
  .report-logo-wrap {
    justify-content: center;
  }

  .report-logo {
    max-width: 580px;
    max-height: 100px;
    margin-inline: auto;
  }

  .report-title {
    font-size: 16pt;
    font-weight: 800;
    text-align: center;
    color: #00620d !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .report-meta {
    font-size: 12pt;
    font-weight: 700;
  }

  .meta-label {
    font-weight: 700;
    color: #00620d !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .meta-class-name {
    font-weight: 700;
    color: #e6a100 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
