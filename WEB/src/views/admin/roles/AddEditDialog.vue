<script setup>
import { ref, computed, watch, toRefs,nextTick } from "vue";
import { debounce } from "lodash";
import AppTextField from "@core/components/app-form-elements/AppTextField.vue";
import { requiredValidator } from "@/@core/utils/validators";
import { useDisplay } from "vuetify";
import App from "@/App.vue";

const { xs } = useDisplay();

// Props definition
const props = defineProps({
  roleData: {
    type: Object,
    default: () => ({}),
  },
  rolePermissions: {
    type: Array,
    default: () => [],
  },
  permissions: {
    type: Array,
    default: () => [],
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  loading: {
    type: Boolean,
    required: false,
    skipCheck: true,
    default: undefined,
  },
});
const { roleData, permissions, rolePermissions, isDialogVisible } =
  toRefs(props);

// Emits definition
const emit = defineEmits(["onCreate", "onUpdate", "update:isDialogVisible"]);

const roleDataCopy = ref({ ...roleData.value });
const permissionsSelected = ref({});
const openPanels = ref([]);

// Watch for changes in the roleData prop and update the local copy
watch(
  roleData,
  (newData) => {
    roleDataCopy.value = { ...newData };
  },
  { deep: true },
);

// Watch for changes in rolePermissions and populate the permissionsSelected object
watch(
  rolePermissions,
  (newValue) => {
    const newPermissionsObject = {};
    newValue.forEach((permission) => {
      newPermissionsObject[permission.id] = permission.id;
    });

    permissionsSelected.value = newPermissionsObject;
  },
  { immediate: true, deep: true },
);

// Resets the form data
const resetData = () => {
  roleDataCopy.value = {
    name: "",
    display_name: "",
    symbol: "",
  };
  // FIX: Reset to an empty object, not an array, to match the data structure.
  permissionsSelected.value = {};
};

// Submits the form data
const onFormSubmit = debounce(async (refForm) => {
  const { valid } = await refForm;
  if (valid) {
    const roleId = roleDataCopy.value.id || null;
    const payload = {
      roleData: roleDataCopy.value,
      // The permissionsSelected object is already in the correct format
      permissions: permissionsSelected.value,
    };
    const event = roleId ? "onUpdate" : "onCreate";

    emit(event, payload, (res) => {
      if (res === 200) {
        resetData();
      }
    });
  }
}, 500);

// Closes the dialog and resets data
const onCloseDialog = () => {
  resetData();
  emit("update:isDialogVisible", false);
};

// Groups permissions by their 'group' property
const groupedPermission = computed(() => {
  if (!permissions.value.length) return {};
  return permissions.value.reduce((acc, item) => {
    const group = item.group || "Other";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {});
});
const openAllPanels = async () => {
  await nextTick(); // ensure panels are rendered
  openPanels.value = Object.keys(groupedPermission.value); // ✅ use ids
};

// when dialog opens
watch(
  [() => isDialogVisible.value, () => groupedPermission.value],
  async ([visible, groups]) => {
    if (visible && groups && Object.keys(groups).length > 0) {
      await openAllPanels();
    } else if (!visible) {
      openPanels.value = []; // optional: collapse on close
    }
  },
  { immediate: true, flush: "post" },
);
/**
 * FIX: Manually handle checkbox state changes.
 * When a checkbox is checked, add the permission ID to the object.
 * When it's unchecked, remove the permission ID.
 * @param {boolean} isChecked - The new checked state of the checkbox.
 * @param {string|number} permissionId - The ID of the permission.
 */
const handleCheckboxChange = (isChecked, permissionId) => {
  if (isChecked) {
    permissionsSelected.value[permissionId] = permissionId;
  } else {
    delete permissionsSelected.value[permissionId];
  }
};

// Selects all permissions within a specific group
const selectAll = (group) => {
  if (groupedPermission.value[group]) {
    const updates = {};
    groupedPermission.value[group].forEach((permission) => {
      updates[permission.id] = permission.id;
    });
    permissionsSelected.value = { ...permissionsSelected.value, ...updates };
  }
};

// Unselects all permissions within a specific group
const unselectAll = (group) => {
  if (groupedPermission.value[group]) {
    // Create a new object to ensure reactivity is triggered reliably.
    const newPermissions = { ...permissionsSelected.value };
    groupedPermission.value[group].forEach((permission) => {
      delete newPermissions[permission.id];
    });
    permissionsSelected.value = newPermissions;
  } else {
    console.error("Group not found:", group);
  }
};

// Selects all permissions across all groups
const selectAllGlobal = () => {
  const allPermissions = {};
  for (const group in groupedPermission.value) {
    groupedPermission.value[group].forEach((permission) => {
      allPermissions[permission.id] = permission.id;
    });
  }
  permissionsSelected.value = allPermissions;
};

// Unselects all permissions
const unselectAllGlobal = () => {
  permissionsSelected.value = {};
};

// const convertName = (inputString) => {
//   const parts = inputString.split("-");

//   // 2. Capitalize the first letter of each part and join them with a space
//   const result = parts
//     .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
//     .join(" ");

//   return result;
// };

const convertName = (inputString) => {
  if (!inputString) return "";
  const parts = String(inputString).split("-");
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
</script>

<template>
  <AppAddEditDialog
    v-if="!xs"
    :title="roleDataCopy.id == null ? 'Create Role' : 'Update Role'"
    :is-dialog-visible="isDialogVisible"
    :is-update="roleDataCopy.id != null ? true : false"
    :loading="loading"
    max-width="1000px"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6" md="4">
        <AppTextField
          v-model="roleDataCopy.name"
          label="Name"
          placeholder="user"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="4">
        <AppTextField
          v-model="roleDataCopy.display_name"
          label="Display Name"
          placeholder="អ្នកប្រើប្រាស់"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="4">
        <AppTextField
          v-model="roleDataCopy.symbol"
          label="Symbol"
          placeholder="..."
          :rules="[requiredValidator]"
        />
      </VCol>
      <VDivider />

      <VCol>
        <VExpansionPanels multiple v-model="openPanels">
          <VCol>
            <VRow>
              <VBtn size="x-small" color="success" @click="selectAllGlobal()">
                Selected All
              </VBtn>
              <VBtn size="x-small" color="error" @click="unselectAllGlobal()">
                Unselected All
              </VBtn>
            </VRow>
          </VCol>
          <VExpansionPanel
            v-for="(groupPermissions, group) in groupedPermission"
            :key="group"
            :value="group"
          >
            <VExpansionPanelTitle class="text-primary">
              {{ convertName(group) }}</VExpansionPanelTitle
            >
            <VExpansionPanelText>
              <VDivider />
              <VCol>
                <VRow
                  style="display: flex; align-items: center; flex-wrap: wrap"
                >
                  <VBtn
                    size="x-small"
                    color="success"
                    @click="selectAll(group)"
                    class="mr-2 mb-2"
                  >
                    Select All
                  </VBtn>
                  <VBtn
                    size="x-small"
                    color="error"
                    @click="unselectAll(group)"
                    class="mr-2 mb-2"
                  >
                    Unselect All
                  </VBtn>
                  <template v-for="item in groupPermissions" :key="item.id">
                    <!-- 
                      FIX: Use :model-value for one-way data binding and @update:model-value 
                      to trigger a custom handler. This gives us full control over what happens 
                      when the checkbox is checked or unchecked.
                    -->
                    <VCheckbox
                      :model-value="!!permissionsSelected[item.id]"
                      :label="convertName(item.display_name || item.name)"
                      @update:model-value="
                        (isChecked) => handleCheckboxChange(isChecked, item.id)
                      "
                      class="mr-2"
                    />
                  </template>
                </VRow>
              </VCol>
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </VCol>
    </VRow>
  </AppAddEditDialog>

  <AppAddEditDrawer
    v-else
    :title="roleDataCopy.id == null ? 'Create Role' : 'Update Role'"
    :is-dialog-visible="isDialogVisible"
    :is-update="roleDataCopy.id != null ? true : false"
    :loading="loading"
    @on-close-dialog="onCloseDialog"
    @on-submit="onFormSubmit"
  >
    <VRow>
      <VCol cols="12" sm="6" md="4">
        <AppTextField
          v-model="roleDataCopy.name"
          label="Name"
          placeholder="user"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="4">
        <AppTextField
          v-model="roleDataCopy.display_name"
          label="Display Name"
          placeholder="អ្នកប្រើប្រាស់"
          :rules="[requiredValidator]"
        />
      </VCol>
      <VCol cols="12" sm="6" md="4">
        <AppTextField
          v-model="roleDataCopy.symbol"
          label="Symbol"
          placeholder="..."
          :rules="[requiredValidator]"
        />
      </VCol>
      <VDivider />

      <VCol>
        <VExpansionPanels multiple v-model="openPanels">
          <VCol>
            <VRow>
              <VBtn size="x-small" color="success" @click="selectAllGlobal()">
                Selected All
              </VBtn>
              <VBtn size="x-small" color="error" @click="unselectAllGlobal()">
                Unselected All
              </VBtn>
            </VRow>
          </VCol>
          <VExpansionPanel
            v-for="(groupPermissions, group) in groupedPermission"
            :key="group"
            :value="group"
          >
            <VExpansionPanelTitle class="text-primary">
              {{ convertName(group) }}</VExpansionPanelTitle
            >
            <VExpansionPanelText>
              <VDivider />
              <VCol>
                <VRow
                  style="display: flex; align-items: center; flex-wrap: wrap"
                >
                  <VBtn
                    size="x-small"
                    color="success"
                    @click="selectAll(group)"
                    class="mr-2 mb-2"
                  >
                    Select All
                  </VBtn>
                  <VBtn
                    size="x-small"
                    color="error"
                    @click="unselectAll(group)"
                    class="mr-2 mb-2"
                  >
                    Unselect All
                  </VBtn>
                  <template v-for="item in groupPermissions" :key="item.id">
                    <!-- 
                      FIX: Use :model-value for one-way data binding and @update:model-value 
                      to trigger a custom handler. This gives us full control over what happens 
                      when the checkbox is checked or unchecked.
                    -->
                    <VCheckbox
                      :model-value="!!permissionsSelected[item.id]"
                      :label="convertName(item.display_name)"
                      @update:model-value="
                        (isChecked) => handleCheckboxChange(isChecked, item.id)
                      "
                      class="mr-2"
                    />
                  </template>
                </VRow>
              </VCol>
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </VCol>
    </VRow>
  </AppAddEditDrawer>
</template>
