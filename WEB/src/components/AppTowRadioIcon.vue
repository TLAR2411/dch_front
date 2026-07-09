<script setup>
const props = defineProps({
  selectedRadio: {
    type: String,
    required: true,
  },
  radioContent: {
    type: Array,
    required: true,
  },
  gridColumn: {
    type: null,
    required: false,
  },
});

const emit = defineEmits(["update:selectedRadio"]);

const updateSelectedOption = (value) => {
  if (value !== null) emit("update:selectedRadio", value);
};
</script>

<template>
  <VRadioGroup
    v-if="props.radioContent"
    :model-value="props.selectedRadio"
    class="custom-input-wrapper"
    @update:model-value="updateSelectedOption"
    variant="tonal"
  >
    <VRow>
      <VCol
        v-for="item in props.radioContent"
        :key="item.title"
        v-bind="gridColumn"
      >
        <VLabel
          class="custom-input custom-radio-icon rounded cursor-pointer"
          :class="props.selectedRadio === item.value ? 'active' : ''"
          style="padding: 5px"
          variant="tonal"
        >
          <slot :item="item">
            <div
              class="d-flex flex-column align-center text-center"
              style="align-items: center"
            >
              <VIcon v-bind="item.icon" />
              <span>
                {{ $t(item.title) }}
              </span>
            </div>
          </slot>

          <div class="d-none">
            <VRadio :value="item.value" />
          </div>
        </VLabel>
      </VCol>
    </VRow>
  </VRadioGroup>
</template>

<style lang="scss" scoped>
.custom-radio-icon {
  &.v-label {
    // background-color: rgba(var(--v-theme-primary), 0.08);
    // border: 1px solid rgba(var(--v-theme-primary), 0.12);

    &.active {
      background-color: rgba(var(--v-theme-primary), 0.16);
      border-color: rgba(var(--v-theme-primary), 0.24);
      color: rgba(var(--v-theme-primary), 100);
    }
  }
}
.custom-radio-icon {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .v-radio {
    margin-block-end: -0.25rem;

    .v-selection-control__wrapper {
      margin-inline-start: 0;
    }
  }
}
</style>
