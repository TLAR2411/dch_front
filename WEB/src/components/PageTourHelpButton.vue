<script setup>
defineProps({
  tooltip: {
    type: String,
    default: "How to use this page",
  },
  /** Override default id when used inside dialogs (navbar already uses page-tour-help-btn). */
  buttonId: {
    type: String,
    default: "page-tour-help-btn",
  },
});

defineEmits(["click"]);
</script>

<template>
  <IconBtn
    :id="buttonId"
    rounded
    size="30"
    :class="$attrs.class"
    :aria-label="tooltip"
    @click.prevent="$emit('click')"
  >
    <VIcon icon="tabler-help" size="20" />
    <VTooltip location="top" transition="scale-transition" activator="parent">
      <span>{{ tooltip }}</span>
    </VTooltip>
  </IconBtn>
</template>
