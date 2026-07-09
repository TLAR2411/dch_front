<script setup>
const props = defineProps({
  title: String,
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  isUpdate: Boolean,
  loading: Boolean,
});

const emit = defineEmits([
  "onCloseDialog",
  "onSubmit",
  "update:isDialogVisible",
]);

const refForm = ref();

const onFormSubmit = async () => {
  emit("onSubmit", refForm.value?.validate());
};
</script>

<template>
  <v-bottom-sheet
    :model-value="isDialogVisible"
    @update:model-value="emit('update:isDialogVisible', $event)"
  >
    <v-card style="border-radius: 10px 10px 0 0; overflow: hidden">
      <div
        class="d-flex flex-column"
        :style="{ height: isUpdate ? '90dvh' : '60dvh' }"
      >
        <!-- Drag handle -->
        <div class="d-flex justify-center pt-3 pb-1 flex-shrink-0">
          <div
            style="
              width: 36px;
              height: 4px;
              border-radius: 99px;
              background: rgba(0, 0, 0, 0.2);
            "
          />
        </div>

        <!-- Header -->
        <div
          class="d-flex justify-space-between align-center px-4 pb-3 flex-shrink-0"
        >
          <span class="text-subtitle-1 font-weight-medium">{{ title }}</span>
          <v-btn
            icon
            variant="text"
            size="small"
            @click="emit('onCloseDialog')"
          >
            <v-icon>tabler-x</v-icon>
          </v-btn>
        </div>

        <v-divider class="flex-shrink-0" />

        <!-- Scrollable body wraps the form -->
        <VForm
          ref="refForm"
          class="pa-4"
          style="overflow-y: auto; flex: 1 1 auto; min-height: 0"
          @submit.prevent="onFormSubmit"
        >
          <slot />
        </VForm>

        <v-divider class="flex-shrink-0" />

        <!-- Footer -->
        <div class="d-flex gap-3 pa-4 flex-shrink-0">
          <v-btn
            block
            color="primary"
            variant="flat"
            :loading="loading"
            @click="onFormSubmit"
          >
            {{ isUpdate ? "Update" : "Create" }}
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-bottom-sheet>
</template>
