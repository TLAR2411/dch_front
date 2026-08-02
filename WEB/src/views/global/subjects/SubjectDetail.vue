<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { smAndDown } = useDisplay();

const isLoading = ref(true);
const detail = ref(null);

const subject = computed(() => detail.value?.subject ?? null);
const children = computed(() => detail.value?.children ?? []);
const grades = computed(() => detail.value?.grades ?? []);
const stats = computed(
  () =>
    detail.value?.stats ?? {
      child_total: 0,
      category_total: 0,
      grade_total: 0,
    },
);

const symbolLabel = computed(() => {
  if (!subject.value) return "?";
  if (subject.value.code) return String(subject.value.code).slice(0, 4).toUpperCase();
  return (subject.value.name_en || subject.value.name_kh || "?").slice(0, 2).toUpperCase();
});

const infoRows = computed(() => {
  if (!subject.value) return [];
  return [
    {
      icon: "tabler-hash",
      label: t("Symbol"),
      value: subject.value.code || "-",
    },
    {
      icon: "tabler-language",
      label: t("Name Khmer"),
      value: subject.value.name_kh || "-",
    },
    {
      icon: "tabler-letter-c",
      label: t("Name Chinese"),
      value: subject.value.name_cn || "-",
    },
    {
      icon: "tabler-folder",
      label: t("Main Subject"),
      value: subject.value.parent
        ? subject.value.parent.name_en || subject.value.parent.name_kh
        : t("None"),
    },
  ];
});

const getSubjectDetail = async () => {
  try {
    isLoading.value = true;
    const res = await api.post("subjects-detail", { id: route.params.id });
    if (res.data.status) {
      detail.value = res.data.data;
    }
  } catch (error) {
    console.error("Failed to fetch subject detail:", error);
  } finally {
    isLoading.value = false;
  }
};

const goBack = () => {
  router.push({ name: "global-subjects" });
};

const goToChild = (childId) => {
  router.push({ name: "global-subjects-detail-id", params: { id: childId } });
};

const goToParent = () => {
  if (!subject.value?.parent?.id) return;
  router.push({
    name: "global-subjects-detail-id",
    params: { id: subject.value.parent.id },
  });
};

onMounted(() => {
  getSubjectDetail();
});

watch(
  () => route.params.id,
  () => {
    getSubjectDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });
  },
);
</script>

<template>
  <div class="subject-detail-page">
    <div class="d-flex align-center ga-2 mb-4">
      <VBtn
        icon
        variant="text"
        size="small"
        @click="goBack"
      >
        <VIcon>tabler-arrow-left</VIcon>
      </VBtn>
    </div>

    <div
      v-if="isLoading"
      class="d-flex justify-center align-center py-16"
    >
      <VProgressCircular
        indeterminate
        color="primary"
      />
    </div>

    <template v-else-if="subject">
      <!-- Header -->
      <VCard
        rounded="lg"
        class="pa-4 pa-sm-5 mb-4"
      >
        <div
          class="d-flex flex-column flex-sm-row align-center align-sm-start ga-4"
        >
          <div
            class="subject-symbol d-flex align-center justify-center rounded-lg text-h6 font-weight-medium bg-primary flex-shrink-0"
            :style="{
              width: smAndDown ? '72px' : '88px',
              height: smAndDown ? '72px' : '88px',
            }"
          >
            {{ symbolLabel }}
          </div>

          <div class="flex-grow-1 w-100 text-center text-sm-start">
            <div
              class="d-flex flex-column flex-sm-row align-center align-sm-start justify-space-between ga-3"
            >
              <div>
                <p class="text-h5 font-weight-medium mb-1">
                  {{ subject.name_en || subject.name_kh }}
                </p>
                <p
                  v-if="subject.name_kh && subject.name_en"
                  class="text-body-1 text-medium-emphasis mb-0"
                >
                  {{ subject.name_kh }}
                </p>
                <p
                  v-if="subject.name_cn"
                  class="text-body-2 text-medium-emphasis mb-0"
                >
                  {{ subject.name_cn }}
                </p>
              </div>

              <div class="d-flex ga-2 flex-wrap justify-center justify-sm-end">
                <AppStatusChip
                  :color="subject.is_active ? 'success' : 'error'"
                  :label="subject.is_active ? t('Active') : t('Inactive')"
                />
                <AppStatusChip
                  v-if="subject.parent"
                  color="info"
                  :label="t('Child Subject')"
                />
              </div>
            </div>
          </div>
        </div>

        <VDivider class="my-4" />

        <VRow dense>
          <VCol
            v-for="row in infoRows"
            :key="row.label"
            cols="12"
            sm="6"
            md="3"
          >
            <div class="info-item pa-3 rounded-lg h-100">
              <div class="d-flex align-center ga-2 mb-1">
                <VIcon
                  size="16"
                  class="text-medium-emphasis"
                >
                  {{ row.icon }}
                </VIcon>
                <span class="text-caption text-medium-emphasis">
                  {{ row.label }}
                </span>
              </div>
              <p class="text-body-2 font-weight-medium mb-0 text-break">
                <template v-if="row.label === t('Main Subject') && subject.parent">
                  <a
                    href="#"
                    class="text-primary text-decoration-none"
                    @click.prevent="goToParent"
                  >
                    {{ row.value }}
                  </a>
                </template>
                <template v-else>
                  {{ row.value }}
                </template>
              </p>
            </div>
          </VCol>
        </VRow>
      </VCard>

      <!-- Stats -->
      <VRow class="mb-2">
        <VCol
          cols="4"
          md="3"
        >
          <VCard
            rounded="lg"
            class="pa-3"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-medium-emphasis">{{ t("Child Subjects") }}</span>
              <div
                class="stat-icon d-flex align-center justify-center rounded"
                style="background: #e6f1fb"
              >
                <VIcon
                  size="20"
                  color="#185FA5"
                >
                  tabler-folders
                </VIcon>
              </div>
            </div>
            <p class="text-h4 font-weight-medium mb-0">
              {{ stats.child_total }}
            </p>
          </VCard>
        </VCol>
        <VCol
          cols="4"
          md="3"
        >
          <VCard
            rounded="lg"
            class="pa-3"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-medium-emphasis">{{ t("Categories") }}</span>
              <div
                class="stat-icon d-flex align-center justify-center rounded"
                style="background: #e1f5ee"
              >
                <VIcon
                  size="20"
                  color="#0F6E56"
                >
                  tabler-tags
                </VIcon>
              </div>
            </div>
            <p class="text-h4 font-weight-medium mb-0">
              {{ stats.category_total }}
            </p>
          </VCard>
        </VCol>
        <VCol
          cols="4"
          md="3"
        >
          <VCard
            rounded="lg"
            class="pa-3"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-medium-emphasis">{{ t("Grades") }}</span>
              <div
                class="stat-icon d-flex align-center justify-center rounded"
                style="background: #faeeda"
              >
                <VIcon
                  size="20"
                  color="#633806"
                >
                  tabler-school
                </VIcon>
              </div>
            </div>
            <p class="text-h4 font-weight-medium mb-0">
              {{ stats.grade_total }}
            </p>
          </VCard>
        </VCol>
      </VRow>

      <!-- Child subjects -->
      <div class="mt-4">
        <p class="text-h6 font-weight-medium mb-3">
          {{ t("Child Subjects") }}
        </p>

        <div
          v-if="!children.length"
          class="text-center py-8"
        >
          <VIcon
            size="40"
            class="text-medium-emphasis mb-2"
          >
            tabler-folder-off
          </VIcon>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ t("No child subjects yet.") }}
          </p>
        </div>

        <VRow v-else>
          <VCol
            v-for="child in children"
            :key="child.id"
            cols="12"
            sm="6"
            md="4"
          >
            <VCard
              rounded="lg"
              class="child-card pa-4 h-100"
              variant="outlined"
              @click="goToChild(child.id)"
            >
              <div class="d-flex align-start ga-3">
                <div
                  class="child-symbol d-flex align-center justify-center rounded-lg text-body-2 font-weight-medium bg-primary"
                >
                  {{
                    child.code
                      ? String(child.code).slice(0, 3).toUpperCase()
                      : (child.name_en || "?").slice(0, 2).toUpperCase()
                  }}
                </div>
                <div class="flex-grow-1 min-w-0">
                  <div class="d-flex align-center justify-space-between ga-2 mb-1">
                    <p class="text-body-1 font-weight-medium mb-0 text-truncate">
                      {{ child.name_en || child.name_kh }}
                    </p>
                    <AppStatusChip
                      :color="child.is_active ? 'success' : 'error'"
                      :label="child.is_active ? t('Active') : t('Inactive')"
                    />
                  </div>
                  <p
                    v-if="child.name_kh && child.name_en"
                    class="text-caption text-medium-emphasis mb-0 text-truncate"
                  >
                    {{ child.name_kh }}
                  </p>
                  <p
                    v-if="child.code"
                    class="text-caption text-medium-emphasis mb-0"
                  >
                    {{ t("Symbol") }}: {{ child.code }}
                  </p>
                </div>
              </div>
            </VCard>
          </VCol>
        </VRow>
      </div>

      <!-- Categories by grade -->
      <div class="mt-6">
        <p class="text-h6 font-weight-medium mb-3">
          {{ t("Grading Categories") }}
        </p>

        <div
          v-if="!grades.length"
          class="text-center py-8"
        >
          <VIcon
            size="40"
            class="text-medium-emphasis mb-2"
          >
            tabler-tags-off
          </VIcon>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ t("No categories assigned") }}
          </p>
        </div>

        <div
          v-for="grade in grades"
          :key="grade.id"
          class="mb-4"
        >
          <div class="d-flex align-center ga-2 mb-3 flex-wrap">
            <VChip
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="tabler-school"
            >
              {{ grade.name_en || grade.name_kh }}
            </VChip>
            <span
              v-if="grade.name_kh && grade.name_en"
              class="text-caption text-medium-emphasis"
            >
              {{ grade.name_kh }}
            </span>
          </div>

          <div
            v-if="!grade.years?.length"
            class="text-body-2 text-medium-emphasis mb-4 pl-1"
          >
            {{ t("No categories assigned") }}
          </div>

          <div
            v-for="year in grade.years"
            :key="`${grade.id}-${year.id}`"
            class="mb-3"
          >
            <div
              v-if="year.name"
              class="d-flex align-center ga-2 mb-2"
            >
              <VChip
                size="x-small"
                variant="outlined"
                prepend-icon="tabler-calendar"
              >
                {{ year.name }}
              </VChip>
              <span class="text-caption text-medium-emphasis">
                {{ year.categories.length }} {{ t("Categories") }}
              </span>
            </div>

            <VRow>
              <VCol
                v-for="category in year.categories"
                :key="category.grading_rule_id"
                cols="12"
                sm="6"
                lg="4"
              >
                <VCard
                  rounded="lg"
                  class="pa-4 h-100"
                  variant="outlined"
                >
                  <div class="d-flex align-start ga-3 mb-3">
                    <div
                      class="category-icon d-flex align-center justify-center rounded-lg"
                      style="background: #e1f5ee"
                    >
                      <VIcon
                        size="20"
                        color="#0F6E56"
                      >
                        tabler-tag
                      </VIcon>
                    </div>
                    <div class="flex-grow-1 min-w-0">
                      <p class="text-body-1 font-weight-medium mb-0 text-truncate">
                        {{ category.name_en || category.name_kh }}
                      </p>
                      <p
                        v-if="category.name_kh && category.name_en"
                        class="text-caption text-medium-emphasis mb-0 text-truncate"
                      >
                        {{ category.name_kh }}
                      </p>
                    </div>
                  </div>

                  <div class="d-flex flex-wrap ga-2">
                    <VChip
                      v-if="category.symbol"
                      size="x-small"
                      style="background: #e6f1fb; color: #185fa5"
                    >
                      {{ category.symbol }}
                    </VChip>
                    <VChip
                      v-if="category.percentage != null"
                      size="x-small"
                      style="background: #faeeda; color: #633806"
                    >
                      {{ category.percentage }}%
                    </VChip>
                    <VChip
                      v-if="category.max_score != null"
                      size="x-small"
                      style="background: #e6f1fb; color: #185fa5"
                    >
                      {{ t("Max Score") }}: {{ category.max_score }}
                    </VChip>
                  </div>

                  <p
                    v-if="category.description"
                    class="text-caption text-medium-emphasis mt-3 mb-0"
                  >
                    {{ category.description }}
                  </p>
                </VCard>
              </VCol>
            </VRow>
          </div>
        </div>
      </div>
    </template>

    <VCard
      v-else
      rounded="lg"
      class="pa-8 text-center"
    >
      <VIcon
        size="40"
        class="text-medium-emphasis mb-2"
      >
        tabler-book-off
      </VIcon>
      <p class="text-body-1 mb-4">
        {{ t("Subject not found") }}
      </p>
      <VBtn
        color="primary"
        @click="goBack"
      >
        {{ t("Back") }}
      </VBtn>
    </VCard>
  </div>
</template>

<style scoped>
.info-item {
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.subject-symbol {
  color: white;
}

.child-symbol {
  width: 44px;
  height: 44px;
  color: white;
  flex-shrink: 0;
}

.stat-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.category-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.child-card {
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.child-card:hover {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.min-w-0 {
  min-width: 0;
}

@media (max-width: 599px) {
  .subject-detail-page :deep(.v-card) {
    border-radius: 12px !important;
  }

  .subject-detail-page .text-h4 {
    font-size: 1.35rem !important;
  }

  .subject-detail-page .text-caption {
    font-size: 0.7rem;
  }
}
</style>
