<script setup>
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import { api } from "@/utils/api";
const show1 = ref(false);
const show2 = ref(false);
const show3 = ref(false);
const isLoading = ref(false);

const formData = ref({
  old_password: "",
  new_password: "",
  confirm_password: "",
});

const resetForm = () => {
  formData.value = {
    old_password: "",
    new_password: "",
    confirm_password: "",
  };
};

const onSubmit = async (refForm) => {
  try {
    isLoading.value = true;
    const res = await api.post("users-password", formData.value);
    if (res.data.status) {
      resetForm();
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <AppCard
    :is-header="false"
    border="border-none"
    is-submit
    @on-submit="onSubmit"
  >
    <VAlert
      :title="$t('Ensure that these requirements are met')"
      type="primary"
      :text="$t('Minimum 8 characters long, uppercase & symbol')"
      variant="tonal"
      icon="tabler-alert-circle"
      class="mb-2"
    />
    <VRow>
      <VCol cols="12" lg="4" md="4" sm="12">
        <AppTextField
          v-model="formData.old_password"
          label="Old Password"
          :append-inner-icon="show1 ? 'tabler-eye-off' : 'tabler-eye'"
          :type="show1 ? 'text' : 'password'"
          @click:append-inner="show1 = !show1"
        />
      </VCol>
      <VCol cols="6" lg="4" md="4" sm="6">
        <AppTextField
          v-model="formData.new_password"
          label="New Password"
          :append-inner-icon="show2 ? 'tabler-eye-off' : 'tabler-eye'"
          :type="show2 ? 'text' : 'password'"
          @click:append-inner="show2 = !show2"
        />
      </VCol>
      <VCol cols="6" lg="4" md="4" sm="6">
        <AppTextField
          v-model="formData.new_password_confirmation"
          label="Confirm Password"
          :append-inner-icon="show3 ? 'tabler-eye-off' : 'tabler-eye'"
          :type="show3 ? 'text' : 'password'"
          @click:append-inner="show3 = !show3"
        />
      </VCol>
    </VRow>
  </AppCard>
</template>
