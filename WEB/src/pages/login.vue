<script setup>
import authV1BottomShape from "@images/svg/auth-v1-bottom-shape.svg?raw";
import authV1TopShape from "@images/svg/auth-v1-top-shape.svg?raw";
import { VNodeRenderer } from "@layouts/components/VNodeRenderer";
import { themeConfig } from "@themeConfig";
import { useAuthStore } from "@/stores/authStore";
import { debounce } from "lodash";
import LoginLogo from "@images/logo/login-logo.svg?url";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import { useDisplay } from "vuetify";
import { supabase } from "@/utils/supabase";

definePage({
  meta: {
    title: "Login",
    layout: "blank",
    unauthenticatedOnly: true,
  },
});

const form = ref({
  username: import.meta.env.VITE_LOGIN_USERNAME || null,
  password: import.meta.env.VITE_LOGIN_PASSWORD || null,
  remember: false,
});

const isLoading = ref(false);
const isGoogleLoading = ref(false);
const isSessionLoading = ref(false);

const isPasswordVisible = ref(false);

const authStore = useAuthStore();

const onSubmit = debounce(async () => {
  isLoading.value = true;
  await authStore.login(form.value);
  isLoading.value = false;
}, 500);

onMounted(async () => {
  isSessionLoading.value = true;
  try {
    await authStore.getSession();
  } finally {
    isSessionLoading.value = false;
  }
});

const onGoogleSignIn = async () => {
  isGoogleLoading.value = true;
  const redirectTo = `${window.location.origin}/login`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  isGoogleLoading.value = false;

  if (error) {
    console.error("Login failed:", error.message);
    return;
  }
  console.log("Login redirect initiated", data);
};

const { smAndDown } = useDisplay();
</script>

<template>
  <div class="auth-wrapper d-flex align-center justify-center">
    <div class="position-relative my-sm-16">
      <!-- 👉 Top shape -->
      <VNodeRenderer
        :nodes="h('div', { innerHTML: authV1TopShape })"
        class="text-primary auth-v1-top-shape d-none d-sm-block"
      />

      <!-- 👉 Bottom shape -->
      <VNodeRenderer
        :nodes="h('div', { innerHTML: authV1BottomShape })"
        class="text-primary auth-v1-bottom-shape d-none d-sm-block"
      />

      <!-- 👉 Auth Card -->
      <VCard class="auth-card" width="350" max-width="90vw">
        <VCardItem class="justify-center">
          <VCardTitle>
            <div class="app-logo d-flew flex-column w-100 mt-2">
              <img
                class="justify-center align-center"
                style="width: 85px !important"
                :src="LoginLogo"
              />
              <!-- <VNodeRenderer :nodes="themeConfig.app.logo" /> -->
              <h1
                class="app-logo-title mt-4 w-100 mb-2 text-primary moul"
              >
                <span
                  style="
                    display: block;
                    width: 100%;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    white-space: normal;
                    text-align: center;
                    font-size: 1.1rem;
                  "
                >
                  {{ themeConfig.app.mainTitle }}
                </span>
              </h1>
            </div>
          </VCardTitle>
        </VCardItem>

        <!-- <VCardText>
          <h4 class="text-h4 mb-1">
            Welcome to
            <span class="text-capitalize">{{ themeConfig.app.title }}</span
            >! 👋🏻
          </h4>
          <p class="mb-0">
            Please sign-in to your account and start the adventure
          </p>
        </VCardText> -->

        <VCardText v-if="isSessionLoading">
          <div class="d-flex flex-column align-center justify-center py-12">
            <VProgressCircular indeterminate color="primary" size="44" />
            <div class="text-body-1 mt-4">
              {{ $t("Signing you in...") }}
            </div>
            <div class="text-body-2 text-medium-emphasis mt-2 text-center">
              {{ $t("Please wait while we prepare your dashboard") }}
            </div>
          </div>
        </VCardText>

        <VCardText v-else>
          <VForm @submit.prevent="onSubmit">
            <VRow>
              <!-- email -->
              <!-- <VCol cols="12" class="mb-0 pb-0">
                <AppTextField
                  v-model="form.username"
                  autofocus
                  label="Email or Username"
                  type="email"
                  placeholder="Email Or Username"
                  required
                />
              </VCol> -->

              <!-- password -->
              <VCol cols="12">
                <!-- <AppTextField
                  v-model="form.password"
                  label="Password"
                  placeholder="Password"
                  required
                  :type="isPasswordVisible ? 'text' : 'password'"
                  autocomplete="password"
                  :append-inner-icon="
                    isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'
                  "
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                /> -->

                <!-- remember me checkbox -->
                <!-- <div
                  class="d-flex align-center justify-space-between flex-wrap my-6"
                >
                  <VCheckbox v-model="form.remember" label="Remember me" />
                </div> -->

                <!-- login button -->
                <!-- <VBtn
                  block
                  type="submit"
                  :loading="isLoading"
                  :disabled="isLoading || isGoogleLoading"
                  class="my-6 mb-2"
                >
                  {{ $t("Login") }}
                </VBtn> -->

                <VBtn
                  block
                  type="button"
                  variant="outlined"
                  color="on-surface"
                  :loading="isGoogleLoading"
                  :disabled="isLoading || isGoogleLoading || isSessionLoading"
                  class="google-sign-in-btn text-none font-weight-medium"
                  @click="onGoogleSignIn"
                >
                  <template #prepend>
                    <svg
                      class="google-sign-in-btn__icon flex-shrink-0"
                      width="18"
                      height="18"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C43.98 37.08 46.98 31.38 46.98 24.55z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </template>
                  {{ $t("Sign in with Google") }}
                </VBtn>

                <div class="d-flex align-center gap-3 my-4">
                  <VDivider class="flex-grow-1 border-opacity-25" />
                  <span
                    class="text-body-2 text-medium-emphasis text-no-wrap px-1"
                  >
                    Contact Admin to get access
                  </span>
                  <VDivider class="flex-grow-1 border-opacity-25" />
                </div>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </div>
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";

.auth-card {
  width: 350px !important; // Change 600px to your desired width
  max-width: 90vw !important; // Ensures mobile responsiveness
}

/* Light “Sign in with Google” treatment (aligns with common branding patterns) */
.google-sign-in-btn {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity)) !important;
  background: rgb(var(--v-theme-surface));
  min-block-size: 44px;
  letter-spacing: 0.01em;
}

.google-sign-in-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.google-sign-in-btn__icon {
  margin-inline-end: 2px;
}
</style>
