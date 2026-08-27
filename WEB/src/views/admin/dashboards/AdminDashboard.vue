<script setup>
import { api } from "@/utils/api";
import { useSettingStore } from "@/stores/settingStore";
import { useYearStore } from "@/stores/yearStore";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { usePageTour } from "@/composable/usePageTour";

const { t } = useI18n();
const settingStore = useSettingStore();
const yearStore = useYearStore();
usePageTour("admin-dashboards");

const data = ref(null);
const loading = ref(false);

const toNumber = (value) => {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
};

const getData = async () => {
  loading.value = true;
  try {
    const res = await api.post("dashboard-admin");

    data.value = res.data.data ?? null;
  } catch (error) {
    console.error(error);
    data.value = null;
  } finally {
    loading.value = false;
  }
};

const totalStudents = computed(() =>
  toNumber(data.value?.students?.total_students),
);

const enrolledStudents = computed(() =>
  toNumber(data.value?.students?.enrolled_students),
);

const notEnrolledStudents = computed(() =>
  toNumber(data.value?.students?.not_enrolled_students),
);

const femaleStudents = computed(() =>
  toNumber(data.value?.students?.total_female_students),
);

const maleStudents = computed(() =>
  Math.max(totalStudents.value - femaleStudents.value, 0),
);

const summaryCards = computed(() => [
  {
    key: "students",
    title: t("Students"),
    value: totalStudents.value,
    subtitle: t(
      "{enrolled} enrolled · {notEnrolled} not enrolled · {female}F · {male}M",
      {
        enrolled: enrolledStudents.value,
        notEnrolled: notEnrolledStudents.value,
        female: femaleStudents.value,
        male: maleStudents.value,
      },
    ),
    icon: "tabler-users",
    color: "primary",
    to: { name: "admin-students" },
    tourId: "page-tour-dash-students",
  },
  {
    key: "teachers",
    title: t("Teachers"),
    value: toNumber(data.value?.teachers?.total_teachers),
    subtitle: t("Active teachers"),
    icon: "tabler-school",
    color: "success",
    to: { name: "admin-teachers" },
  },
  {
    key: "classes",
    title: t("Classes"),
    value: toNumber(data.value?.classes?.total_classes),
    subtitle: t("Active classes"),
    icon: "tabler-chalkboard",
    color: "info",
    to: { name: "global-classes" },
  },
  {
    key: "families",
    title: t("Families"),
    value: toNumber(data.value?.families?.total_families),
    subtitle: t("Registered families"),
    icon: "tabler-home-heart",
    color: "warning",
    to: { name: "global-families" },
  },
  {
    key: "branches",
    title: t("Branches"),
    value: toNumber(data.value?.branches?.total_branches),
    subtitle: t("In current scope"),
    icon: "tabler-building-bank",
    color: "secondary",
    to: { name: "admin-branches" },
  },
  {
    key: "users",
    title: t("Users"),
    value: toNumber(data.value?.users?.active_users),
    icon: "tabler-user-cog",
    color: "error",
    to: { name: "admin-users" },
  },
]);

const systemCards = computed(() => [
  {
    key: "years",
    title: t("Years"),
    value: toNumber(data.value?.years?.active_years),
    icon: "tabler-calendar",
    color: "primary",
    to: { name: "admin-years" },
  },
  {
    key: "curriculums",
    title: t("Curriculums"),
    value: toNumber(data.value?.curriculums?.total_curriculums),
    subtitle: t("Active programs"),
    icon: "tabler-books",
    color: "success",
    to: { name: "admin-curriculums" },
  },
  {
    key: "users-without-role",
    title: t("Users without role"),
    value: toNumber(data.value?.users?.users_without_role),
    subtitle: t("Need role assignment"),
    icon: "tabler-shield-off",
    color: "warning",
    to: { name: "admin-users" },
  },
  {
    key: "disabled-users",
    title: t("Disabled users"),
    value: toNumber(data.value?.users?.disabled_users),
    subtitle: t("Inactive accounts"),
    icon: "tabler-user-off",
    color: "error",
    to: { name: "admin-users" },
  },
]);

const byCurriculum = computed(() => data.value?.by_curriculum ?? []);

watch([() => settingStore.branch_id, () => yearStore.year_id], () => {
  getData();
});

onMounted(() => {
  getData();
});
</script>

<template>
  <div class="dashboard-admin">
    <div
      id="page-tour-dash-title"
      class="d-flex align-center justify-space-between mb-4"
    >
      <div class="text-h5 font-weight-medium">
        {{ $t("School overview") }}
      </div>
    </div>

    <VRow id="page-tour-dash-summary">
      <VCol
        v-for="card in summaryCards"
        :key="card.key"
        cols="12"
        sm="6"
        lg="4"
      >
        <VCard
          :id="card.tourId"
          :to="card.to"
          class="stat-card"
          :ripple="false"
        >
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center gap-2">
                <VAvatar :color="card.color" size="44" rounded variant="tonal">
                  <VIcon :icon="card.icon" size="24" />
                </VAvatar>

                <div class="text-body-1 font-weight-medium">
                  {{ card.title }}
                </div>
              </div>

              <div class="text-h4 mb-0">
                {{ loading ? "—" : card.value }}
              </div>
            </div>

            <div class="text-body-2 text-medium-emphasis mt-1">
              {{ loading ? $t("Loading…") : card.subtitle }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <div class="text-h5 font-weight-medium mt-8 mb-4">
      {{ $t("By curriculum") }}
    </div>

    <VCard id="page-tour-dash-curriculum">
      <VTable class="curriculum-table">
        <thead>
          <tr>
            <th>{{ $t("Curriculum") }}</th>
            <th class="text-end">{{ $t("Students") }}</th>
            <th class="text-end">{{ $t("Teachers") }}</th>
            <th class="text-end">{{ $t("Classes") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="text-center text-medium-emphasis py-6">
              {{ $t("Loading…") }}
            </td>
          </tr>
          <tr v-else-if="!byCurriculum.length">
            <td colspan="4" class="text-center text-medium-emphasis py-6">
              {{ $t("No curriculums found") }}
            </td>
          </tr>
          <tr v-for="row in byCurriculum" :key="row.cur_id">
            <td>
              <div class="d-flex align-center gap-2">
                <VChip
                  v-if="row.symbol"
                  size="small"
                  variant="tonal"
                  color="primary"
                >
                  {{ row.symbol }}
                </VChip>
                <span>{{ row.name || row.name_kh || "—" }}</span>
              </div>
            </td>
            <td class="text-end">{{ row.students }}</td>
            <td class="text-end">{{ row.teachers }}</td>
            <td class="text-end">{{ row.classes }}</td>
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <div class="text-h5 font-weight-medium mt-8 mb-4">
      {{ $t("System setup") }}
    </div>

    <VRow id="page-tour-dash-system">
      <VCol v-for="card in systemCards" :key="card.key" cols="12" sm="6" lg="3">
        <VCard :to="card.to" class="stat-card" :ripple="false">
          <VCardText class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center gap-2">
                <VAvatar :color="card.color" size="40" rounded variant="tonal">
                  <VIcon :icon="card.icon" size="22" />
                </VAvatar>

                <div class="text-body-2 font-weight-medium">
                  {{ card.title }}
                </div>
              </div>

              <div class="text-h5 mb-0">
                {{ loading ? "—" : card.value }}
              </div>
            </div>

            <div class="text-body-2 text-medium-emphasis mt-1">
              {{ loading ? $t("Loading…") : card.subtitle }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<style lang="scss" scoped>
.stat-card {
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(var(--v-shadow-key-umbra-color), 0.12);
  }
}

.curriculum-table {
  th,
  td {
    padding-inline: 1rem;
  }
}
</style>
