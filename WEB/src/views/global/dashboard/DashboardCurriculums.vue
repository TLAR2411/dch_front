<script setup>
import { api } from "@/utils/api";
import { useSettingStore } from "@/stores/settingStore";
import { useYearStore } from "@/stores/yearStore";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import CalendarList from "@/views/global/calendar/CalendarList.vue";

const { t } = useI18n();
const settingStore = useSettingStore();
const yearStore = useYearStore();

const data = ref(null);
const loading = ref(false);

const toNumber = (value) => {
  const n = Number(value);

  return Number.isFinite(n) ? n : 0;
};

const getData = async () => {
  loading.value = true;
  try {
    const res = await api.post("dashboard-curriculum");

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
    subtitle: t("{female} female · {male} male", {
      female: femaleStudents.value,
      male: maleStudents.value,
    }),
    icon: "tabler-users",
    color: "primary",
    to: { name: "global-student" },
  },
  {
    key: "teachers",
    title: t("Teachers"),
    value: toNumber(data.value?.teachers?.total_teachers),
    subtitle: t("Active teachers"),
    icon: "tabler-school",
    color: "success",
    to: { name: "global-teachers" },
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
    key: "rooms",
    title: t("Rooms"),
    value: toNumber(data.value?.rooms?.total_rooms),
    subtitle: t("Available rooms"),
    icon: "tabler-door",
    color: "warning",
    to: { name: "global-rooms" },
  },
]);

watch(
  [() => settingStore.branch_id, () => yearStore.year_id],
  () => {
    getData();
  },
);

onMounted(() => {
  getData();
});
</script>

<template>
  <div class="dashboard-curriculum">
    <VRow>
      <VCol
        v-for="card in summaryCards"
        :key="card.key"
        cols="12"
        sm="6"
        lg="3"
      >
        <VCard
          :to="card.to"
          class="stat-card"
          :ripple="false"
        >
          <VCardText class="pa-2">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center gap-2">
                <VAvatar
                  :color="card.color"
                  size="44"
                  rounded
                  variant="tonal"
                >
                  <VIcon
                    :icon="card.icon"
                    size="24"
                  />
                </VAvatar>

                <div class="text-body-1 font-weight-medium">
                  {{ card.title }}
                </div>
              </div>
              <div class="text-h4 mb-1">
                {{ loading ? "—" : card.value }}
              </div>

              <VProgressCircular
                v-if="loading"
                :color="card.color"
                indeterminate
                size="22"
                width="2"
              />
            </div>

            <div class="text-body-2 text-medium-emphasis mt-1">
              {{ loading ? $t("Loading…") : card.subtitle }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <div class="dashboard-calendar mt-6">
      <CalendarList />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.stat-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(var(--v-shadow-key-umbra-color), 0.12);
  }
}
</style>
