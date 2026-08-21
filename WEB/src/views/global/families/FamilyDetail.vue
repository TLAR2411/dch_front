<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import successAlert from "@/helper/successAlert.js";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import formatGender from "@/utils/formater/formatGender";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const isLoading = ref(true);
const family = ref(null);
const addStudentDialogVisible = ref(false);
const studentOptions = ref([]);
const selectedStudentId = ref(null);
const studentSearchLoading = ref(false);
const addStudentLoading = ref(false);

const guardianTypeLabel = (type) => {
  const map = {
    father: t("Father"),
    mother: t("Mother"),
    grandparent: t("Grandparent"),
    sibling: t("Sibling"),
    uncle: t("Uncle"),
    aunt: t("Aunt"),
    legal_guardian: t("Legal Guardian"),
    other: t("Other"),
  };
  return map[type] || type || "-";
};

const guardians = computed(() => family.value?.guardians ?? []);
const students = computed(() => family.value?.students ?? []);

const searchStudents = async () => {
  try {
    studentSearchLoading.value = true;
    const res = await api.post("students-all");

    if (res.data.status) {
      const linkedStudentIds = new Set(
        students.value.map((student) => student.student_id),
      );
      const rows = res.data.data?.data || [];

      studentOptions.value = rows
        .filter((student) => !linkedStudentIds.has(student.id))
        .map((student) => ({
          id: student.id,
          label:
            student.name_en ||
            student.name_kh ||
            student.student_id ||
            `Student #${student.id}`,
        }));
    }
  } catch (error) {
    console.error("Failed to search students:", error);
  } finally {
    studentSearchLoading.value = false;
  }
};

const addStudentToFamily = async () => {
  if (!selectedStudentId.value) return;

  try {
    addStudentLoading.value = true;
    const res = await api.post("student-family-link", {
      student_id: selectedStudentId.value,
      family_id: route.params.id,
    });

    if (!res.data.status) {
      throw new Error(res.data.message || "Failed to link student");
    }

    addStudentDialogVisible.value = false;
    selectedStudentId.value = null;
    await getFamilyDetail();
    await searchStudents();

    successAlert.fire({
      icon: "success",
      title: t("Student linked to family"),
    });
  } catch (error) {
    console.error("Failed to link student:", error);
    successAlert.fire({
      icon: "error",
      title: error.response?.data?.message || t("Failed to link student"),
    });
  } finally {
    addStudentLoading.value = false;
  }
};

const stats = computed(() => {
  const guardianCount = guardians.value.length;
  const studentCount = students.value.length;
  return [
    {
      label: t("Guardians"),
      value: guardianCount,
      icon: "tabler-users",
      iconBg: "#E6F1FB",
      iconColor: "#185FA5",
    },
    {
      label: t("Students"),
      value: studentCount,
      icon: "tabler-school",
      iconBg: "#E1F5EE",
      iconColor: "#0F6E56",
    },
    {
      label: t("Total Members"),
      value: guardianCount + studentCount,
      icon: "tabler-home-heart",
      iconBg: "#FAEEDA",
      iconColor: "#633806",
    },
  ];
});

const getFamilyDetail = async () => {
  try {
    isLoading.value = true;
    const res = await api.post("families-show", { id: route.params.id });
    if (res.data.status) {
      family.value = res.data.data.data;
    }
  } catch (error) {
    console.error("Failed to fetch family detail:", error);
  } finally {
    isLoading.value = false;
  }
};

const goBack = () => {
  router.push({ name: "global-families" });
};

onMounted(() => {
  getFamilyDetail();
});
</script>

<template>
  <VDialog v-model="addStudentDialogVisible" max-width="520">
    <VCard>
      <VCardTitle>{{ t("Add Student to Family") }}</VCardTitle>

      <VCardText>
        <AppAutocomplete
          v-model="selectedStudentId"
          label="Student"
          :items="studentOptions"
          item-value="id"
          item-title="label"
          :loading="studentSearchLoading"
          clearable
          @focus="searchStudents"
        />
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="addStudentDialogVisible = false">
          {{ t("Cancel") }}
        </VBtn>
        <VBtn
          color="primary"
          :loading="addStudentLoading"
          :disabled="!selectedStudentId"
          @click="addStudentToFamily"
        >
          {{ t("Add") }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>

  <div class="family-detail-page">
    <div class="d-flex align-center ga-2 mb-4">
      <VBtn icon variant="text" size="small" @click="goBack">
        <VIcon>tabler-arrow-left</VIcon>
      </VBtn>
    </div>

    <div v-if="isLoading" class="d-flex justify-center align-center py-16">
      <VProgressCircular indeterminate color="primary" />
    </div>

    <template v-else-if="family">
      <VCard rounded="lg" class="pa-4 pa-sm-5 mb-4">
        <div
          class="d-flex flex-column flex-sm-row align-sm-start justify-space-between ga-3"
        >
          <div>
            <p class="text-h5 font-weight-medium mb-1">
              {{ family.name_en || family.family_name || "-" }}
            </p>
            <p
              v-if="family.name_kh"
              class="text-body-1 text-medium-emphasis mb-0"
            >
              {{ family.name_kh }}
            </p>
          </div>
        </div>

        <p
          v-if="family.description"
          class="text-body-2 text-medium-emphasis mt-3 mb-0"
        >
          {{ family.description }}
        </p>
      </VCard>

      <VRow class="mb-4">
        <VCol v-for="stat in stats" :key="stat.label" cols="12" sm="4">
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
                <VIcon size="22" :color="stat.iconColor">
                  {{ stat.icon }}
                </VIcon>
              </div>
            </div>
            <p class="text-h4 font-weight-medium mb-0">
              {{ stat.value }}
            </p>
          </VCard>
        </VCol>
      </VRow>

      <VCard rounded="lg" class="pa-4 pa-sm-5 mb-4">
        <p class="text-h6 font-weight-medium mb-3">{{ t("Guardians") }}</p>

        <div v-if="!guardians.length" class="text-center py-8">
          <VIcon size="40" class="text-medium-emphasis mb-2">
            tabler-user-off
          </VIcon>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ t("No guardians") }}
          </p>
        </div>

        <VTable v-else density="comfortable">
          <thead>
            <tr>
              <th>{{ t("Type") }}</th>
              <th>{{ t("Name English") }}</th>
              <th>{{ t("Name Khmer") }}</th>
              <th>{{ t("Phone") }}</th>
              <th>{{ t("email") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in guardians" :key="g.id">
              <td>
                <VChip size="small" variant="tonal">
                  {{ guardianTypeLabel(g.type) }}
                </VChip>
              </td>
              <td>{{ g.name_en || g.user_name || "-" }}</td>
              <td>{{ g.name_kh || "-" }}</td>
              <td>{{ g.phone || "-" }}</td>
              <td>{{ g.email || "-" }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <VCard rounded="lg" class="pa-4 pa-sm-5 mb-4">
        <div class="d-flex align-center justify-space-between mb-3">
          <p class="text-h6 font-weight-medium mb-0">
            {{ t("Linked Students") }}
          </p>
          <VBtn
            color="primary"
            variant="tonal"
            prepend-icon="tabler-user-plus"
            @click="addStudentDialogVisible = true"
          >
            {{ t("Add Student") }}
          </VBtn>
        </div>

        <div v-if="!students.length" class="text-center py-8">
          <VIcon size="40" class="text-medium-emphasis mb-2">
            tabler-school-off
          </VIcon>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ t("No linked students") }}
          </p>
        </div>

        <VTable v-else density="comfortable">
          <thead>
            <tr>
              <th>{{ t("Student ID") }}</th>
              <th>{{ t("Name English") }}</th>
              <th>{{ t("Name Khmer") }}</th>
              <th>{{ t("Gender") }}</th>
              <th>{{ t("Status") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in students" :key="s.id">
              <td>{{ s.student_id || s.id }}</td>
              <td>{{ s.name_en || "-" }}</td>
              <td>{{ s.name_kh || "-" }}</td>
              <td>{{ formatGender(s.gender, t) }}</td>
              <td>
                <AppStatusChip
                  :color="s.is_active ? 'success' : 'error'"
                  :label="s.is_active ? t('Active') : t('Inactive')"
                />
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </template>

    <div v-else class="text-center py-16">
      <VIcon size="48" class="text-medium-emphasis mb-2">
        tabler-home-off
      </VIcon>
      <p class="text-body-1 text-medium-emphasis mb-4">
        {{ t("Family not found") }}
      </p>
      <VBtn color="primary" variant="tonal" @click="goBack">
        {{ t("Back") }}
      </VBtn>
    </div>
  </div>
</template>
