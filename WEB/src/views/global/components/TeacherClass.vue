<script setup>
import { onMounted, ref } from "vue";
import AddEditTeacherClassDialog from "./AddEditTeacherClassDialog.vue";
import { api } from "@/utils/api.js";

const formData = ref({});
const isDialogVisible = ref(false);
const isLoading = ref(false);

const props = defineProps({
  class_id: {
    type: Number,
  },
});

const teachers = ref([]);

const defaultPhoto =
  "https://st4.depositphotos.com/9998432/24428/v/450/depositphotos_244284796-stock-illustration-person-gray-photo-placeholder-man.jpg";

const onDelete = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("teachers-classes-delete", { id: item.id });

    if (res.data.status) {
      getTeacherClassList();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onCreate = async (data, callback) => {
  const payload = {
    ...data,
    class_id: props.class_id,
  };

  console.log("pay", payload);
  try {
    isLoading.value = true;

    const res = await api.post("teachers-classes-store", payload);

    if (res.data.status) {
      isDialogVisible.value = false;
      getTeacherClassList();
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;

    const res = await api.post("teachers-classes-show", { id: item.id });

    if (res.data.status) {
      formData.value = res.data.data;
      // console.log(formData.value)
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

const onUpdate = async (data, callback) => {
  try {
    isLoading.value = true;

    const res = await api.post("teachers-classes-update", data);

    // if (res.data.status) {
    //   isDialogVisible.value = false;
    // } else {
    //   console.error("Error with the response:", res.data);
    // }
    getTeacherClassList();
    isDialogVisible.value = false;

    callback(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const getTeacherClassList = async () => {
  try {
    const res = await api.post("teachers-classes-list", {
      class_id: props?.class_id,
    });

    teachers.value = res.data.data;
  } catch (error) {}
};

onMounted(() => {
  getTeacherClassList();
});
</script>

<template>
  <AddEditTeacherClassDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    @on-create="onCreate"
    @on-update="onUpdate"
  />
  <VCard class="mt-3">
    <VCardTitle class="d-flex align-center justify-space-between pa-4">
      <VChip class="rounded-l" color="primary">Teacher and Subjects</VChip>
      <VBtn
        color="primary"
        size="small"
        prepend-icon="tabler-plus"
        @click="isDialogVisible = !isDialogVisible"
      >
        Add Teacher
      </VBtn>
    </VCardTitle>

    <VCardText class="pa-4">
      <VRow>
        <VCol
          cols="12"
          sm="3"
          md="3"
          v-for="item in teachers"
          :key="item.name_en"
        >
          <VCard
            :loading="isLoading"
            class="teacher-card pa-4 text-center"
            rounded="lg"
            variant="outlined"
          >
            <div class="card-actions">
              <VBtn
                icon
                size="x-small"
                variant="text"
                color="warning"
                @click="onEdit(item)"
              >
                <VIcon size="14">tabler-edit</VIcon>
              </VBtn>
              <VBtn
                icon
                size="x-small"
                variant="text"
                color="error"
                @click="onDelete(item)"
              >
                <VIcon size="14">tabler-trash</VIcon>
              </VBtn>
            </div>

            <VAvatar
              :image="item.photo_path || defaultPhoto"
              size="72"
              class="mb-2"
            />

            <div class="d-flex ga-2 justify-center">
              <p class="text-body-2 font-weight-medium mb-0">
                {{ item.name_en }}
              </p>
              <p class="text-caption text-medium-emphasis mb-2">
                ({{ item.name_kh }})
              </p>
            </div>

            <div
              class="text-caption mt-1 text-medium-emphasis d-flex align-center justify-start ga-1"
            >
              <VIcon size="14">tabler-phone</VIcon> {{ item.phone }}
            </div>
            <div
              class="text-caption text-medium-emphasis d-flex align-center justify-start ga-1"
            >
              <VIcon size="14">tabler-mail</VIcon> {{ item.email }}
            </div>
            <div
              class="text-caption text-medium-emphasis d-flex align-center justify-start ga-1"
            >
              <VIcon size="14">tabler-book</VIcon> {{ item.subject.name_en }}
            </div>

            <div class="d-flex ga-2 mt-2">
              <VChip
                v-if="item.is_classload"
                size="x-small"
                color="success"
                variant="tonal"
              >
                Classload Teacher
              </VChip>
              <VChip
                v-if="item.is_assistance"
                size="x-small"
                color="info"
                variant="tonal"
              >
                Assistant
              </VChip>
              <VChip v-else size="x-small" color="info" variant="tonal">
                Main Teacher
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

<style scoped>
.teacher-card {
  position: relative;
}

.card-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
}

.add-card {
  border-style: dashed;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.add-card:hover {
  background: rgba(var(--v-theme-on-surface), 0.03);
}
</style>
