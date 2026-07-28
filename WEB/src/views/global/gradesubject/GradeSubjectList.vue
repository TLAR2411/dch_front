<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { getGrades, getSubjects } from "@/services/dataService.js";
import supabase from "@/utils/supabase.js";
import successAlert from "@/helper/successAlert.js";
import DeleteAlert from "@/helper/deleteAlert.js";
import { useYearStore } from "@/stores/yearStore.js";
import AddEditGradeSubjectDialog from "./AddEditGradeSubjectDialog.vue";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";

const { t } = useI18n();
const yearStore = useYearStore();

definePage({
  meta: {
    title: "Grade Subjects",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const isLoading = ref(true);
const isDialogVisible = ref(false);
const formData = ref({});
const allSubjects = ref([]);
const grades = ref([]);

const filter = ref({ search: null });
const openGradeId = ref(null);
const openSubjectKey = ref(null);
const openChildSubjects = ref({});

const yearId = computed(() => yearStore.year_id);

const parentChildKey = (gradeId, parentSubjectId) =>
  `${gradeId}-${parentSubjectId}`;

const isChildSubjectOpen = (gradeId, parentSubjectId, childSubjectId) =>
  openChildSubjects.value[parentChildKey(gradeId, parentSubjectId)] ===
  childSubjectId;

const toggleGrade = (gradeId) => {
  openGradeId.value = openGradeId.value === gradeId ? null : gradeId;
  openSubjectKey.value = null;
};

const toggleSubject = (gradeId, subjectId) => {
  const key = `${gradeId}-${subjectId}`;
  openSubjectKey.value = openSubjectKey.value === key ? null : key;
};

const toggleChildSubject = (gradeId, parentSubjectId, childSubjectId) => {
  const parentKey = parentChildKey(gradeId, parentSubjectId);
  const isOpen = openChildSubjects.value[parentKey] === childSubjectId;

  openChildSubjects.value = {
    ...openChildSubjects.value,
    [parentKey]: isOpen ? null : childSubjectId,
  };
};

const mapSubjectNode = (
  assignment,
  childSubjects = [],
) => ({
  grade_subject_id: assignment.id,
  subject_id: assignment.subject_id,
  subject: assignment.subject
    ? {
        name_en: assignment.subject.name_en ?? null,
        name_kh: assignment.subject.name_kh ?? null,
      }
    : null,
  child_subjects: childSubjects
    .sort((a, b) =>
      String(a.name_en ?? "").localeCompare(String(b.name_en ?? "")),
    )
    .map((child) => ({
      subject_id: child.id,
      subject: {
        name_en: child.name_en ?? null,
        name_kh: child.name_kh ?? null,
      },
    })),
});

const fetchGradeSubjects = async () => {
  if (!yearId.value) {
    grades.value = [];
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  try {
    const gradeRows = (await getGrades()) ?? [];

    const { data: assignmentRows, error: assignmentError } = await supabase
      .from("grade_subject")
      .select(`
        id,
        grade_id,
        subject_id,
        year_id,
        subject:subjects(id, name_en, name_kh, parent_id)
      `)
      .eq("year_id", yearId.value)
      .is("deleted_at", null)
      .eq("is_active", true);

    if (assignmentError) throw assignmentError;

    const assignments = assignmentRows ?? [];
    const parentAssignments = assignments.filter(
      (row) => !row.subject?.parent_id,
    );

    const parentSubjectIds = [
      ...new Set(parentAssignments.map((row) => row.subject_id)),
    ];

    let childSubjectRows = [];
    if (parentSubjectIds.length) {
      const { data: childRows, error: childError } = await supabase
        .from("subjects")
        .select("id, name_en, name_kh, parent_id")
        .in("parent_id", parentSubjectIds)
        .is("deleted_at", null);

      if (childError) throw childError;
      childSubjectRows = childRows ?? [];
    }

    const childrenByParentId = new Map();
    for (const child of childSubjectRows) {
      if (!childrenByParentId.has(child.parent_id)) {
        childrenByParentId.set(child.parent_id, []);
      }
      childrenByParentId.get(child.parent_id).push(child);
    }

    const assignmentsByGrade = new Map();
    for (const row of parentAssignments) {
      if (!assignmentsByGrade.has(row.grade_id)) {
        assignmentsByGrade.set(row.grade_id, []);
      }
      assignmentsByGrade.get(row.grade_id).push(row);
    }

    grades.value = gradeRows
      .map((grade) => {
        const gradeAssignments = assignmentsByGrade.get(grade.id) ?? [];

        return {
          grade_id: grade.id,
          grade: {
            name_en: grade.name_en ?? null,
            name_kh: grade.name_kh ?? null,
          },
          subjects: gradeAssignments
            .map((assignment) =>
              mapSubjectNode(
                assignment,
                childrenByParentId.get(assignment.subject_id) ?? [],
              ),
            )
            .sort((a, b) =>
              String(a.subject?.name_en ?? "").localeCompare(
                String(b.subject?.name_en ?? ""),
              ),
            ),
        };
      })
      .sort((a, b) =>
        String(a.grade?.name_en ?? "").localeCompare(String(b.grade?.name_en ?? "")),
      );

    if (grades.value.length && openGradeId.value === null) {
      openGradeId.value = grades.value[0].grade_id;
    }
  } catch (error) {
    console.error("Failed to fetch grade subjects:", error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to fetch grade subjects",
    });
  } finally {
    isLoading.value = false;
  }
};

const filteredGrades = computed(() => {
  const q = (filter.value.search || "").trim().toLowerCase();
  if (!q) return grades.value;

  return grades.value
    .map((grade) => {
      const gradeMatches =
        grade.grade?.name_en?.toLowerCase().includes(q) ||
        grade.grade?.name_kh?.toLowerCase().includes(q);

      const matchingSubjects = (grade.subjects || []).filter((subject) => {
        const parentMatches =
          subject.subject?.name_en?.toLowerCase().includes(q) ||
          subject.subject?.name_kh?.toLowerCase().includes(q);

        const childMatches = (subject.child_subjects || []).some(
          (child) =>
            child.subject?.name_en?.toLowerCase().includes(q) ||
            child.subject?.name_kh?.toLowerCase().includes(q),
        );

        return parentMatches || childMatches;
      });

      if (gradeMatches) return grade;
      if (matchingSubjects.length) {
        return { ...grade, subjects: matchingSubjects };
      }
      return null;
    })
    .filter(Boolean);
});



const openCreateDialog = (grade) => {
  formData.value = {
    grade_id: grade.grade_id,
    grade_name: grade.grade?.name_en ?? null,
    assigned_subject_ids: (grade.subjects ?? []).map(
      (subject) => subject.subject_id,
    ),
  };
  isDialogVisible.value = true;
};

const onCreate = async (data, callback) => {
  if (!yearId.value) {
    successAlert.fire({
      icon: "error",
      title: "Please select a school year first",
    });
    callback(false);
    return;
  }

  try {
    isLoading.value = true;

    const subjectIds = [...new Set(data.subject_ids ?? [])];
    if (!subjectIds.length) {
      throw new Error("Please select at least one subject.");
    }

    const payload = subjectIds.map((subjectId) => ({
      grade_id: data.grade_id,
      subject_id: subjectId,
      year_id: yearId.value,
      is_active: true,
    }));

    const { error } = await supabase.from("grade_subject").insert(payload);
    if (error) throw error;

    successAlert.fire({
      icon: "success",
      title: "Subjects assigned successfully",
    });

    await fetchGradeSubjects();
    isDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to assign subjects:", error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to assign subjects",
    });
    callback(false);
  } finally {
    isLoading.value = false;
  }
};

const onDelete = async (gradeSubjectId) => {
  await DeleteAlert(async () => {
    try {
      isLoading.value = true;

      const { error } = await supabase
        .from("grade_subject")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", gradeSubjectId);

      if (error) throw error;

      successAlert.fire({
        icon: "success",
        title: "Subject removed from grade successfully",
      });
      await fetchGradeSubjects();
    } catch (error) {
      console.error("Failed to remove subject:", error);
      successAlert.fire({
        icon: "error",
        title: error.message || "Failed to remove subject",
      });
    } finally {
      isLoading.value = false;
    }
  });
};

onMounted(async () => {
  allSubjects.value = (await getSubjects()) ?? [];
  await fetchGradeSubjects();
});
watch(yearId, async () => {
  openGradeId.value = null;
  openSubjectKey.value = null;
  openChildSubjects.value = {};
  await fetchGradeSubjects();
});
</script>

<template>
  <AddEditGradeSubjectDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    :subjects="allSubjects"
    @on-create="onCreate"
  />

  <div class="grade-subject-scroll">
    <div class="d-flex flex-column gap-4">
      <div class="d-flex align-center mt-3 gap-4">
        <AppTextField
          v-model="filter.search"
          :placeholder="t('Search grade or subject...')"
          prepend-inner-icon="tabler-search"
          variant="outlined"
          rounded="lg"
          hide-details
          class="flex-grow-1"
        />
      </div>

      <VAlert
        v-if="!yearId"
        type="warning"
        variant="tonal"
        :text="t('Please select a school year to manage grade subjects.')"
      />

      <VRow v-if="isLoading && !grades.length" class="d-flex justify-center">
        <VCol v-for="n in 4" :key="n" cols="12">
          <VSkeletonLoader type="avatar, sentences" class="border rounded-lg" />
        </VCol>
      </VRow>

      <VAlert
        v-else-if="yearId && !filteredGrades.length"
        type="info"
        variant="tonal"
        :text="t('No grades or subjects match your search.')"
      />

      <VCard
        v-for="grade in filteredGrades"
        :key="grade.grade_id"
        variant="outlined"
        rounded="lg"
        class="pa-0"
      >
        <div
          class="d-flex align-center justify-space-between pa-4 cursor-pointer"
          @click="toggleGrade(grade.grade_id)"
        >
          <div class="d-flex align-center gap-3">
            <VAvatar color="primary" variant="tonal" size="44" rounded="lg">
              <VIcon icon="tabler-school" color="primary" size="22" />
            </VAvatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ grade.grade?.name_en }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ grade.grade?.name_kh }}
              </div>
            </div>
          </div>

          <div class="d-flex align-center gap-3">
            <VBtn
              icon="tabler-plus"
              color="primary"
              variant="text"
              size="small"
              density="comfortable"
              @click.stop="openCreateDialog(grade)"
            />
            <VChip size="small" color="primary" variant="tonal">
              {{ grade.subjects?.length ?? 0 }} {{ t("subjects") }}
            </VChip>
            <VIcon
              :icon="
                openGradeId === grade.grade_id
                  ? 'tabler-chevron-up'
                  : 'tabler-chevron-down'
              "
            />
          </div>
        </div>

        <VExpandTransition>
          <div v-show="openGradeId === grade.grade_id">
            <VDivider />

            <div
              v-if="!(grade.subjects || []).length"
              class="pa-4 text-caption text-medium-emphasis text-center"
            >
              {{ t("No subjects assigned yet.") }}
            </div>

            <div v-else class="d-flex flex-column gap-3 pa-4">
              <VCard
                v-for="subject in grade.subjects"
                :key="subject.grade_subject_id"
                variant="outlined"
                rounded="lg"
                class="subject-card"
              >
                <div
                  class="d-flex align-center justify-space-between pa-4 cursor-pointer"
                  @click.stop="toggleSubject(grade.grade_id, subject.subject_id)"
                >
                  <div class="d-flex align-center gap-3">
                    <VAvatar
                      color="lightprimary"
                      variant="tonal"
                      size="36"
                      rounded="lg"
                    >
                      <VIcon icon="tabler-book" color="lightprimary" size="18" />
                    </VAvatar>
                    <div>
                      <div class="text-body-1 font-weight-bold">
                        {{ subject.subject?.name_en }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ subject.subject?.name_kh }}
                      </div>
                    </div>
                  </div>

                  <div class="d-flex align-center gap-2 subject-row-actions">
                    <VChip
                      v-if="(subject.child_subjects || []).length"
                      size="small"
                      color="lightprimary"
                      variant="tonal"
                    >
                      {{ subject.child_subjects.length }} {{ t("children") }}
                    </VChip>
                    <VIcon
                      v-if="(subject.child_subjects || []).length"
                      size="18"
                      :icon="
                        openSubjectKey === `${grade.grade_id}-${subject.subject_id}`
                          ? 'tabler-chevron-up'
                          : 'tabler-chevron-down'
                      "
                    />
                    <VBtn
                      icon="tabler-trash"
                      color="error"
                      variant="text"
                      size="small"
                      density="comfortable"
                      @click.stop="onDelete(subject.grade_subject_id)"
                    />
                  </div>
                </div>

                <VExpandTransition>
                  <div
                    v-show="
                      openSubjectKey === `${grade.grade_id}-${subject.subject_id}` &&
                      (subject.child_subjects || []).length
                    "
                  >
                    <VDivider />

                    <div class="d-flex flex-column gap-2 pa-4 pl-8">
                      <VCard
                        v-for="childSubject in subject.child_subjects"
                        :key="childSubject.subject_id"
                        variant="outlined"
                        rounded="lg"
                        class="child-subject-card"
                      >
                        <div
                          class="d-flex align-center justify-space-between pa-3 cursor-pointer"
                          @click.stop="
                            toggleChildSubject(
                              grade.grade_id,
                              subject.subject_id,
                              childSubject.subject_id,
                            )
                          "
                        >
                          <div class="d-flex align-center gap-3">
                            <VAvatar
                              color="secondary"
                              variant="tonal"
                              size="32"
                              rounded="lg"
                            >
                              <VIcon icon="tabler-book-2" color="secondary" size="16" />
                            </VAvatar>
                            <div>
                              <div class="text-body-2 font-weight-bold">
                                {{ childSubject.subject?.name_en }}
                              </div>
                              <div class="text-caption text-medium-emphasis">
                                {{ childSubject.subject?.name_kh }}
                              </div>
                            </div>
                          </div>
                          <VIcon
                            size="16"
                            :icon="
                              isChildSubjectOpen(
                                grade.grade_id,
                                subject.subject_id,
                                childSubject.subject_id,
                              )
                                ? 'tabler-chevron-up'
                                : 'tabler-chevron-down'
                            "
                          />
                        </div>

                        <VExpandTransition>
                          <div
                            v-show="
                              isChildSubjectOpen(
                                grade.grade_id,
                                subject.subject_id,
                                childSubject.subject_id,
                              )
                            "
                          >
                            <VDivider />
                            <div
                              class="pa-3 text-caption text-medium-emphasis text-center"
                            >
                              {{ t("Child subject of") }}
                              {{ subject.subject?.name_en }}
                            </div>
                          </div>
                        </VExpandTransition>
                      </VCard>
                    </div>
                  </div>
                </VExpandTransition>
              </VCard>
            </div>
          </div>
        </VExpandTransition>
      </VCard>
    </div>
  </div>
</template>

<style scoped>
.grade-subject-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.subject-row-actions {
  flex-shrink: 0;
  justify-content: flex-end;
}

.subject-card {
  border-width: 1px;
  border-color: rgba(var(--v-theme-lightprimary), 0.28);
}

.child-subject-card {
  border-width: 1px;
  border-color: rgba(var(--v-theme-secondary), 0.22);
}
</style>
