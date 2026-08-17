<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { getPermissions } from "@/services/dataService";
import AddEditDialog from "@/views/admin/permissions/AddEditDialog.vue";

const { t } = useI18n();

const formData = ref({});
const isDialogVisible = ref(false);
const isLoading = ref(true);
const permissions = ref([]);
const groups = ref([]);
const openPanel = ref(null);
const search = ref("");

const convertName = (inputString) => {
  if (!inputString) return "";
  return String(inputString)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const filteredPermissions = computed(() => {
  const q = String(search.value || "")
    .trim()
    .toLowerCase();
  if (!q) return permissions.value;

  return permissions.value.filter((item) => {
    const haystack = [
      item.name,
      item.display_name,
      item.group,
      item.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
});

const groupedPermissions = computed(() => {
  return filteredPermissions.value.reduce((acc, item) => {
    const group = item.group || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});
});

const sortedGroups = computed(() =>
  Object.keys(groupedPermissions.value).sort((a, b) => a.localeCompare(b))
);

const loadGroups = async () => {
  try {
    const res = await api.post("permissions-groups");
    if (res.data.status) {
      groups.value = res.data.data || [];
    }
  } catch (error) {
    console.error("Failed to fetch permission groups:", error);
  }
};

const loadPermissions = async () => {
  try {
    isLoading.value = true;
    permissions.value = await getPermissions();
    await loadGroups();
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
  } finally {
    isLoading.value = false;
  }
};

const onCreateOpen = (group = "") => {
  formData.value = {
    group: group || "",
  };
  isDialogVisible.value = true;
};

const onAddToGroup = (group, event) => {
  event.stopPropagation();
  onCreateOpen(group);
};

const onEdit = async (item) => {
  try {
    isLoading.value = true;
    const res = await api.post("permissions-show", { id: item.id });
    if (res.data.status) {
      formData.value = res.data.data.data;
      isDialogVisible.value = true;
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch permission:", error);
  } finally {
    isLoading.value = false;
  }
};

const onDelete = async (item) => {
  if (!window.confirm(`${t("Delete")} "${item.name}"?`)) return;

  try {
    isLoading.value = true;
    const res = await api.post("permissions-delete", { id: item.id });
    if (res.data.status) {
      await loadPermissions();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to delete permission:", error);
  } finally {
    isLoading.value = false;
  }
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;
    const res = await api.post("permissions-store", data);
    if (res.data.status) {
      await loadPermissions();
      isDialogVisible.value = false;
      if (data.group) openPanel.value = data.group;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to create permission:", error);
    callback(false);
  } finally {
    isLoading.value = false;
  }
};

const onUpdate = async (data, callback) => {
  try {
    isLoading.value = true;
    const res = await api.post("permissions-update", data);
    if (res.data.status) {
      await loadPermissions();
      isDialogVisible.value = false;
      if (data.group) openPanel.value = data.group;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
  } catch (error) {
    console.error("Failed to update permission:", error);
    callback(false);
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadPermissions);
</script>

<template>
  <AddEditDialog
    v-model:isDialogVisible="isDialogVisible"
    v-model:loading="isLoading"
    :item-data="formData"
    :groups="groups"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <VCard>
    <VCardItem>
      <template #prepend>
        <VAvatar color="primary" variant="tonal" rounded>
          <VIcon icon="tabler-key" />
        </VAvatar>
      </template>

      <VCardTitle>{{ t("Permissions") }}</VCardTitle>
      <VCardSubtitle>
        {{ filteredPermissions.length }}
        {{ t("permissions") }}
        ·
        {{ sortedGroups.length }}
        {{ t("groups") }}
      </VCardSubtitle>

      <template #append>
        <div class="d-flex align-center flex-wrap gap-2">
          <VTextField
            v-model="search"
            :label="t('Search')"
            prepend-inner-icon="tabler-search"
            clearable
            hide-details
            density="compact"
            style="min-inline-size: 220px"
            clear-icon="tabler-x"
          />
          <VBtn color="primary" prepend-icon="tabler-plus" @click="onCreateOpen()">
            {{ t("Create") }}
          </VBtn>
        </div>
      </template>
    </VCardItem>

    <VDivider />

    <VCardText>
      <div v-if="isLoading" class="d-flex justify-center py-10">
        <VProgressCircular indeterminate color="primary" />
      </div>

      <div
        v-else-if="sortedGroups.length === 0"
        class="text-medium-emphasis text-center py-10"
      >
        {{ t("No permissions found") }}
      </div>

      <VExpansionPanels v-else v-model="openPanel">
        <VExpansionPanel
          v-for="group in sortedGroups"
          :key="group"
          :value="group"
        >
          <VExpansionPanelTitle class="text-primary">
            <div class="d-flex align-center justify-space-between w-100 pe-4">
              <div class="d-flex align-center gap-2">
                <span>{{ convertName(group) }}</span>
                <VChip size="small" color="primary" variant="tonal">
                  {{ groupedPermissions[group].length }}
                </VChip>
              </div>
              <VBtn
                size="x-small"
                color="success"
                variant="tonal"
                prepend-icon="tabler-plus"
                @click="onAddToGroup(group, $event)"
              >
                {{ t("Add") }}
              </VBtn>
            </div>
          </VExpansionPanelTitle>

          <VExpansionPanelText>
            <VTable density="compact" class="permission-group-table">
              <thead>
                <tr>
                  <th>{{ t("Name") }}</th>
                  <th>{{ t("Display Name") }}</th>
                  <th class="text-center">{{ t("Gates Endpoint") }}</th>
                  <th class="text-center">{{ t("Action") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in groupedPermissions[group]"
                  :key="item.id"
                >
                  <td>
                    <code>{{ item.name }}</code>
                    <div
                      v-if="item.name === 'view-page' || item.name === 'view-data'"
                      class="text-caption text-medium-emphasis"
                    >
                      {{ item.group }}:{{ item.name }}
                    </div>
                  </td>
                  <td>{{ convertName(item.display_name || item.name) }}</td>
                  <td class="text-center">
                    <VChip
                      size="x-small"
                      :color="item.gates_endpoint ? 'success' : 'secondary'"
                      variant="tonal"
                    >
                      {{ item.gates_endpoint ? "API" : "UI" }}
                    </VChip>
                  </td>
                  <td class="text-center">
                    <IconBtn @click="onEdit(item)">
                      <VIcon icon="tabler-edit" />
                    </IconBtn>
                    <IconBtn @click="onDelete(item)">
                      <VIcon icon="tabler-trash" />
                    </IconBtn>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCardText>
  </VCard>
</template>
