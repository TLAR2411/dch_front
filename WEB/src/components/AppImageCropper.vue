<!-- <script setup>
import { ref, watch, nextTick } from "vue";
import Cropper from "cropperjs";
import "@styles/cropper.css";

const props = defineProps({
  modelValue: Boolean, // Control visibility
  imageFile: [File, String, null], // The file or base64 to crop
  aspectRatio: { type: Number, default: NaN }, // NaN allows free cropping (good for documents)
});

const emit = defineEmits(["update:modelValue", "cropped", "cancel"]);

const imageElement = ref(null);
const cropper = ref(null);
const imageSrc = ref(null);

// Watch for the dialog opening to initialize Cropper
watch(
  () => props.modelValue,
  async (val) => {
    if (val && props.imageFile) {
      // Convert File to URL if necessary
      if (props.imageFile instanceof File) {
        imageSrc.value = URL.createObjectURL(props.imageFile);
      } else {
        imageSrc.value = props.imageFile;
      }

      // Wait for the dialog to render the <img> tag
      await nextTick();
      initCropper();
    } else {
      destroyCropper();
    }
  },
);

const initCropper = () => {
  destroyCropper(); // Clean up old instance
  cropper.value = new Cropper(imageElement.value, {
    aspectRatio: props.aspectRatio,
    viewMode: 1, // Stay inside image bounds
    autoCropArea: 1,
    responsive: true,
    checkOrientation: true, // Auto-rotates based on EXIF
  });
};

const destroyCropper = () => {
  if (cropper.value) {
    cropper.value.destroy();
    cropper.value = null;
  }
};

const rotate = (deg) => cropper.value?.rotate(deg);

const save = () => {
  const canvas = cropper.value.getCroppedCanvas({
    maxWidth: 1024,
    maxHeight: 1024,
  });

  // Export as WebP for your storeImage function
  const base64 = canvas.toDataURL("image/webp", 0.8);
  emit("cropped", base64);
  emit("update:modelValue", false);
};
</script>

<template>
  <VDialog :model-value="modelValue" persistent max-width="700">
    <VCard title="Crop Image">
      <VCardText class="pa-0">
        <div class="cropper-box">
          <img
            ref="imageElement"
            :src="imageSrc"
            class="d-block max-width-100"
          />
        </div>
      </VCardText>

      <VCardActions class="pa-4 flex-wrap">
        <VBtn icon="mdi-rotate-left" variant="tonal" @click="rotate(-90)" />
        <VBtn icon="mdi-rotate-right" variant="tonal" @click="rotate(90)" />

        <VSpacer />

        <VBtn
          color="error"
          variant="text"
          @click="emit('update:modelValue', false)"
          >Cancel</VBtn
        >
        <VBtn color="primary" variant="elevated" @click="save">Apply Crop</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.cropper-box {
  background-color: #222;
  min-height: 400px;
  max-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
}
img {
  max-width: 100%;
}
</style> -->
