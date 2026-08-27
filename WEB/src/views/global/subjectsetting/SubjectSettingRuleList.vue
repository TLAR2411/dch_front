<script setup>
import { useI18n } from "vue-i18n";
import { useEntityLabel } from "@/composable/useEntityLabel.js";

const props = defineProps({
  gradeId: {
    type: [Number, String],
    required: true,
  },
  subjectId: {
    type: [Number, String],
    required: true,
  },
  rules: {
    type: Array,
    default: () => [],
  },
  activeRuleKey: {
    type: [String, null],
    default: null,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  /** Mark first rule as tour targets (avoid duplicate ids across lists). */
  tourAnchor: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  "toggle-rule",
  "edit-rule",
  "delete-rule",
  "add-assessment",
]);

const { t } = useI18n();
const { entityLabel, reportPart } = useEntityLabel();

const ruleKey = (rule) =>
  `${props.gradeId}-${props.subjectId}-${rule.grading_rule_id ?? rule.category_id}`;
</script>

<template>
  <VCard
    v-for="(rule, ruleIndex) in rules"
    :key="rule.grading_rule_id ?? rule.category_id"
    variant="outlined"
    rounded="lg"
    :class="['rule-card', { 'rule-card--compact': compact }]"
    :id="
      tourAnchor && ruleIndex === 0
        ? 'page-tour-subject-setting-rule'
        : undefined
    "
  >
    <div
      :class="[
        'd-flex align-center justify-space-between cursor-pointer',
        compact ? 'pa-2 px-3' : 'pa-3',
      ]"
      @click="emit('toggle-rule', ruleKey(rule))"
    >
      <div class="d-flex align-center gap-3">
        <VAvatar
          color="info"
          variant="tonal"
          :size="compact ? 28 : 32"
          rounded="lg"
        >
          <VIcon
            icon="tabler-category"
            :size="compact ? 14 : 16"
            color="info"
          />
        </VAvatar>
        <div>
          <div
            :class="
              compact
                ? 'text-caption font-weight-bold'
                : 'text-body-2 font-weight-bold'
            "
          >
            {{ entityLabel(rule.category) }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{
              reportPart === "khmer" || reportPart === "chinese"
                ? rule.category?.name_kh
                : rule.category?.name_en
            }}
          </div>
        </div>
      </div>

      <div class="d-flex align-center gap-2">
        <VBtn
          icon="tabler-plus"
          color="success"
          variant="text"
          :size="compact ? 'x-small' : 'small'"
          density="comfortable"
          :id="
            tourAnchor && ruleIndex === 0
              ? 'page-tour-subject-setting-add-assessment'
              : undefined
          "
          @click.stop="emit('add-assessment', rule)"
        />
        <VBtn
          color="warning"
          icon="tabler-pencil"
          variant="text"
          :size="compact ? 'x-small' : 'small'"
          density="comfortable"
          @click.stop="emit('edit-rule', rule.grading_rule_id)"
        />
        <VBtn
          icon="tabler-trash"
          variant="text"
          :size="compact ? 'x-small' : 'small'"
          density="comfortable"
          color="error"
          @click.stop="emit('delete-rule', rule.grading_rule_id)"
        />
        <VIcon
          :size="compact ? 16 : 18"
          :icon="
            activeRuleKey === ruleKey(rule)
              ? 'tabler-chevron-up'
              : 'tabler-chevron-down'
          "
        />
      </div>
    </div>

    <VExpandTransition>
      <div v-show="activeRuleKey === ruleKey(rule)">
        <VDivider />

        <div
          v-if="!(rule.assessments || []).length"
          class="pa-4 text-caption text-medium-emphasis text-center"
        >
          {{ t("No assessments yet.") }}
        </div>

        <div v-else class="pa-3 d-flex flex-column gap-2">
          <div
            v-for="(assessment, index) in rule.assessments"
            :key="assessment.id"
            class="assessment-row d-flex align-center justify-space-between px-3 py-2 rounded-lg"
          >
            <div class="d-flex align-center gap-3">
              <VAvatar size="26" color="secondary" variant="tonal">
                <span class="text-caption font-weight-bold">
                  {{ assessment.sequence_no ?? index + 1 }}
                </span>
              </VAvatar>
              <div class="text-body-2 font-weight-medium">
                {{ assessment.item_name }}
              </div>
            </div>

            <VChip size="small" color="primary" variant="tonal">
              {{ assessment.max_score }} {{ t("pts") }}
            </VChip>
          </div>
        </div>

        <div
          class="d-flex justify-end ga-3 px-4 py-3 text-caption text-medium-emphasis"
        >
          <span class="font-weight-bold font-mono">
            {{ rule.max_score }}pts
          </span>
          <span class="font-weight-bold font-mono">
            {{ rule.percentage }}%
          </span>
        </div>
      </div>
    </VExpandTransition>
  </VCard>
</template>

<style scoped>
.rule-card--compact {
  opacity: 0.95;
}

.assessment-row {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
</style>
