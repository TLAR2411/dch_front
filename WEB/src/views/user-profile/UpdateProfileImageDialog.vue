<script setup>
import { ref, watch, nextTick } from "vue";
import { debounce } from "lodash";
import { app } from "@/utils/app.js";
import { requiredValidator } from "@/@core/utils/validators";
import { api } from "@/utils/api";

const props = defineProps({
  itemData: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    required: false,
    skipCheck: true,
    default: undefined,
  },
});

const isLoading = ref(false);
const currentImage = ref(null);
const previewImageUrl = ref(null);
const selectedImageFile = ref(null);
const emit = defineEmits([
  "onCreate",
  "onUpdate",
  "update:isDialogVisible",
  "onReload",
]);

const itemData = ref({ ...props.itemData });

watch(
  () => props.itemData,
  (newData) => {
    itemData.value = { ...newData };
  },
  { deep: true },
);

const resetData = () => {
  itemData.value = {
    image_path: "",
  };
};

const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (valid) {
    isLoading.value = true;
    const res = await api.post("users-change-image-path", {
      image_path: itemData?.value.image_path ?? null,
    });

    if (res.data.status) {
      resetData();
      emit("onReload");
    }
    isLoading.value = false;
  }
}, 500);

const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisible", false);
};

const dialogModelValueUpdate = (newVal) => {
  emit("update:isDialogVisible", newVal);
  isDialogVisible.value = newVal;
};

const onImageFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedImageFile.value = file;

    // Preview image using FileReader
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImageUrl.value = e.target.result; // Base64 string for preview
      itemData.value.image_path = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    // selectedImageFile.value = null;
    // previewImageUrl.value = null;
    // formData.value.thumbprint_path = null;
  }
};
</script>

<template>
  <AppAddEditDialog
    title="Update Profile Image"
    icon="tabler-user-scan"
    :is-dialog-visible="isDialogVisible"
    :is-update="true"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="12" md="12">
        <AppImageUploadBox
          style="height: 350px"
          :label="$t('User Profile')"
          :preview-url="previewImageUrl"
          :is-loading="isLoading"
          @change="onImageFileChange"
          @clear="
            () => {
              currentImage = null;
              selectedImageFile = null;
              previewImageUrl = null;
              formData.image_path = null;
            }
          "
        />
        <!-- <div
          style="
            width: 100%;
            height: 200px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 10px;
            padding: 5px;
            display: flex;
            justify-content: center;
            align-items: center;
          "
        >
          <img
            v-if="previewImageUrl"
            :src="previewImageUrl"
            alt="Image Preview"
            style="height: 180px; margin: auto"
          />
          <p v-else>{{ $t("Client Image") }}</p>
        </div>
        <VFileInput
          v-model="currentImage"
          accept="image/*"
          @change="onImageFileChange"
          :clearable="false"
        >
          <template #append v-if="selectedImageFile != null">
            <VBtn
              :loading="isLoading"
              color="error"
              icon="tabler-x"
              rounded
              @click="
                () => {
                  currentImage = null;
                  selectedImageFile = null;
                  previewImageUrl = null;
                  itemData.image_path = null;
                }
              "
            />
          </template>
        </VFileInput> -->
      </VCol>
    </VRow>
  </AppAddEditDialog>
</template>
