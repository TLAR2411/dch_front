<script setup>
/**
 * Report signature footer for English / Khmer / Chinese.
 * - English: Date → Role → signature → Name
 * - Khmer/Chinese: Date → Heading → Role → signature → Name
 * - Khmer right column also shows lunar date (khmer-chhankitek-calendar)
 * - Optional uploaded signature images (crop + drag to position when editable)
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Cropper } from "vue-advanced-cropper";
import "vue-advanced-cropper/dist/style.css";
import { toKhmerLunarDate } from "khmer-chhankitek-calendar";
import {
  showReportSignatures,
  saveReportSignatures,
  uploadSignature,
} from "@/services/api/reportSignatures";
import { useSettingStore } from "@/stores/settingStore";
import { usePartStore } from "@/stores/partStore";
import successAlert from "@/helper/successAlert.js";

const props = defineProps({
  editable: {
    type: Boolean,
    default: false,
  },
});

const settingStore = useSettingStore();
const partStore = usePartStore();

/** Max upload size — matches bucket file_size_limit (2MB) */
const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
/** Stored as % of signature box (scales correctly in print/PDF) */
const DEFAULT_SIGNATURE_W = 42;
const DEFAULT_SIGNATURE_X = 29;
const DEFAULT_SIGNATURE_Y = 12;
/** Legacy pixel coords used a typical ~280×70 box before % storage */
const LEGACY_BOX_W = 280;
const LEGACY_BOX_H = 70;

const locale = computed(() => {
  if (partStore.cur_id === 2 || partStore.system_part === "khmer") return "khmer";
  if (partStore.cur_id === 3 || partStore.system_part === "chinese")
    return "chinese";
  if (partStore.cur_id === 1 || partStore.system_part === "english")
    return "english";
  return null;
});

const curId = computed(() => {
  if (locale.value === "khmer") return 2;
  if (locale.value === "chinese") return 3;
  if (locale.value === "english") return 1;
  return null;
});

const isAsianLayout = computed(
  () => locale.value === "khmer" || locale.value === "chinese",
);

const loading = ref(false);
const saving = ref(false);
const uploadingSide = ref(null);
const dialog = ref(false);
const recordId = ref(null);

function signatureDefaults() {
  return {
    left_signature_url: "",
    left_signature_x: DEFAULT_SIGNATURE_X,
    left_signature_y: DEFAULT_SIGNATURE_Y,
    left_signature_w: DEFAULT_SIGNATURE_W,
    right_signature_url: "",
    right_signature_x: DEFAULT_SIGNATURE_X,
    right_signature_y: DEFAULT_SIGNATURE_Y,
    right_signature_w: DEFAULT_SIGNATURE_W,
  };
}

function showError(message) {
  successAlert.fire({
    icon: "error",
    title: message || "Something went wrong",
  });
}

function showSuccess(message) {
  successAlert.fire({
    icon: "success",
    title: message,
  });
}

function friendlyUploadError(err) {
  const raw = String(err?.message || err || "").toLowerCase();
  if (
    raw.includes("maximum allowed size") ||
    raw.includes("payload too large") ||
    raw.includes("entity too large") ||
    raw.includes("file size")
  ) {
    return "Image is too large. Please use a file under 2MB.";
  }
  if (raw.includes("mime") || raw.includes("not allowed")) {
    return "This image type is not supported. Use PNG, JPG, or WebP.";
  }
  if (raw.includes("network") || raw.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  return err?.message || "Failed to upload signature image.";
}

function localeDefaults() {
  if (locale.value === "khmer") {
    return {
      left_date: "",
      left_heading: "បានឃើញ និងឯកភាព",
      left_role: "អនុប្រធានប្រតិបត្តិទទួលបន្ទុកកម្មវិធីមុនមត្តេយ្យ និងមត្តេយ្យសិក្សា",
      left_name: "",
      right_date: "",
      right_heading: "រៀបចំដោយ",
      right_role: "មន្ត្រីសម្របសម្រួលកម្មវិធីមុនមត្តេយ្យ និងមត្តេយ្យសិក្សា",
      right_name: "",
      ...signatureDefaults(),
    };
  }
  if (locale.value === "chinese") {
    return {
      left_date: "",
      left_heading: "已审阅并批准",
      left_role: "执行副总裁（学前与幼儿园项目）",
      left_name: "",
      right_date: "",
      right_heading: "编制",
      right_role: "学前与幼儿园项目协调员",
      right_name: "",
      ...signatureDefaults(),
    };
  }
  return {
    left_date: "",
    left_heading: "",
    left_role: "Teacher",
    left_name: "",
    right_date: "",
    right_heading: "",
    right_role: "Academic Manager",
    right_name: "",
    ...signatureDefaults(),
  };
}

const form = ref(localeDefaults());
const draft = ref(localeDefaults());
/** Snapshot of form when dialog opened — restore on Cancel */
const formSnapshot = ref(null);

const leftFileInput = ref(null);
const rightFileInput = ref(null);

const cropDialog = ref(false);
const cropSide = ref(null);
const cropSrc = ref("");
const cropperRef = ref(null);

const dragState = ref(null);
const dialogError = ref("");
const cropError = ref("");

function clearDialogError() {
  dialogError.value = "";
}

function setDialogError(message) {
  dialogError.value = message;
  showError(message);
}

function toInputDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Convert old pixel positions → % so print/PDF matches the screen */
function normalizeSignaturePercent(x, y, w) {
  let nx = toNum(x, DEFAULT_SIGNATURE_X);
  let ny = toNum(y, DEFAULT_SIGNATURE_Y);
  let nw = toNum(w, DEFAULT_SIGNATURE_W);

  // Legacy pixel values: width was typically 60–220px
  if (nw > 100) {
    nx = (nx / LEGACY_BOX_W) * 100;
    ny = (ny / LEGACY_BOX_H) * 100;
    nw = (nw / LEGACY_BOX_W) * 100;
  }

  return {
    x: Math.min(100, Math.max(0, nx)),
    y: Math.min(100, Math.max(0, ny)),
    w: Math.min(80, Math.max(15, nw)),
  };
}

function mapSignatureFields(data, defaults) {
  const left = normalizeSignaturePercent(
    data?.left_signature_x ?? defaults.left_signature_x,
    data?.left_signature_y ?? defaults.left_signature_y,
    data?.left_signature_w ?? defaults.left_signature_w,
  );
  const right = normalizeSignaturePercent(
    data?.right_signature_x ?? defaults.right_signature_x,
    data?.right_signature_y ?? defaults.right_signature_y,
    data?.right_signature_w ?? defaults.right_signature_w,
  );

  return {
    left_signature_url: data?.left_signature_url || "",
    left_signature_x: left.x,
    left_signature_y: left.y,
    left_signature_w: left.w,
    right_signature_url: data?.right_signature_url || "",
    right_signature_x: right.x,
    right_signature_y: right.y,
    right_signature_w: right.w,
  };
}

function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatEnglishDate(value) {
  const raw = toInputDate(value);
  if (!raw) return "Date: —";
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return `Date: ${raw}`;
  const day = ordinal(d.getDate());
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `Date: ${day}, ${month} ${year}`;
}

function formatKhmerGregorianDate(value) {
  const raw = toInputDate(value);
  if (!raw) return "ថ្ងៃទី —";
  try {
    return toKhmerLunarDate(raw).gregorianDateText;
  } catch {
    return `ថ្ងៃទី ${raw}`;
  }
}

/** Matches school docs: ថ្ងៃចន្ទ ៨កើត ខែស្រាពណ៍ ឆ្នាំរោង ព.ស២៥៦៨ */
function formatKhmerLunarDate(value) {
  const raw = toInputDate(value);
  if (!raw) return "";
  try {
    const r = toKhmerLunarDate(raw);
    return `ថ្ងៃ${r.dayOfWeek} ${r.moonDayKhmer}${r.moonStatus} ខែ${r.khmerMonth} ឆ្នាំ${r.animalYear} ព.ស${r.buddhistEraYearKhmer}`;
  } catch {
    return "";
  }
}

function formatChineseDate(value) {
  const raw = toInputDate(value);
  if (!raw) return "日期：—";
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return `日期：${raw}`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDisplayDate(value) {
  if (locale.value === "khmer") return formatKhmerGregorianDate(value);
  if (locale.value === "chinese") return formatChineseDate(value);
  return formatEnglishDate(value);
}

function signatureStyle(side) {
  const source = form.value;
  const x = toNum(source[`${side}_signature_x`], DEFAULT_SIGNATURE_X);
  const y = toNum(source[`${side}_signature_y`], DEFAULT_SIGNATURE_Y);
  const w = toNum(source[`${side}_signature_w`], DEFAULT_SIGNATURE_W);
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${w}%`,
  };
}

async function loadSignatures() {
  if (!locale.value || curId.value == null) return;
  const branchId = settingStore.branch_id;
  if (!branchId) return;

  loading.value = true;
  try {
    // branch and curriculum travel as headers; the endpoint keys on them.
    const data = await showReportSignatures();

    const defaults = localeDefaults();
    if (data) {
      recordId.value = data.id;
      form.value = {
        left_date: toInputDate(data.left_date),
        left_heading: data.left_heading || defaults.left_heading,
        left_role: data.left_role || defaults.left_role,
        left_name: data.left_name || "",
        right_date: toInputDate(data.right_date),
        right_heading: data.right_heading || defaults.right_heading,
        right_role: data.right_role || defaults.right_role,
        right_name: data.right_name || "",
        ...mapSignatureFields(data, defaults),
      };
    } else {
      recordId.value = null;
      form.value = defaults;
    }
  } catch (err) {
    console.log(err);
    showError(err?.message || "Failed to load signature footer.");
  } finally {
    loading.value = false;
  }
}

function openDialog() {
  formSnapshot.value = { ...form.value };
  draft.value = { ...form.value };
  dialogError.value = "";
  dialog.value = true;
}

function cancelDialog() {
  if (formSnapshot.value) {
    form.value = { ...formSnapshot.value };
    formSnapshot.value = null;
  }
  dialogError.value = "";
  dialog.value = false;
}

function pickSignature(side) {
  clearDialogError();
  if (side === "left") leftFileInput.value?.click();
  else rightFileInput.value?.click();
}

function onSignatureFileChange(side, event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setDialogError("Please choose an image file (PNG, JPG, or WebP).");
    return;
  }

  if (file.size > MAX_SIGNATURE_BYTES) {
    setDialogError(
      "Image is too large. Please choose a file under 2MB, or crop a smaller area.",
    );
    return;
  }

  cropError.value = "";
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value);
  cropSide.value = side;
  cropSrc.value = URL.createObjectURL(file);
  cropDialog.value = true;
}

function closeCropDialog() {
  cropDialog.value = false;
  cropSide.value = null;
  cropError.value = "";
  if (cropSrc.value) {
    URL.revokeObjectURL(cropSrc.value);
    cropSrc.value = "";
  }
}

function canvasToBlob(canvas, type = "image/png", quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create image blob."));
      },
      type,
      quality,
    );
  });
}

async function applyCrop() {
  const side = cropSide.value;
  if (!side || !cropperRef.value) return;

  const result = cropperRef.value.getResult?.();
  const canvas = result?.canvas;
  if (!canvas) {
    cropError.value = "Could not crop image. Try again.";
    showError(cropError.value);
    return;
  }

  const branchId = settingStore.branch_id;
  if (!branchId || curId.value == null) {
    cropError.value = "Please select a branch first.";
    showError(cropError.value);
    return;
  }

  uploadingSide.value = side;
  cropError.value = "";
  try {
    const blob = await canvasToBlob(canvas, "image/png");
    if (blob.size > MAX_SIGNATURE_BYTES) {
      throw new Error(
        "Cropped image is still too large. Zoom in or crop a smaller area.",
      );
    }

    // The path is composed server-side from the caller's own branch. It used
    // to be built here and sent, which is how any holder of the publishable
    // key could overwrite or delete another branch's signature.
    const { url } = await uploadSignature({ side, blob });
    draft.value[`${side}_signature_url`] = url;
    draft.value[`${side}_signature_x`] = DEFAULT_SIGNATURE_X;
    draft.value[`${side}_signature_y`] = DEFAULT_SIGNATURE_Y;
    draft.value[`${side}_signature_w`] = DEFAULT_SIGNATURE_W;

    form.value[`${side}_signature_url`] = url;
    form.value[`${side}_signature_x`] = DEFAULT_SIGNATURE_X;
    form.value[`${side}_signature_y`] = DEFAULT_SIGNATURE_Y;
    form.value[`${side}_signature_w`] = DEFAULT_SIGNATURE_W;

    clearDialogError();
    closeCropDialog();
    showSuccess("Signature image ready. Save to keep it.");
  } catch (err) {
    console.log(err);
    const message = friendlyUploadError(err);
    cropError.value = message;
    showError(message);
  } finally {
    uploadingSide.value = null;
  }
}

function clearSignature(side) {
  draft.value[`${side}_signature_url`] = "";
  draft.value[`${side}_signature_x`] = DEFAULT_SIGNATURE_X;
  draft.value[`${side}_signature_y`] = DEFAULT_SIGNATURE_Y;
  draft.value[`${side}_signature_w`] = DEFAULT_SIGNATURE_W;
  form.value[`${side}_signature_url`] = "";
  form.value[`${side}_signature_x`] = DEFAULT_SIGNATURE_X;
  form.value[`${side}_signature_y`] = DEFAULT_SIGNATURE_Y;
  form.value[`${side}_signature_w`] = DEFAULT_SIGNATURE_W;
}

function buildPayload(source) {
  const defaults = localeDefaults();
  return {
    branch_id: settingStore.branch_id,
    cur_id: curId.value,
    left_date: source.left_date || null,
    left_heading:
      (source.left_heading || "").trim() || defaults.left_heading || null,
    left_role: (source.left_role || "").trim() || defaults.left_role,
    left_name: (source.left_name || "").trim() || null,
    right_date: source.right_date || null,
    right_heading:
      (source.right_heading || "").trim() || defaults.right_heading || null,
    right_role: (source.right_role || "").trim() || defaults.right_role,
    right_name: (source.right_name || "").trim() || null,
    left_signature_url: source.left_signature_url || null,
    left_signature_x: toNum(source.left_signature_x),
    left_signature_y: toNum(source.left_signature_y),
    left_signature_w: toNum(source.left_signature_w, DEFAULT_SIGNATURE_W),
    right_signature_url: source.right_signature_url || null,
    right_signature_x: toNum(source.right_signature_x),
    right_signature_y: toNum(source.right_signature_y),
    right_signature_w: toNum(source.right_signature_w, DEFAULT_SIGNATURE_W),
    updated_at: new Date().toISOString(),
  };
}

async function persistSignatures(
  source,
  { closeDialog = false, quiet = false } = {},
) {
  if (!props.editable || !locale.value || curId.value == null) return false;
  const branchId = settingStore.branch_id;
  if (!branchId) {
    setDialogError("Please select a branch first.");
    return false;
  }

  const payload = buildPayload(source);
  saving.value = true;
  try {
    // One idempotent call for both cases. The endpoint upserts on
    // (branch_id, cur_id), so the insert-or-update split the two branches used
    // to make is no longer the client's business.
    const saved = await saveReportSignatures(payload);
    recordId.value = saved?.id ?? recordId.value;

    const defaults = localeDefaults();
    form.value = {
      left_date: toInputDate(payload.left_date),
      left_heading: payload.left_heading || "",
      left_role: payload.left_role,
      left_name: payload.left_name || "",
      right_date: toInputDate(payload.right_date),
      right_heading: payload.right_heading || "",
      right_role: payload.right_role,
      right_name: payload.right_name || "",
      ...mapSignatureFields(payload, defaults),
    };

    if (closeDialog) {
      formSnapshot.value = null;
      dialogError.value = "";
      dialog.value = false;
    }

    if (!quiet) showSuccess("Signature footer saved.");
    return true;
  } catch (err) {
    console.log(err);
    const message = err?.message || "Failed to save signature footer.";
    setDialogError(message);
    return false;
  } finally {
    saving.value = false;
  }
}

async function saveSignatures() {
  await persistSignatures(draft.value, { closeDialog: true });
}

function onPointerDown(side, event) {
  if (!props.editable || !form.value[`${side}_signature_url`]) return;
  event.preventDefault();

  const target = event.currentTarget;
  const parent = target.parentElement;
  if (!parent) return;

  const parentRect = parent.getBoundingClientRect();
  if (!parentRect.width || !parentRect.height) return;

  const widthPct = toNum(
    form.value[`${side}_signature_w`],
    DEFAULT_SIGNATURE_W,
  );
  const heightPct = (target.offsetHeight / parentRect.height) * 100;

  dragState.value = {
    side,
    startX: event.clientX,
    startY: event.clientY,
    originX: toNum(form.value[`${side}_signature_x`], DEFAULT_SIGNATURE_X),
    originY: toNum(form.value[`${side}_signature_y`], DEFAULT_SIGNATURE_Y),
    widthPct,
    heightPct,
    parentW: parentRect.width,
    parentH: parentRect.height,
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function onPointerMove(event) {
  const state = dragState.value;
  if (!state) return;

  const dxPct = ((event.clientX - state.startX) / state.parentW) * 100;
  const dyPct = ((event.clientY - state.startY) / state.parentH) * 100;
  const maxX = Math.max(0, 100 - state.widthPct);
  const maxY = Math.max(0, 100 - state.heightPct);

  form.value[`${state.side}_signature_x`] = Math.min(
    maxX,
    Math.max(0, state.originX + dxPct),
  );
  form.value[`${state.side}_signature_y`] = Math.min(
    maxY,
    Math.max(0, state.originY + dyPct),
  );
}

async function onPointerUp() {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);

  const state = dragState.value;
  dragState.value = null;
  if (!state) return;

  draft.value[`${state.side}_signature_x`] =
    form.value[`${state.side}_signature_x`];
  draft.value[`${state.side}_signature_y`] =
    form.value[`${state.side}_signature_y`];

  await persistSignatures(form.value, { quiet: true });
}

watch(
  () => [settingStore.branch_id, partStore.cur_id, partStore.system_part],
  () => {
    form.value = localeDefaults();
    draft.value = localeDefaults();
    recordId.value = null;
    loadSignatures();
  },
);

onMounted(loadSignatures);

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value);
});
</script>

<template>
  <div
    v-if="locale"
    class="report-footer-wrap"
    :class="[
      { 'is-loading': loading },
      locale === 'khmer' ? 'footer-khmer' : '',
      locale === 'chinese' ? 'footer-chinese' : '',
    ]"
  >
    <div
      v-if="editable"
      class="d-flex justify-end mb-2 report-footer-actions report-no-print"
    >
      <VBtn
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="tabler-edit"
        @click="openDialog"
      >
        Set signatures
      </VBtn>
    </div>

    <VRow class="report-footer-grid" dense>
      <!-- Left -->
      <VCol cols="5" class="footer-col text-center">
        <div class="footer-line">{{ formatDisplayDate(form.left_date) }}</div>
        <div v-if="isAsianLayout && form.left_heading" class="footer-line">
          {{ form.left_heading }}
        </div>
        <div class="footer-line footer-strong footer-role moul">
          {{ form.left_role }}
        </div>
        <div
          class="footer-sign-space"
          :class="{ 'is-editable': editable && form.left_signature_url }"
        >
          <img
            v-if="form.left_signature_url"
            :src="form.left_signature_url"
            alt="Left signature"
            class="signature-img"
            draggable="false"
            :style="signatureStyle('left')"
            @pointerdown="onPointerDown('left', $event)"
          />
        </div>
        <div class="footer-line footer-strong moul">
          {{ form.left_name || "—" }}
        </div>
      </VCol>

      <VCol cols="2" class="footer-gap" />

      <!-- Right -->
      <VCol cols="5" class="footer-col text-center">
        <div
          v-if="locale === 'khmer' && form.right_date"
          class="footer-line footer-lunar"
        >
          {{ formatKhmerLunarDate(form.right_date) }}
        </div>
        <div class="footer-line">
          ត្រូវនឹង{{ formatDisplayDate(form.right_date) }}
        </div>
        <div v-if="isAsianLayout && form.right_heading" class="footer-line">
          {{ form.right_heading }}
        </div>
        <div class="footer-line footer-strong footer-role moul">
          {{ form.right_role }}
        </div>
        <div
          class="footer-sign-space"
          :class="{ 'is-editable': editable && form.right_signature_url }"
        >
          <img
            v-if="form.right_signature_url"
            :src="form.right_signature_url"
            alt="Right signature"
            class="signature-img"
            draggable="false"
            :style="signatureStyle('right')"
            @pointerdown="onPointerDown('right', $event)"
          />
        </div>
        <div class="footer-line footer-strong moul">
          {{ form.right_name || "—" }}
        </div>
      </VCol>
    </VRow>

    <input
      ref="leftFileInput"
      type="file"
      accept="image/*"
      hidden
      class="report-no-print"
      @change="onSignatureFileChange('left', $event)"
    />
    <input
      ref="rightFileInput"
      type="file"
      accept="image/*"
      hidden
      class="report-no-print"
      @change="onSignatureFileChange('right', $event)"
    />

    <VDialog v-model="dialog" max-width="760" scrollable>
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between pa-5 pb-2">
          <div>
            <div class="text-h6">Set signature footer</div>
            <div class="text-body-2 text-medium-emphasis mt-1">
              Saved for this curriculum ({{ locale }}) and used on printouts.
              Drag signatures on the report to reposition.
            </div>
          </div>
          <VBtn icon variant="text" :disabled="saving" @click="cancelDialog">
            <VIcon>tabler-x</VIcon>
          </VBtn>
        </VCardTitle>

        <VCardText class="pa-5 pt-3">
          <VAlert
            v-if="dialogError"
            type="error"
            variant="tonal"
            class="mb-4"
            density="comfortable"
            closable
            @click:close="clearDialogError"
          >
            {{ dialogError }}
          </VAlert>

          <VRow>
            <VCol cols="12" md="6">
              <div class="text-subtitle-2 mb-3">Left column</div>
              <VTextField
                v-model="draft.left_date"
                type="date"
                label="Date"
                class="mb-3"
              />
              <VTextField
                v-if="isAsianLayout"
                v-model="draft.left_heading"
                label="Heading"
                class="mb-3"
              />
              <VTextField
                v-model="draft.left_role"
                label="Role"
                class="mb-3"
              />
              <VTextField v-model="draft.left_name" label="Name" class="mb-3" />

              <div class="signature-upload-box">
                <div class="text-caption mb-2">Signature image</div>
                <div
                  v-if="draft.left_signature_url"
                  class="signature-preview mb-2"
                >
                  <img :src="draft.left_signature_url" alt="Left signature preview" />
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <VBtn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="tabler-upload"
                    :loading="uploadingSide === 'left'"
                    @click="pickSignature('left')"
                  >
                    {{ draft.left_signature_url ? "Replace" : "Upload" }}
                  </VBtn>
                  <VBtn
                    v-if="draft.left_signature_url"
                    size="small"
                    variant="text"
                    color="error"
                    @click="clearSignature('left')"
                  >
                    Remove
                  </VBtn>
                </div>
                <VSlider
                  v-if="draft.left_signature_url"
                  v-model="draft.left_signature_w"
                  class="mt-3"
                  :min="20"
                  :max="70"
                  :step="1"
                  label="Size (%)"
                  thumb-label
                  @update:model-value="
                    (v) => (form.left_signature_w = Number(v))
                  "
                />
                <div class="text-caption text-medium-emphasis mt-1">
                  Max 2MB · PNG / JPG / WebP. Drag on the report to move.
                </div>
              </div>
            </VCol>

            <VCol cols="12" md="6">
              <div class="text-subtitle-2 mb-3">Right column</div>
              <VTextField
                v-model="draft.right_date"
                type="date"
                label="Date"
                class="mb-3"
              />
              <VTextField
                v-if="isAsianLayout"
                v-model="draft.right_heading"
                label="Heading"
                class="mb-3"
              />
              <VTextField
                v-model="draft.right_role"
                label="Role"
                class="mb-3"
              />
              <VTextField
                v-model="draft.right_name"
                label="Name"
                class="mb-3"
              />

              <div class="signature-upload-box">
                <div class="text-caption mb-2">Signature image</div>
                <div
                  v-if="draft.right_signature_url"
                  class="signature-preview mb-2"
                >
                  <img
                    :src="draft.right_signature_url"
                    alt="Right signature preview"
                  />
                </div>
                <div class="d-flex flex-wrap gap-2">
                  <VBtn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="tabler-upload"
                    :loading="uploadingSide === 'right'"
                    @click="pickSignature('right')"
                  >
                    {{ draft.right_signature_url ? "Replace" : "Upload" }}
                  </VBtn>
                  <VBtn
                    v-if="draft.right_signature_url"
                    size="small"
                    variant="text"
                    color="error"
                    @click="clearSignature('right')"
                  >
                    Remove
                  </VBtn>
                </div>
                <VSlider
                  v-if="draft.right_signature_url"
                  v-model="draft.right_signature_w"
                  class="mt-3"
                  :min="20"
                  :max="70"
                  :step="1"
                  label="Size (%)"
                  thumb-label
                  @update:model-value="
                    (v) => (form.right_signature_w = Number(v))
                  "
                />
                <div class="text-caption text-medium-emphasis mt-1">
                  Max 2MB · PNG / JPG / WebP. Drag on the report to move.
                </div>
              </div>
            </VCol>
          </VRow>
        </VCardText>

        <VCardActions class="pa-5 pt-0 justify-end gap-2">
          <VBtn variant="tonal" :disabled="saving" @click="cancelDialog">
            Cancel
          </VBtn>
          <VBtn color="primary" :loading="saving" @click="saveSignatures">
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      :model-value="cropDialog"
      max-width="720"
      persistent
      @update:model-value="(v) => !v && closeCropDialog()"
    >
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between pa-4">
          <span>Crop signature</span>
          <VBtn
            icon
            variant="text"
            :disabled="!!uploadingSide"
            @click="closeCropDialog"
          >
            <VIcon>tabler-x</VIcon>
          </VBtn>
        </VCardTitle>
        <VCardText class="pa-0">
          <VAlert
            v-if="cropError"
            type="error"
            variant="tonal"
            class="ma-4 mb-0"
            density="comfortable"
            closable
            @click:close="cropError = ''"
          >
            {{ cropError }}
          </VAlert>
          <Cropper
            v-if="cropSrc"
            ref="cropperRef"
            class="signature-cropper"
            :src="cropSrc"
            :stencil-props="{ aspectRatio: undefined }"
          />
        </VCardText>
        <VCardActions class="pa-4 justify-end gap-2">
          <VBtn
            variant="tonal"
            :disabled="!!uploadingSide"
            @click="closeCropDialog"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="!!uploadingSide"
            @click="applyCrop"
          >
            Apply crop
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.report-footer-wrap {
  margin-top: 28px;
  width: 100%;
}

.report-footer-grid {
  width: 100%;
  align-items: flex-start;
}

.footer-col {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

.footer-gap {
  min-height: 1px;
}

.footer-line {
  font-size: 0.9rem;
  color: #111;
  line-height: 1.45;
  padding: 3px 0;
}

.footer-role {
  max-width: 100%;
}

.footer-strong {
  font-weight: 200;
  font-size: 10px !important;
}

.footer-sign-space {
  position: relative;
  height: 70px;
  overflow: hidden;
}

.footer-sign-space.is-editable {
  outline: 1px dashed rgba(25, 118, 210, 0.35);
  outline-offset: 1px;
  border-radius: 4px;
}

.signature-img {
  position: absolute;
  height: auto;
  max-height: 90%;
  object-fit: contain;
  user-select: none;
  pointer-events: none;
  -webkit-user-drag: none;
}

.footer-sign-space.is-editable .signature-img {
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
}

.footer-sign-space.is-editable .signature-img:active {
  cursor: grabbing;
}

.signature-upload-box {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 12px;
}

.signature-preview {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 6px;
}

.signature-preview img {
  max-height: 64px;
  max-width: 100%;
  object-fit: contain;
}

.signature-cropper {
  height: 420px;
  background: #222;
}

.footer-khmer .footer-line {
  font-family: "battambang", "Khmer OS", sans-serif;
  font-size: 0.95rem;
}

.footer-chinese .footer-line {
  font-size: 0.92rem;
}

.is-loading {
  opacity: 0.7;
}

@media print {
  .report-no-print {
    display: none !important;
  }

  .report-footer-wrap {
    margin-top: 18px;
  }

  .footer-line {
    color: #000 !important;
    font-size: 10pt !important;
    padding: 2px 0 !important;
  }

  .footer-khmer .footer-line {
    font-size: 9pt !important;
  }

  .footer-sign-space {
    /* Keep same box size as screen so % positions match PDF/print */
    height: 70px !important;
    outline: none !important;
  }

  .signature-img {
    max-height: 90% !important;
    pointer-events: none !important;
  }

  .footer-khmer .footer-strong,
  .footer-chinese .footer-strong {
    font-size: 6pt !important;
    font-weight: 200 !important;
  }
}
</style>
