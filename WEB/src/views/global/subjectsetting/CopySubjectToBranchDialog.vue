<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import { storeToRefs } from "pinia";
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import AppAddEditDialog from "@/components/AppAddEditDialog.vue";
import AppAddEditDrawer from "@/components/AppAddEditDrawer.vue";
import { useAuthStore } from "@/stores/authStore";
import { useSettingStore } from "@/stores/settingStore";
import { requiredValidator } from "@/@core/utils/validators";

const props = defineProps({
  isDialogVisible: { type: Boolean, required: true },
  loading: { type: Boolean, default: false },
  subjectId: { type: [Number, String], default: null },
  gradeId: { type: [Number, String], default: null },
  yearId: { type: [Number, String], default: null },
  subjectLabel: { type: String, default: "" },
});

const emit = defineEmits(["update:isDialogVisible", "onCopy"]);

const { t, locale } = useI18n();
const { xs } = useDisplay();
const authStore = useAuthStore();
const settingStore = useSettingStore();
const { branch_id: currentBranchId } = storeToRefs(settingStore);

const targetBranchIds = ref([]);

const branchTitle = (branch) => {
  if (locale.value === "km") {
    return branch.name_kh || branch.name_en || String(branch.id);
  }
  return branch.name_en || branch.name_kh || String(branch.id);
};

const availableBranches = computed(() =>
  (authStore.branches || [])
    .filter((b) => b?.id != null && String(b.id) !== String(currentBranchId.value))
    .map((b) => ({
      ...b,
      id: Number(b.id),
      title: branchTitle(b),
    })),
);

const canCopy = computed(
  () =>
    props.subjectId != null &&
    props.yearId != null &&
    availableBranches.value.length > 0,
);

watch(
  () => props.isDialogVisible,
  (open) => {
    if (open) targetBranchIds.value = [];
  },
);

const close = () => {
  emit("update:isDialogVisible", false);
};

const onFormSubmit = async (validatePromise) => {
  if (!canCopy.value) return;

  if (validatePromise && typeof validatePromise.then === "function") {
    const { valid } = await validatePromise;
    if (!valid) return;
  }

  if (!targetBranchIds.value?.length) return;

  emit("onCopy", {
    subject_id: Number(props.subjectId),
    grade_id: props.gradeId != null ? Number(props.gradeId) : null,
    year_id: Number(props.yearId),
    target_branch_ids: targetBranchIds.value.map(Number),
  });
};
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    max-width="560"
    :title="t('Copy subject setup to branch')"
    icon="tabler-copy"
    :is-dialog-visible="isDialogVisible"
    :loading="loading"
    @on-close-dialog="close"
    @update:is-dialog-visible="emit('update:isDialogVisible', $event)"
    @on-submit="onFormSubmit"
  >
    <div class="d-flex flex-column gap-4">
      <VAlert
        v-if="!availableBranches.length"
        type="warning"
        variant="tonal"
        :text="t('You need access to another branch to copy.')"
      />

      <template v-else>
        <VAlert type="info" variant="tonal" density="comfortable">
          {{
            t(
              "Tip: set up this subject on one branch, then copy here. Do not create the same subject again on the other branch.",
            )
          }}
        </VAlert>

        <div class="text-body-2 text-medium-emphasis">
          {{
            t(
              "Copies the subject, children, grade links, grading rules, and assessment items. If the subject already exists on the target branch, missing setup is filled in — no duplicate subject.",
            )
          }}
        </div>

        <div v-if="subjectLabel" class="text-subtitle-2">
          {{ t("Subject") }}:
          <span class="font-weight-medium">{{ subjectLabel }}</span>
        </div>

        <AppAutocomplete
          v-model="targetBranchIds"
          :label="t('Target Branches')"
          :items="availableBranches"
          item-title="title"
          item-value="id"
          multiple
          chips
          closable-chips
          :rules="[requiredValidator]"
          :disabled="loading"
        />
      </template>
    </div>
  </AppAddEditDialog>

  <AppAddEditDrawer
    v-else
    :title="t('Copy subject setup to branch')"
    :is-dialog-visible="isDialogVisible"
    :loading="loading"
    @on-close-dialog="close"
    @update:is-dialog-visible="emit('update:isDialogVisible', $event)"
    @on-submit="onFormSubmit"
  >
    <div class="d-flex flex-column gap-4 pa-2">
      <VAlert
        v-if="!availableBranches.length"
        type="warning"
        variant="tonal"
        :text="t('You need access to another branch to copy.')"
      />

      <template v-else>
        <VAlert type="info" variant="tonal" density="comfortable">
          {{
            t(
              "Tip: set up this subject on one branch, then copy here. Do not create the same subject again on the other branch.",
            )
          }}
        </VAlert>

        <div class="text-body-2 text-medium-emphasis">
          {{
            t(
              "Copies the subject, children, grade links, grading rules, and assessment items. If the subject already exists on the target branch, missing setup is filled in — no duplicate subject.",
            )
          }}
        </div>

        <div v-if="subjectLabel" class="text-subtitle-2">
          {{ t("Subject") }}:
          <span class="font-weight-medium">{{ subjectLabel }}</span>
        </div>

        <AppAutocomplete
          v-model="targetBranchIds"
          :label="t('Target Branches')"
          :items="availableBranches"
          item-title="title"
          item-value="id"
          multiple
          chips
          closable-chips
          :rules="[requiredValidator]"
          :disabled="loading"
        />
      </template>
    </div>
  </AppAddEditDrawer>
</template>
