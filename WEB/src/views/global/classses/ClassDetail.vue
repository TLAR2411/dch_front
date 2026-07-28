<script setup>
import { onMounted, ref, computed, watch } from "vue";
import StudentClassList from "../studentclass/StudentClassList.vue";
import { getWeekdays } from "@/services/dataService.js";

import { useRouter, useRoute } from "vue-router";
import Schedule from "../components/Schedule.vue";
import TeacherClass from "../components/TeacherClass.vue";
import { api } from "@/utils/api.js";

const route = useRoute();

const payload = ref({
  class_id: route.params.id,
});

const classDetail = ref(null);

const getClassDetail = async () => {
  try {
    const res = await api.post("class-detail", payload.value);
    classDetail.value = res.data.data;
  } catch (error) {}
};

const currentTab = ref("window1");

const router = useRouter();

const stats = computed(() => {
  if (!classDetail.value) return [];
  const d = classDetail.value;
  return [
    {
      label: "Total students",
      value: d.student_total ?? 0,
      icon: "tabler-users",
      iconBg: "#E6F1FB",
      iconColor: "#185FA5",
    },
    {
      label: "Female students",
      value: d.student_female ?? 0,
      icon: "tabler-gender-female",
      iconBg: "#FBEAF0",
      iconColor: "#993556",
    },
    {
      label: "Teachers",
      value: d.teacher_total ?? 0,
      icon: "tabler-chalkboard",
      iconBg: "#E1F5EE",
      iconColor: "#0F6E56",
    },
    {
      label: "Assistance",
      value: d.assistance_total ?? 0,
      icon: "tabler-user-check",
      iconBg: "#FAEEDA",
      iconColor: "#633806",
    },
  ];
});

const weekdays = ref([]);

watch(currentTab, async () => {
  await nextTick();

  const scrollable =
    document.querySelector(".page-content-container > :first-child") ||
    document.querySelector(".layout-page-content > :first-child") ||
    document.querySelector(".layout-page-content") ||
    window;

  scrollable?.scrollTo({ top: 0, behavior: "smooth" });
});
onMounted(async () => {
  getClassDetail();
});
</script>

<template>
  <div class="class-detail-page">
    <VTabs v-model="currentTab" class="my-3">
      <VTab>General</VTab>
      <VTab>Students</VTab>
      <VTab>Teachers</VTab>
    </VTabs>

    <div>
      <VWindow v-model="currentTab">
        <VWindowItem value="window1">
          <VCard rounded="lg" class="pa-5 mb-4" v-if="classDetail">
            <div
              class="d-flex align-start justify-space-between flex-wrap ga-3"
            >
              <div class="d-flex align-center ga-3">
                <div
                  class="d-flex align-center justify-center rounded-lg text-h5 font-weight-medium bg-primary"
                  style="
                    width: 52px;
                    height: 52px;
                    color: white;
                    flex-shrink: 0;
                  "
                >
                  {{ classDetail.class?.symbol }}
                </div>
                <div>
                  <p class="text-h6 font-weight-medium mb-0">
                    {{ classDetail.class?.name_en }}
                  </p>
                  <p class="text-body-2 text-medium-emphasis mb-0">
                    {{ classDetail.class?.name_kh }}
                  </p>
                </div>
              </div>

              <!-- Badges -->
              <div class="d-flex ga-2 flex-wrap align-center">
                <VChip size="small" style="background: #e1f5ee; color: #0f6e56">
                  {{ classDetail.grade?.name_en }}
                </VChip>
                <VChip size="small" style="background: #faeeda; color: #633806">
                  Room {{ classDetail.class?.room_number }}
                </VChip>
                <VChip size="small" style="background: #e6f1fb; color: #185fa5">
                  {{ classDetail.year?.name }}
                </VChip>
              </div>
            </div>

            <!-- Period row -->
            <VDivider class="my-3" />
            <!-- <div
            class="d-flex align-center flex-wrap ga-2"
            v-if="classDetail.period?.length"
          >
            <VChip
              v-for="term in classDetail.period"
              :key="term.id"
              class="font-weight-bold"
              style=""
              variant="outlined"
            >
              {{ term.name_en }}
              <span class="text-caption ml-1" style="">
                {{ formatDate(term.start_date) }} -
                {{ formatDate(term.end_date) }}
              </span>
            </VChip>
          </div> -->

            <VRow class="mb-2">
              <VCol cols="12" md="3" v-for="stat in stats" :key="stat.label">
                <VCard rounded="lg" class="pa-3">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-caption text-medium-emphasis">{{
                      stat.label
                    }}</span>
                    <div
                      class="d-flex align-center justify-center rounded"
                      :style="{
                        width: '38px',
                        height: '38px',
                        background: stat.iconBg,
                      }"
                    >
                      <VIcon size="26" :color="stat.iconColor">{{
                        stat.icon
                      }}</VIcon>
                    </div>
                  </div>
                  <p class="text-h4 font-weight-medium mb-0">
                    {{ stat.value }}
                  </p>
                </VCard>
              </VCol>
            </VRow>
          </VCard>
          <Schedule :class_id="route.params.id" />
        </VWindowItem>
        <VWindowItem value="window2">
          <StudentClassList :payload="payload" />
        </VWindowItem>
        <VWindowItem value="window3">
          <TeacherClass :class_id="route.params.id" class="mt-4" />
        </VWindowItem>
      </VWindow>
    </div>
  </div>
</template>
