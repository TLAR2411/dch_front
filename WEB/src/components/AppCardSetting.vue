<script setup>
const props = defineProps({
  item: Object,
});

const emits = defineEmits(["onEdit"]);

const onEdit = (item) => {
  emits("onEdit", item);
};
</script>

<template>
  <VCol cols="12" sm="6" md="4" lg="3">
    <VCard>
      <VCardText class="mt-0 pa-2">
        <div class="d-flex flex-column">
          <div class="d-flex flex-row justify-space-between">
            <VChip style="width: 100px">
              <VIcon start icon="tabler-label" />
              Name
            </VChip>

            <span class="text-primary">{{ item.name }}</span>
          </div>
          <VDivider class="mt-1 mb-1" />
          <div class="d-flex flex-row justify-space-between">
            <VChip style="width: 100px">
              <VIcon start icon="tabler-equal" />
              Value
            </VChip>
            <span class="text-primary">{{ item.value }}</span>
          </div>
        </div>

        <VBtn class="w-100 mt-2" @click="onEdit(item.id)">
          <VIcon start icon="tabler-pencil" />
          {{ $t("Update") }}
        </VBtn>
      </VCardText>
    </VCard>
  </VCol>
</template>
