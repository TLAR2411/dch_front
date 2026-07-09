<script setup>
import { computed, ref } from "vue";
import ShowImageDialog from "@/components/ShowImageDialog.vue";
// Make sure avatarText is imported if it's in a utils file, otherwise define it
import { avatarText } from "@core/utils/formatters";
import getImageUrl, { getThumbUrl } from "@/utils/image/getImageUrl";
import avatar1 from "@images/avatars/my-avatar-1.jpg";

const props = defineProps({
  title: String,
  image: String,
  // Ensure size is treated as a number for calculations
  size: { type: [Number, String], default: 36 },
  q: { type: [Number, String], default: 60 },
  isShowFullImage: { type: Boolean, default: true },
  color: { type: String, default: "primary" },

  rounded: { type: String, default: "lg" },
});

const isImageDialog = ref(false);
const imageUrlPath = ref(null);
const imageLoadError = ref(false);

// Convert prop to number safely (in case "45" string is passed)
const sizeNumeric = computed(() => Number(props.size) || 36);

const hasValidImage = computed(() => {
  if (!props.image) return false;
  return props.image.trim().length > 0;
});

// --- CHANGED: Uses props.size for dynamic width/height ---
const thumb1x = computed(() =>
  hasValidImage.value
    ? getThumbUrl(props.image, {
        w: sizeNumeric.value, // Dynamic width
        h: sizeNumeric.value, // Dynamic height
        fit: "cover",
        fmt: "webp",
        q: props.q,
      })
    : null,
);

// --- CHANGED: Uses props.size * 2 for Retina displays ---
const thumb2x = computed(() =>
  hasValidImage.value
    ? getThumbUrl(props.image, {
        w: sizeNumeric.value * 2, // Dynamic 2x width
        h: sizeNumeric.value * 2, // Dynamic 2x height
        fit: "cover",
        fmt: "webp",
        q: props.q,
      })
    : null,
);

const srcset = computed(() =>
  hasValidImage.value ? `${thumb1x.value} 1x, ${thumb2x.value} 2x` : "",
);

const showImage = (image) => {
  if (props.isShowFullImage) {
    imageUrlPath.value = image ? getImageUrl(image) : avatar1;
    isImageDialog.value = true;
  }
};

const onImageError = () => {
  imageLoadError.value = true;
  // console.warn("Failed to load image:", props.image);
};
</script>

<template>
  <ShowImageDialog
    v-if="isImageDialog"
    v-model:isDialogVisible="isImageDialog"
    :image="imageUrlPath"
  />

  <!-- {{ getImageUrl(image) }} -->
  <div
    class="d-flex align-center w-100 border rounded justify-center"
    style="height: 150px; cursor: pointer"
  >
    <VImg
      v-if="hasValidImage && !imageLoadError"
      :src="getImageUrl(image)"
      :width="size"
      :height="size"
      loading="lazy"
      decoding="async"
      @click.stop="showImage(image)"
      @error="onImageError"
    />
    <span v-else :style="{ fontSize: sizeNumeric * 0.4 + 'px' }">
      {{ avatarText(title) }}
    </span>
  </div>
</template>
