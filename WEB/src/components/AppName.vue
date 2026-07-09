<script setup>
import { computed } from "vue";
import ShowImageDialog from "@/components/ShowImageDialog.vue";
import getImageUrl, { getThumbUrl } from "@/utils/image/getImageUrl";
import avatar1 from "@images/avatars/my-avatar-1.jpg";

const props = defineProps({
  title: String,
  subTitle: String,
  image: String,
  subTitleCondition: { type: [Function, Boolean, Number], default: null },
});

const isImageDialog = ref(false);
const imageUrlPath = ref(null);
const imageLoadError = ref(false);

// Check if image actually exists (not just a path)
const hasValidImage = computed(() => {
  if (!props.image) return false;
  // You can add additional validation here if needed
  // For example, check if it's not an empty string or invalid path
  return props.image.trim().length > 0;
});

const thumb1x = computed(() =>
  hasValidImage.value
    ? getThumbUrl(props.image, {
        w: 36,
        h: 36,
        fit: "cover",
        fmt: "webp",
        q: 60,
      })
    : null,
);

const thumb2x = computed(() =>
  hasValidImage.value
    ? getThumbUrl(props.image, {
        w: 72,
        h: 72,
        fit: "cover",
        fmt: "webp",
        q: 60,
      })
    : null,
);

const srcset = computed(() =>
  hasValidImage.value ? `${thumb1x.value} 1x, ${thumb2x.value} 2x` : "",
);

const showImage = (image) => {
  imageUrlPath.value = image ? getImageUrl(image) : avatar1;
  isImageDialog.value = true;
};

// Handle image load errors
const onImageError = () => {
  // Optionally handle error - could set hasValidImage to false
  imageLoadError.value = true;
  console.warn("Failed to load image:", props.image);
};


</script>

<template>
  <ShowImageDialog
    v-if="isImageDialog"
    v-model:isDialogVisible="isImageDialog"
    :image="imageUrlPath"
  />

  <div class="d-flex flex-column">
    <VAvatar
      rounded="lg"
      :size="36"
      :ripple="false"
      :color="hasValidImage && !imageLoadError ? undefined : 'primary'"
      :class="
        hasValidImage && !imageLoadError
          ? ''
          : 'v-avatar-light-bg primary--text'
      "
      :variant="hasValidImage && !imageLoadError ? undefined : 'tonal'"
      class="cursor-pointer"
    >
      <VImg
        v-if="hasValidImage && !imageLoadError"
        :src="thumb1x || avatar1"
        :srcset="srcset"
        sizes="36px"
        width="36"
        height="36"
        cover
        loading="lazy"
        decoding="async"
        :eager="false"
        :transition="false"
        @click="showImage(image)"
        @error="onImageError"
      />
      <span v-else>{{ avatarText(title) }}</span>
    </VAvatar>
  </div>

  <div class="d-flex flex-column ml-2">
    <span>{{ title }}</span>
    <span
      style="font-family: Public Sans; font-size: 10px"
      :class="subTitleCondition ? 'text-error' : 'text-primary'"
    >
      {{ subTitle }}
    </span>
  </div>
</template>
