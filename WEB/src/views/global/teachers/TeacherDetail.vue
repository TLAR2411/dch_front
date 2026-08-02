<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import formatGender from "@/utils/formater/formatGender";
import getImageUrl from "@/utils/image/getImageUrl";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { smAndDown } = useDisplay();

const isLoading = ref(true);
const detail = ref(null);

const defaultPhoto =
  "https://st4.depositphotos.com/9998432/24428/v/450/depositphotos_244284796-stock-illustration-person-gray-photo-placeholder-man.jpg";

const teacher = computed(() => detail.value?.teacher ?? null);
const branches = computed(() => detail.value?.branches ?? []);
const stats = computed(() => detail.value?.stats ?? { branch_total: 0, class_total: 0 });

const photoUrl = computed(() => {
  if (!teacher.value?.photo_path) return defaultPhoto;
  return getImageUrl(teacher.value.photo_path) || defaultPhoto;
});

const infoRows = computed(() => {
  if (!teacher.value) return [];
  return [
    { icon: "tabler-gender-bigender", label: t("Gender"), value: formatGender(teacher.value.gender, t) },
    { icon: "tabler-flag", label: t("Nation"), value: teacher.value.nation || "-" },
    { icon: "tabler-phone", label: t("phone"), value: teacher.value.phone || "-" },
    { icon: "tabler-mail", label: t("email"), value: teacher.value.email || "-" },
  ];
});

const getTeacherDetail = async () => {
  try {
    isLoading.value = true;
    const res = await api.post("teachers-detail", { id: route.params.id });
    if (res.data.status) {
      detail.value = res.data.data;
    }
  } catch (error) {
    console.error("Failed to fetch teacher detail:", error);
  } finally {
    isLoading.value = false;
  }
};

const goBack = () => {
  router.push({ name: "global-teachers" });
};

const goToClass = (classId) => {
  router.push({ name: "global-classes-detail-id", params: { id: classId } });
};

onMounted(() => {
  getTeacherDetail();
});
</script>

<template>
  <div class="teacher-detail-page">
    <div class="d-flex align-center ga-2 mb-4">
      <VBtn
        icon
        variant="text"
        size="small"
        @click="goBack"
      >
        <VIcon>tabler-arrow-left</VIcon>
      </VBtn>
      <!-- <div>
        <p class="text-h6 font-weight-medium mb-0">
          {{ t("Teacher Detail") }}
        </p>
        <p
          v-if="teacher"
          class="text-caption text-medium-emphasis mb-0"
        >
          {{ teacher.name_en }}
        </p>
      </div> -->
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

    <template v-else-if="teacher">
      <!-- Profile header -->
      <VCard
        rounded="lg"
        class="pa-4 pa-sm-5 mb-4"
      >
        <div
          class="d-flex flex-column flex-sm-row align-center align-sm-start ga-4"
        >
          <VAvatar
            :image="photoUrl"
            :size="smAndDown ? 88 : 104"
            class="flex-shrink-0"
          />

          <div class="flex-grow-1 w-100 text-center text-sm-start">
            <div
              class="d-flex flex-column flex-sm-row align-center align-sm-start justify-space-between ga-3"
            >
              <div>
                <p class="text-h5 font-weight-medium mb-1">
                  {{ teacher.name_en }}
                </p>
                <p class="text-body-1 text-medium-emphasis mb-0">
                  {{ teacher.name_kh }}
                </p>
              </div>

              <div class="d-flex ga-2 flex-wrap justify-center justify-sm-end">
                <AppStatusChip
                  :color="teacher.is_teaching ? 'success' : 'error'"
                  :label="teacher.is_teaching ? t('Teaching') : t('Not Teaching')"
                />
                <AppStatusChip
                  :color="teacher.is_active ? 'success' : 'error'"
                  :label="teacher.is_active ? t('Active') : t('Inactive')"
                />
              </div>
            </div>

            <p
              v-if="teacher.description"
              class="text-body-2 text-medium-emphasis mt-3 mb-0"
            >
              {{ teacher.description }}
            </p>
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
                {{ row.value }}
              </p>
            </div>
          </VCol>
        </VRow>
      </VCard>

      <!-- Stats -->
      <VRow class="mb-2">
        <VCol
          cols="6"
          md="3"
        >
          <VCard
            rounded="lg"
            class="pa-3"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-medium-emphasis">{{ t("Branches") }}</span>
              <div
                class="d-flex align-center justify-center rounded"
                style="width: 38px; height: 38px; background: #e6f1fb"
              >
                <VIcon
                  size="22"
                  color="#185FA5"
                >
                  tabler-building
                </VIcon>
              </div>
            </div>
            <p class="text-h4 font-weight-medium mb-0">
              {{ stats.branch_total }}
            </p>
          </VCard>
        </VCol>
        <VCol
          cols="6"
          md="3"
        >
          <VCard
            rounded="lg"
            class="pa-3"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-medium-emphasis">{{ t("Classes") }}</span>
              <div
                class="d-flex align-center justify-center rounded"
                style="width: 38px; height: 38px; background: #e1f5ee"
              >
                <VIcon
                  size="22"
                  color="#0F6E56"
                >
                  tabler-chalkboard
                </VIcon>
              </div>
            </div>
            <p class="text-h4 font-weight-medium mb-0">
              {{ stats.class_total }}
            </p>
          </VCard>
        </VCol>
      </VRow>

      <!-- Classes by branch -->
      <div class="mt-2">
        <p class="text-h6 font-weight-medium mb-3">
          {{ t("Teaching Classes") }}
        </p>

        <div
          v-if="!branches.length"
          class="text-center py-10"
        >
          <VIcon
            size="40"
            class="text-medium-emphasis mb-2"
          >
            tabler-chalkboard-off
          </VIcon>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ t("No classes assigned") }}
          </p>
        </div>

        <div
          v-for="branch in branches"
          :key="branch.id"
          class="mb-4"
        >
          <div class="d-flex align-center ga-2 mb-3 flex-wrap">
            <VChip
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="tabler-building"
            >
              {{ branch.name_en || branch.name_kh }}
            </VChip>
            <span
              v-if="branch.name_kh && branch.name_en"
              class="text-caption text-medium-emphasis"
            >
              {{ branch.name_kh }}
            </span>
            <VChip
              size="x-small"
              variant="outlined"
            >
              {{ branch.classes.length }} {{ t("Classes") }}
            </VChip>
          </div>

          <div
            v-if="!branch.classes.length"
            class="text-body-2 text-medium-emphasis mb-4 pl-1"
          >
            {{ t("No classes in this branch") }}
          </div>

          <VRow v-else>
            <VCol
              v-for="cls in branch.classes"
              :key="cls.id"
              cols="12"
              sm="6"
              lg="4"
            >
              <VCard
                rounded="lg"
                class="class-card pa-4 h-100"
                variant="outlined"
                @click="goToClass(cls.id)"
              >
                <div class="d-flex align-start ga-3 mb-3">
                  <div
                    class="class-symbol d-flex align-center justify-center rounded-lg text-body-1 font-weight-medium bg-primary"
                  >
                    {{ cls.symbol || (cls.name_en || "?").slice(0, 2).toUpperCase() }}
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <p class="text-body-1 font-weight-medium mb-0 text-truncate">
                      {{ cls.name_en }}
                    </p>
                    <p class="text-caption text-medium-emphasis mb-0 text-truncate">
                      {{ cls.name_kh }}
                    </p>
                  </div>
                </div>

                <div class="d-flex flex-wrap ga-2 mb-3">
                  <VChip
                    v-if="cls.grade"
                    size="x-small"
                    style="background: #e1f5ee; color: #0f6e56"
                  >
                    {{ cls.grade.name_en }}
                  </VChip>
                  <VChip
                    v-if="cls.room_number"
                    size="x-small"
                    style="background: #faeeda; color: #633806"
                  >
                    Room {{ cls.room_number }}
                  </VChip>
                  <VChip
                    v-if="cls.year"
                    size="x-small"
                    style="background: #e6f1fb; color: #185fa5"
                  >
                    {{ cls.year.name }}
                  </VChip>
                </div>

                <div
                  v-if="cls.subjects?.length"
                  class="d-flex flex-column ga-2"
                >
                  <div
                    v-for="subject in cls.subjects"
                    :key="subject.assignment_id"
                    class="subject-row pa-2 rounded"
                  >
                    <div class="d-flex align-center justify-space-between ga-2 flex-wrap">
                      <div class="d-flex align-center ga-1 min-w-0">
                        <VIcon size="14">tabler-book</VIcon>
                        <span class="text-caption font-weight-medium text-truncate">
                          {{ subject.name_en || t("No subject") }}
                        </span>
                      </div>
                      <div class="d-flex ga-1 flex-wrap">
                        <VChip
                          v-if="subject.is_classload"
                          size="x-small"
                          color="success"
                          variant="tonal"
                        >
                          Classload
                        </VChip>
                        <VChip
                          size="x-small"
                          color="info"
                          variant="tonal"
                        >
                          {{ subject.is_assistance ? "Assistant" : "Main" }}
                        </VChip>
                      </div>
                    </div>
                  </div>
                </div>
              </VCard>
            </VCol>
          </VRow>
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
        tabler-user-off
      </VIcon>
      <p class="text-body-1 mb-4">
        {{ t("Teacher not found") }}
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

.class-symbol {
  width: 44px;
  height: 44px;
  color: white;
  flex-shrink: 0;
}

.class-card {
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.class-card:hover {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.subject-row {
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.min-w-0 {
  min-width: 0;
}

@media (max-width: 599px) {
  .teacher-detail-page :deep(.v-card) {
    border-radius: 12px !important;
  }
}
</style>
