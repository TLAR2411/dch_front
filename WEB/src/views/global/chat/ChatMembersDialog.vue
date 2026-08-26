<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { listClassChatMembers } from "@/services/api/classChat";
import hasPermission from "@/utils/hasPermission";
import AddEditTeacherClassDialog from "@/views/global/components/AddEditTeacherClassDialog.vue";
import AddEditStudentClassDialog from "@/views/global/studentclass/AddEditStudentClassDialog.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  chatId: { type: [Number, String], default: null },
  classId: { type: [Number, String], default: null },
  className: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "updated"]);

const { t } = useI18n();

const loading = ref(false);
const saving = ref(false);
const tab = ref("teachers");
const members = ref({
  member_count: 0,
  teachers: [],
  guardians: [],
  students: [],
});

const teacherForm = ref({});
const teacherDialogVisible = ref(false);
const studentDialogVisible = ref(false);
const availableStudents = ref([]);

const defaultPhoto =
  "https://st4.depositphotos.com/9998432/24428/v/450/depositphotos_244284796-stock-illustration-person-gray-photo-placeholder-man.jpg";

const canAddTeacher = computed(() => hasPermission("add-teachers-classes"));
const canAddStudent = computed(() => hasPermission("add-student-enrollment"));
const canAddAnyone = computed(
  () => canAddTeacher.value || canAddStudent.value,
);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

function memberName(m) {
  return m?.name_en || m?.name_kh || t("Unknown");
}

function memberSubtitle(m) {
  if (m?.detail) return m.detail;
  if (m?.name_en && m?.name_kh && m.name_en !== m.name_kh) return m.name_kh;
  return "";
}

async function loadMembers() {
  if (!props.chatId) return;
  loading.value = true;
  try {
    const data = await listClassChatMembers(props.chatId);
    members.value = data || {
      member_count: 0,
      teachers: [],
      guardians: [],
      students: [],
    };
    emit("updated", members.value);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function loadAvailableStudents() {
  if (!props.classId) return;
  try {
    const res = await api.post("students-available-enrollment", {
      class_id: props.classId,
    });
    availableStudents.value = res.data?.data ?? [];
  } catch (e) {
    console.error(e);
    availableStudents.value = [];
  }
}

function openAddTeacher() {
  teacherForm.value = {};
  teacherDialogVisible.value = true;
}

async function openAddStudent() {
  await loadAvailableStudents();
  studentDialogVisible.value = true;
}

async function onCreateTeacher(data, callback) {
  saving.value = true;
  try {
    const res = await api.post("teachers-classes-store", {
      ...data,
      class_id: props.classId,
    });
    if (res.data?.status) {
      teacherDialogVisible.value = false;
      await loadMembers();
    }
    callback?.(Boolean(res.data?.status));
  } catch (e) {
    console.error(e);
    callback?.(false);
  } finally {
    saving.value = false;
  }
}

async function onCreateStudent(data, callback) {
  saving.value = true;
  try {
    const res = await api.post("students-classes-enrollment", {
      student_id: data.student_id || [],
      class_id: props.classId,
    });
    if (res.data?.status) {
      studentDialogVisible.value = false;
      await loadMembers();
      await loadAvailableStudents();
    }
    callback?.(Boolean(res.data?.status));
  } catch (e) {
    console.error(e);
    callback?.(false);
  } finally {
    saving.value = false;
  }
}

watch(
  () => [props.modelValue, props.chatId],
  ([open, chatId]) => {
    if (open && chatId) loadMembers();
  },
);
</script>

<template>
  <VDialog v-model="dialogVisible" max-width="520" scrollable>
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between ga-2 pe-2">
        <div class="min-w-0">
          <div class="text-truncate">{{ $t("Members") }}</div>
          <div class="text-caption text-medium-emphasis text-truncate font-weight-regular">
            {{ className || $t("Class group chat") }}
            ·
            {{ members.member_count }}
            {{ $t("members") }}
          </div>
        </div>
        <div class="d-flex align-center ga-1 flex-shrink-0">
          <VMenu v-if="canAddAnyone">
            <template #activator="{ props: menuProps }">
              <VBtn
                v-bind="menuProps"
                color="primary"
                size="small"
                prepend-icon="tabler-user-plus"
              >
                {{ $t("Add member") }}
              </VBtn>
            </template>
            <VList density="compact" nav>
              <VListItem
                v-if="canAddTeacher"
                :title="$t('Add teacher')"
                prepend-icon="tabler-chalkboard"
                @click="openAddTeacher"
              />
              <VListItem
                v-if="canAddStudent"
                :title="$t('Add student')"
                prepend-icon="tabler-school"
                @click="openAddStudent"
              />
            </VList>
          </VMenu>
          <VBtn icon variant="text" size="small" @click="dialogVisible = false">
            <VIcon icon="tabler-x" />
          </VBtn>
        </div>
      </VCardTitle>

      <VDivider />

      <VTabs v-model="tab" density="compact" class="px-2">
        <VTab value="teachers">
          {{ $t("Teachers") }}
          ({{ members.teachers.length }})
        </VTab>
        <VTab value="guardians">
          {{ $t("Guardians") }}
          ({{ members.guardians.length }})
        </VTab>
        <VTab value="students">
          {{ $t("Students") }}
          ({{ members.students.length }})
        </VTab>
      </VTabs>

      <VCardText class="pa-0" style="min-height: 280px">
        <VProgressLinear v-if="loading" indeterminate />
        <VWindow v-model="tab">
          <VWindowItem value="teachers">
            <VList v-if="members.teachers.length" lines="two">
              <VListItem
                v-for="m in members.teachers"
                :key="`t-${m.id}`"
                :title="memberName(m)"
                :subtitle="memberSubtitle(m)"
              >
                <template #prepend>
                  <VAvatar size="40" :image="m.photo_path || defaultPhoto" />
                </template>
              </VListItem>
            </VList>
            <div
              v-else-if="!loading"
              class="pa-6 text-center text-medium-emphasis text-body-2"
            >
              {{ $t("No members in this group") }}
            </div>
          </VWindowItem>

          <VWindowItem value="guardians">
            <VList v-if="members.guardians.length" lines="two">
              <VListItem
                v-for="m in members.guardians"
                :key="`g-${m.id}`"
                :title="memberName(m)"
                :subtitle="
                  m.detail
                    ? `${$t('Student')}: ${m.detail}`
                    : memberSubtitle(m)
                "
              >
                <template #prepend>
                  <VAvatar size="40" color="primary" variant="tonal">
                    <VIcon icon="tabler-user" />
                  </VAvatar>
                </template>
              </VListItem>
            </VList>
            <div
              v-else-if="!loading"
              class="pa-6 text-center text-medium-emphasis text-body-2"
            >
              {{ $t("No members in this group") }}
            </div>
          </VWindowItem>

          <VWindowItem value="students">
            <VList v-if="members.students.length" lines="two">
              <VListItem
                v-for="m in members.students"
                :key="`s-${m.id}`"
                :title="memberName(m)"
                :subtitle="memberSubtitle(m)"
              >
                <template #prepend>
                  <VAvatar size="40" :image="m.photo_path || defaultPhoto" />
                </template>
              </VListItem>
            </VList>
            <div
              v-else-if="!loading"
              class="pa-6 text-center text-medium-emphasis text-body-2"
            >
              {{ $t("No members in this group") }}
            </div>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCard>
  </VDialog>

  <AddEditTeacherClassDialog
    v-model:is-dialog-visible="teacherDialogVisible"
    :item-data="teacherForm"
    :loading="saving"
    @on-create="onCreateTeacher"
  />

  <AddEditStudentClassDialog
    v-model:is-dialog-visible-student-class="studentDialogVisible"
    :item-data="availableStudents"
    :class-data="{ name_en: className, name_kh: className }"
    :loading="saving"
    @on-create-student-class="onCreateStudent"
  />
</template>
