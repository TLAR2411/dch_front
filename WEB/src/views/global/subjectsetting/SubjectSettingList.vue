<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useDisplay } from "vuetify";
import formatTime from "@/utils/formater/formatTime";
import AddEditSubjectSettingDialog from "./AddEditSubjectSettingDialog.vue";
import { onMounted, ref, computed } from "vue";
import { getSubjects } from "@/services/dataService.js";
import supabase from "@/utils/supabase.js";
import successAlert from "@/helper/successAlert.js";
import DeleteAlert from "@/helper/deleteAlert.js";

import { useYearStore } from "@/stores/yearStore.js";

const yearStore = useYearStore();

const yearId = yearStore.year_id;

const { mdAndUp } = useDisplay();

definePage({
  meta: {
    title: "Checkin Checkout",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-curriculumns",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const { t } = useI18n();

const formData = ref({});
const isDialogVisible = ref(false);
const isLoading = ref(true);

const subjects = ref([]);
const grades = ref([]); // grouped grade -> subjects -> rules, same shape as the API payload

const filter = ref({
  search: null,
});

// only one grade open at a time - holds the currently open grade_id (or null)
const openGradeId = ref(null);
// subject panels can stay open independently, keyed by id
const openSubjects = ref({});

const toggleGrade = (gradeId) => {
  openGradeId.value = openGradeId.value === gradeId ? null : gradeId;
};

const toggleSubject = (subjectRowId) => {
  openSubjects.value[subjectRowId] = !openSubjects.value[subjectRowId];
};

// category (rule) rows can expand to show their assessments
const openRules = ref({});

const ruleKey = (gradeId, subjectId, rule) =>
  `${gradeId}-${subjectId}-${rule.grading_rule_id ?? rule.category_id}`;

const toggleRule = (key) => {
  openRules.value[key] = !openRules.value[key];
};

// bar segment colors, cycling for however many rule categories a subject has
const barColors = ["#1e1e2d", "#4b4b63", "#9a9ab0", "#c8c8d6"];

const totalMaxScore = (subject) =>
  (subject.rules || []).reduce((sum, r) => sum + Number(r.max_score || 0), 0);

const totalPercentage = (subject) =>
  (subject.rules || []).reduce((sum, r) => sum + Number(r.percentage || 0), 0);

const filteredGrades = computed(() => {
  const q = (filter.value.search || "").trim().toLowerCase();
  if (!q) return grades.value;

  return grades.value
    .map((grade) => {
      const gradeMatches =
        grade.grade?.name_en?.toLowerCase().includes(q) ||
        grade.grade?.name_kh?.toLowerCase().includes(q);

      const matchingSubjects = (grade.subjects || []).filter(
        (s) =>
          s.subject?.name_en?.toLowerCase().includes(q) ||
          s.subject?.name_kh?.toLowerCase().includes(q),
      );

      if (gradeMatches) return grade;
      if (matchingSubjects.length)
        return { ...grade, subjects: matchingSubjects };
      return null;
    })
    .filter(Boolean);
});

const fetchGrades = async () => {
  isLoading.value = true;
  try {
    const res = await api.post("grading-rule-list");
    if (res.data.status) {
      grades.value = res.data.data.data ?? res.data.data;

      // default: expand the first grade so the page isn't empty on load
      if (grades.value.length && openGradeId.value === null) {
        openGradeId.value = grades.value[0].grade_id;
      }
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

// const onDelete = async (id, type) => {
//   try {
//     const res = await api.post("grading-rule-delete", {
//       id: id,
//       type: type,
//       grade_id: formData.value.grade_id || null,
//     });
//     if (res.data.status) {
//       await fetchGrades();
//     } else {
//       console.error("Error with the response:", res.data);
//     }
//   } catch (error) {
//     console.error("Failed to fetch data:", error);
//   } finally {
//     isLoading.value = false;
//   }
// };

const onDeleteRule = async (id) => {
  await DeleteAlert(async () => {
    try {
      // delete the rule's assessment items first
      const { error: itemsError } = await supabase
        .from("assessment_items")
        .delete()
        .eq("grade_subject_grading_rule_id", id);

      if (itemsError) throw itemsError;

      const { error } = await supabase
        .from("grade_subject_grading_rule")
        .delete()
        .eq("id", id);

      if (error) throw error;

      successAlert.fire({
        icon: "success",
        title: "Rule deleted successfully",
      });
      fetchGrades();
    } catch (error) {
      console.error("Failed to delete rule:", error);
      successAlert.fire({
        icon: "error",
        title: error.message || "Failed to delete rule",
      });
    }
  });
};

const onDelete = async (id, gradeId) => {
  await DeleteAlert(async () => {
    try {
      // find all rule ids for this subject/grade/year
      const { data: rules, error: rulesError } = await supabase
        .from("grade_subject_grading_rule")
        .select("id")
        .eq("subject_id", id)
        .eq("year_id", yearId)
        .eq("grade_id", gradeId);

      if (rulesError) throw rulesError;

      const ruleIds = (rules || []).map((r) => r.id);

      // delete their assessment items first
      if (ruleIds.length) {
        const { error: itemsError } = await supabase
          .from("assessment_items")
          .delete()
          .in("grade_subject_grading_rule_id", ruleIds);

        if (itemsError) throw itemsError;
      }

      const { error } = await supabase
        .from("grade_subject_grading_rule")
        .delete()
        .eq("subject_id", id)
        .eq("year_id", yearId)
        .eq("grade_id", gradeId);

      if (error) throw error;

      successAlert.fire({
        icon: "success",
        title: "Rule deleted successfully",
      });
      fetchGrades();
    } catch (error) {
      console.error("Failed to delete rule:", error);
      successAlert.fire({
        icon: "error",
        title: error.message || "Failed to delete rule",
      });
    }
  });
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;
    const res = await api.post("grading-rule-store", data);
    if (res.data.status) {
      await fetchGrades();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
    subjects.value = await getSubjects();
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (id, type, grade_id = null) => {
  console.log("edit item", id, type);
  try {
    isLoading.value = true;
    const res = await api.post("grading-rule-show", {
      id: id,
      type: type,
      grade_id: grade_id,
    });

    if (res.data.status) {
      formData.value = res.data.data;
      formData.value.edit_mode = type;
      formData.value.isEdit = true;
      isDialogVisible.value = true;
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

// const onUpdate = async (data, callback) => {
//   try {
//     isLoading.value = true;
//     const res = await api.post("grading-rule-update", data);

//     if (res.data.status) {
//       await fetchGrades();
//       isDialogVisible.value = false;
//     } else {
//       console.error("Error with the response:", res.data);
//     }
//     callback(res.data.status);
//   } catch (error) {
//     console.error("Failed to fetch data:", error);
//   } finally {
//     isLoading.value = false;
//   }
// };

const onUpdate = async (data, callback) => {
  isLoading.value = true;
  try {
    const { subject_id, year_id, rules } = data;
    const gradeIds = Array.isArray(data.grade_id)
      ? data.grade_id
      : [data.grade_id];

    if (!subject_id || !year_id || !gradeIds.length || !rules?.length) {
      console.error("Missing subject_id / year_id / grade_id / rules");
      callback(false);
      return;
    }

    // 1. Fetch existing rows ONLY for the grades being edited (not the whole subject/year)
    const { data: existingRows, error: fetchError } = await supabase
      .from("grade_subject_grading_rule")
      .select("*")
      .eq("subject_id", subject_id)
      .eq("year_id", year_id)
      .in("grade_id", gradeIds);

    if (fetchError) throw fetchError;

    // 2. If multiple grades selected, make sure they currently share
    //    the exact same category_id set before allowing a bulk update
    if (gradeIds.length > 1) {
      const categorySetByGrade = new Map();
      for (const grade_id of gradeIds) {
        const cats = existingRows
          .filter((r) => r.grade_id === grade_id)
          .map((r) => r.category_id)
          .sort((a, b) => a - b)
          .join(",");
        categorySetByGrade.set(grade_id, cats);
      }

      // ignore grades that have no existing rules yet (newly added to this subject)
      const nonEmptySets = [...categorySetByGrade.values()].filter(
        (v) => v !== "",
      );
      const uniqueSets = new Set(nonEmptySets);

      if (uniqueSets.size > 1) {
        const message =
          "Selected grades have different rule categories. Please update them individually.";
        console.error(message, Object.fromEntries(categorySetByGrade));
        callback(false, message); // <-- pass message as 2nd arg
        return;
      }
    }

    // 3. Diff — scoped only to the selected grades
    const key = (grade_id, category_id) => `${grade_id}::${category_id}`;
    const existingMap = new Map(
      existingRows.map((row) => [key(row.grade_id, row.category_id), row]),
    );

    const desiredKeys = new Set();
    const toInsert = [];
    const toUpdate = [];

    for (const grade_id of gradeIds) {
      for (const rule of rules) {
        const k = key(grade_id, rule.category_id);
        desiredKeys.add(k);

        const existing = existingMap.get(k);
        if (existing) {
          if (
            existing.percentage !== rule.percentage ||
            existing.max_score !== rule.max_score
          ) {
            toUpdate.push({
              id: existing.id,
              percentage: rule.percentage,
              max_score: rule.max_score,
            });
          }
        } else {
          toInsert.push({
            subject_id,
            year_id,
            grade_id,
            category_id: rule.category_id,
            percentage: rule.percentage,
            max_score: rule.max_score,
          });
        }
      }
    }

    // 4. Delete only rows WITHIN the selected grades that are no longer desired
    //    (e.g. a category was removed from the rules list for these grades)
    // const toDeleteIds = existingRows
    //   .filter((row) => !desiredKeys.has(key(row.grade_id, row.category_id)))
    //   .map((row) => row.id);

    const toDeleteIds =
      data.edit_mode === "subject"
        ? existingRows
            .filter(
              (row) => !desiredKeys.has(key(row.grade_id, row.category_id)),
            )
            .map((row) => row.id)
        : [];

    // --- execute ---
    if (toDeleteIds.length) {
      const { error } = await supabase
        .from("grade_subject_grading_rule")
        .delete()
        .in("id", toDeleteIds);
      if (error) throw error;
    }

    for (const row of toUpdate) {
      const { error } = await supabase
        .from("grade_subject_grading_rule")
        .update({ percentage: row.percentage, max_score: row.max_score })
        .eq("id", row.id);
      if (error) throw error;
    }

    if (toInsert.length) {
      const { error } = await supabase
        .from("grade_subject_grading_rule")
        .insert(toInsert);
      if (error) throw error;
    }

    await fetchGrades();
    isDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to update grading rule:", error);
    callback(false, error.message || "Something went wrong while updating.");
  } finally {
    isLoading.value = false;
  }
};

const onDisable = async (item, callback) => {
  try {
    const res = await api.post("grading-rule-disable", {
      id: item.id,
    });

    if (res.data.status) {
      await fetchGrades();
    } else {
      console.error("Error with the response:", res.data);
    }
    callback?.(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
};

const openCreateDialog = () => {
  formData.value = {};
  isDialogVisible.value = true;
};

onMounted(async () => {
  subjects.value = await getSubjects();
  await fetchGrades();
  await fetchGrades1();
});
</script>

<template>
  <AddEditSubjectSettingDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    :data="subjects"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <div class="grading-rules-scroll">
    <div class="d-flex flex-column gap-4">
      <!-- search + add -->
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
        <VBtn
          color="primary"
          prepend-icon="tabler-plus"
          @click="openCreateDialog"
          density="comfortable"
        >
          {{ t("Add Rule") }}
        </VBtn>
      </div>

      <!-- loading -->

      <VRow v-if="isLoading && !grades.length" class="d-flex justify-center">
        <VCol v-for="n in 4" :key="n" cols="12">
          <VSkeletonLoader type="avatar, sentences" class="border rounded-lg" />
        </VCol>
      </VRow>

      <!-- empty -->
      <VAlert
        v-else-if="!filteredGrades.length"
        type="info"
        variant="tonal"
        :text="t('No grades or subjects match your search.')"
      />

      <!-- grades -->
      <VCard
        v-for="grade in filteredGrades"
        :key="grade.grade_id"
        variant="outlined"
        rounded="lg"
        class="pa-0"
      >
        <!-- grade header -->
        <div
          v-if="mdAndUp"
          class="d-flex align-center justify-space-between pa-4 cursor-pointer"
          @click="toggleGrade(grade.grade_id)"
        >
          <div class="d-flex align-center gap-3">
            <VAvatar color="primary" size="44" rounded="lg">
              <VIcon icon="tabler-school" color="white" size="22" />
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

          <div class="d-flex align-center gap-8">
            <div class="text-center">
              <div style="font-size: 11px">
                {{ t("SUBJECTS") }}
              </div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ grade.subjects?.length ?? 0 }}
              </div>
            </div>
            <VDivider vertical class="mx-2" />
            <div class="text-end">
              <div style="font-size: 11px">
                {{ t("YEAR") }}
              </div>
              <div class="text-subtitle-5 font-weight-bold">
                {{ grade.year?.year_name }}
              </div>
            </div>
            <VIcon
              :icon="
                openGradeId === grade.grade_id
                  ? 'tabler-chevron-up'
                  : 'tabler-chevron-down'
              "
            />
          </div>
        </div>

        <!-- grade header: mobile -->
        <div
          v-else
          class="d-flex justify-space-between gap-2 pa-3 cursor-pointer"
          @click="toggleGrade(grade.grade_id)"
        >
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-3">
              <VAvatar color="primary" size="38" rounded="lg">
                <VIcon icon="tabler-school" color="white" size="18" />
              </VAvatar>
              <div>
                <div class="text-body-1 font-weight-bold">
                  {{ grade.grade?.name_en }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ grade.grade?.name_kh }}
                </div>
              </div>
            </div>
          </div>

          <div
            class="d-flex align-center gap-2 text-caption text-medium-emphasis"
            style="padding-left: 50px"
          >
            <VChip size="small" color="primary" text-color="white">
              {{ grade.subjects?.length ?? 0 }}
            </VChip>
            <span>•</span>
            <span>{{ grade.year?.year_name }}</span>
          </div>
        </div>

        <VExpandTransition>
          <div v-show="openGradeId === grade.grade_id">
            <VDivider />

            <div class="pa-4 d-flex flex-column gap-3">
              <VCard
                v-for="subject in grade.subjects"
                :key="subject.subject_id"
                variant="outlined"
                rounded="lg"
              >
                <!-- subject header -->
                <div
                  class="d-flex align-center justify-space-between pa-4 cursor-pointer"
                  @click="
                    toggleSubject(`${grade.grade_id}-${subject.subject_id}`)
                  "
                >
                  <div class="d-flex align-center gap-3">
                    <VAvatar color="warning" size="36" rounded="lg">
                      <VIcon icon="tabler-book" size="18" />
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

                  <!-- subject actions + rule count + expand icon (largescreen) -->
                  <div class="d-flex align-center gap-3">
                    <div v-if="mdAndUp">
                      <!-- add -->
                      <VBtn
                        icon="tabler-plus"
                        color="success"
                        variant="text"
                        size="small"
                        density="comfortable"
                        @click.stop="
                          openCreateDialog();
                          formData = {
                            subject_id: subject.subject_id,
                            grade_id: grade.grade_id,
                            existingRules: subject.rules,
                            isEdit: false,
                          };
                        "
                      >
                      </VBtn>

                      <!-- edit -->
                      <VBtn
                        icon="tabler-pencil"
                        color="warning"
                        variant="text"
                        size="small"
                        density="comfortable"
                        @click.stop="
                          onEdit(subject.subject_id, 'subject', grade.grade_id)
                        "
                      ></VBtn>

                      <!-- delete -->
                      <VBtn
                        icon="tabler-trash"
                        color="error"
                        variant="text"
                        size="small"
                        density="comfortable"
                        @click.stop="
                          onDelete(subject.subject_id, grade.grade_id)
                        "
                      >
                      </VBtn>
                    </div>

                    <VChip size="small" color="primary" text-color="white">
                      {{ (subject.rules || []).length }} {{ t("rules") }}
                    </VChip>
                    <VIcon
                      :icon="
                        openSubjects[`${grade.grade_id}-${subject.subject_id}`]
                          ? 'tabler-chevron-up'
                          : 'tabler-chevron-down'
                      "
                    />
                  </div>
                </div>

                <!-- subject actions + rule count + expand icon (small screen) -->
                <!-- <VDivider class="mx-2" /> -->
                <div
                  class="d-flex align-center px-2 justify-space-between"
                  v-if="!mdAndUp"
                >
                  <VBtn
                    prepend-icon="tabler-plus"
                    color="primary"
                    variant="text"
                    size="small"
                    density="comfortable"
                    @click.stop="onEdit(subject.subject_id, 'subject')"
                  >
                    {{ t("Add Rule") }}
                  </VBtn>

                  <VBtn
                    prepend-icon="tabler-pencil"
                    color="warning"
                    variant="text"
                    size="small"
                    density="comfortable"
                    @click.stop="onEdit(subject.subject_id)"
                  >
                    {{ t("Edit") }}
                  </VBtn>

                  <VBtn
                    prepend-icon="tabler-trash"
                    color="error"
                    variant="text"
                    size="small"
                    density="comfortable"
                    @click.stop="onDelete(subject.subject_id)"
                  >
                    {{ t("Delete") }}
                  </VBtn>
                </div>

                <VExpandTransition>
                  <div
                    v-show="
                      openSubjects[`${grade.grade_id}-${subject.subject_id}`]
                    "
                  >
                    <!-- <VDivider /> -->

                    <!-- category rows: click a category to expand its assessments -->
                    <div class="d-flex flex-column gap-3 pa-4">
                      <VCard
                        v-for="rule in subject.rules"
                        :key="rule.grading_rule_id ?? rule.category_id"
                        variant="outlined"
                        rounded="lg"
                        class="rule-card"
                      >
                        <!-- category header -->
                        <div
                          class="d-flex align-center justify-space-between pa-3 cursor-pointer"
                          @click="
                            toggleRule(
                              ruleKey(grade.grade_id, subject.subject_id, rule),
                            )
                          "
                        >
                        
                          <div class="d-flex align-center gap-3">
                            <VAvatar color="info" size="32" rounded="lg">
                              <VIcon icon="tabler-category" size="16" />
                            </VAvatar>
                            <div>
                              <div class="text-body-2 font-weight-bold">
                                {{ rule.category?.name_en }}
                              </div>
                              <div class="text-caption text-medium-emphasis">
                                {{ rule.category?.name_kh }}
                              </div>
                            </div>
                          </div>

                          
                          <div class="d-flex align-center gap-2">
                            
                            <!-- edit -->
                            <VBtn
                              color="warning"
                              icon="tabler-pencil"
                              variant="text"
                              size="small"
                              density="comfortable"
                              @click.stop="onEdit(rule.grading_rule_id, 'rule')"
                            />
                            <!-- delete -->
                            <VBtn
                              icon="tabler-trash"
                              variant="text"
                              size="small"
                              density="comfortable"
                              color="error"
                              @click.stop="onDeleteRule(rule.grading_rule_id)"
                            />

                            <VIcon
                              size="18"
                              :icon="
                                openRules[
                                  ruleKey(
                                    grade.grade_id,
                                    subject.subject_id,
                                    rule,
                                  )
                                ]
                                  ? 'tabler-chevron-up'
                                  : 'tabler-chevron-down'
                              "
                            />
                          </div>
                        </div>

                        

                        <!-- assessments -->
                        <VExpandTransition>
                          <div
                            v-show="
                              openRules[
                                ruleKey(grade.grade_id, subject.subject_id, rule)
                              ]
                            "
                          >
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
                                  <VAvatar
                                    size="26"
                                    color="secondary"
                                    variant="tonal"
                                  >
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
                            <div class=" d-flex justify-end ga-3 px-4 py-3 text-caption text-medium-emphasis">
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
                    </div>

                    <div
                      class="d-flex justify-end ga-3 px-4 py-3 text-caption text-medium-emphasis"
                    >
                      <span class="font-weight-bold font-mono">
                        {{ totalMaxScore(subject) }}pts
                      </span>

                      <span class="font-weight-bold font-mono">
                        {{ totalPercentage(subject) }}%
                      </span>
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
.grading-rules-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  /* leave room so the scrollbar doesn't sit flush against card edges */
  padding-right: 4px;
}

.font-mono {
  font-family: ui-monospace, monospace;
}

.assessment-row {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
</style>
