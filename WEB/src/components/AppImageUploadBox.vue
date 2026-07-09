<template>
  <div style="position: relative; height: 90%">
    <div
      ref="uploadBox"
      @click="$refs.fileInput.click()"
      style="
        width: 100%;
        height: 100%;
        border: 1.2px solid #ddd;
        border-radius: 4px;
        padding: 5px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        background-color: #fafafa;
        transition: all 0.3s;
        position: relative;
      "
      @mouseover="handleMouseOver"
      @mouseleave="handleMouseLeave"
    >
      <img
        v-if="previewUrl"
        :src="previewUrl"
        :alt="label"
        style="max-height: 100%; max-width: 100%; object-fit: contain"
      />
      <div v-else style="text-align: center; color: #999">
        <VIcon
          :icon="icon"
          size="32"
          :color="iconColor"
          class="mb-2"
          style="transition: color 0.3s"
        />
        <!-- <p>{{ $t("Click to upload") }} {{ label }}</p> -->
      </div>

      <!-- Delete button -->
      <VBtn
        v-if="previewUrl"
        :loading="isLoading"
        color="error"
        icon="tabler-x"
        size="x-small"
        rounded
        style="position: absolute; top: 10px; right: 10px"
        @click.stop="handleClear"
      />
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      @change="handleFileChange"
      style="display: none"
    />
  </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
    default: "tabler-photo-plus",
  },
  previewUrl: {
    type: String,
    default: null,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["change", "clear"]);

const uploadBox = ref(null);
const iconColor = ref("#999");

const handleFileChange = (event) => {
  emit("change", event);
};

const handleClear = () => {
  emit("clear");
};

const handleMouseOver = (e) => {
  e.currentTarget.style.borderColor = "#1976d2";
  iconColor.value = "#1976d2";
};

const handleMouseLeave = (e) => {
  e.currentTarget.style.borderColor = "#ddd";
  iconColor.value = "#999";
};
</script>
