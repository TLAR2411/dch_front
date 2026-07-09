<script setup>
import { useLayoutConfigStore } from "@/@layouts/stores/config";
import AppAvatar from "@/components/AppAvatar.vue";
import { auth } from "@/utils/auth";
import { useAuthStore } from "@/stores/authStore";
import { usePartStore } from "@/stores/partStore";
import { useRouter } from "vue-router";

const configStore = useLayoutConfigStore();
const hideTitleAndBadge = configStore.isVerticalNavMini();

const router = useRouter();

const authStore = useAuthStore();

const logout = () => {
  useAuthStore().logout();
};
const isSnackbarVisibility = ref(false);
const snackbarVisibilityText = ref(null);
const isLoading = ref(false);
const { t } = useI18n();

const profile = () => {
  router.push({ name: "user-profile-tab", params: { tab: "account" } });
};
const convertName = (inputString) => {
  const parts = inputString.split("-");

  // 2. Capitalize the first letter of each part and join them with a space
  const result = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return result;
};

const changeProfile = async (item) => {
  try {
    isLoading.value = true;
    authStore.token({
      user_id: item.id,
    });
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const checkSystemPart = (part) => {
  usePartStore().setSystemPart(part);
  snackbarVisibilityText.value = t(
    `Success Switch Part to ${convertName(part)}`,
  );
  isSnackbarVisibility.value = true;
  router.push({ name: `${part}` });
};
const route = useRoute();

const firstSegment = ref(route.path.split("/")[1]);
const setting = usePartStore();

const systemParts = ref([
  {
    title: "Khmer System",
    icon: "tabler-folder-open",
    part: "khmer",
    active: setting.system_part == "khmer",
    permission: "allow-part-khmer",
  },
  {
    title: "English System",
    icon: "tabler-folder-open",
    part: "english",
    active: setting.system_part == "english",
    permission: "allow-part-english",
  },
  {
    title: "Chinese System",
    icon: "tabler-folder-open",
    part: "chinese",
    active: setting.system_part == "chinese",
    permission: "allow-part-chinese",
  },
  {
    title: "Admin System",
    icon: "tabler-settings",
    part: "admin",
    active: setting.system_part == "admin",
    permission: "allow-part-admin",
  },
  
]);

watch(
  () => setting.system_part,
  (newVal) => {
    systemParts.value = [
    {
    title: "Khmer System",
    icon: "tabler-folder-open",
    part: "khmer",
    active: setting.system_part == "khmer",
    permission: "allow-part-khmer",
  },
  {
    title: "English System",
    icon: "tabler-folder-open",
    part: "english",
    active: setting.system_part == "english",
    permission: "allow-part-english",
  },
  {
    title: "Chinese System",
    icon: "tabler-folder-open",
    part: "chinese",
    active: setting.system_part == "chinese",
    permission: "allow-part-chinese",
  },
  {
    title: "Admin System",
    icon: "tabler-settings",
    part: "admin",
    active: setting.system_part == "admin",
    permission: "allow-part-admin",
  },
  
    ];
  },
);

const allUsers = computed(() => {
  const user = auth()?.user;
  console.log(user);

  if (!user) return [];

  // Place the main_user (if it exists) into an array
  const main = user.main_user ? [user.main_user] : [];

  // Get the sub_users (default to an empty array)
  const subs = user.sub_users || [];

  const siblings = user.siblings || [];

  // Return the combined list
  return [...main, ...subs, ...siblings];
});
</script>
<template>
  <!-- <VSnackbar v-model="isSnackbarVisibility" >
    <VIcon color="success" start>tabler-check</VIcon>
    {{ snackbarVisibilityText }}

    <template #actions>
      <VBtn color="error" @click="isSnackbarVisibility = false"> Close </VBtn>
    </template>
  </VSnackbar> -->

  <div class="w-100 d-flex flex-row" role="button" tabindex="0">
    <VBadge
      dot
      location="bottom right"
      offset-x="3"
      offset-y="3"
      bordered
      color="success"
    >
      <VAvatar
        class="cursor-pointer"
        :color="auth()?.user?.image_path ? undefined : 'primary'"
        :class="
          auth()?.user?.image_path ? '' : 'v-avatar-light-bg primary--text'
        "
        :variant="auth()?.user?.image_path ? undefined : 'tonal'"
        rounded
      >
        <AppAvatar
          :image="auth()?.user?.image_path"
          :title="auth().user?.name_kh ?? 'Admin'"
          rounded
          color="primary"
          :is-show-full-image="false"
          :q="100"
        />
      </VAvatar>
    </VBadge>
    <div class="user-info-wrapper align-center">
      <Transition name="transition-slide-x">
        <div
          v-if="!hideTitleAndBadge"
          class="d-flex flex-column ml-2 text-no-wrap"
          key="user-info"
        >
          <span
            class="font-weight-medium text-truncate"
            style="line-height: 1.2"
          >
            {{ auth()?.user?.name_kh ?? null }}
          </span>
          <span
            class="text-xs text-truncate"
            style="font-size: 11px !important; opacity: 0.8"
          >
            {{ auth()?.user?.name_en ?? null }}
          </span>
        </div>
      </Transition>
    </div>

    <VMenu
      activator="parent"
      width="230"
      location="bottom end"
      offset="14px"
      role="button"
      tabindex="0"
    >
      <VList theme="dark">
        <VListItem @click="profile()">
          <template #prepend>
            <VListItemAction start>
              <VBadge
                dot
                location="bottom right"
                offset-x="3"
                offset-y="3"
                bordered
                color="success"
                class="badge-border-white"
              >
                <VAvatar
                  class="cursor-pointer"
                  :color="auth()?.user?.image_path ? undefined : 'white'"
                  :class="
                    auth()?.user?.image_path
                      ? ''
                      : 'v-avatar-light-bg white--text'
                  "
                  :variant="auth()?.user?.image_path ? undefined : 'tonal'"
                  rounded
                >
                  <AppAvatar
                    :image="auth()?.user?.image_path"
                    :title="auth().user?.name_kh ?? 'Admin'"
                    rounded
                    color="white"
                    :is-show-full-image="false"
                    :q="100"
                  />
                </VAvatar>
              </VBadge>
            </VListItemAction>
          </template>

          <VListItemTitle class="font-weight-semibold" style="color: white">
            {{ auth()?.user?.name_kh ?? null }}
          </VListItemTitle>
          <VListItemSubtitle style="color: white">{{
            auth()?.user?.name_en ?? null
          }}</VListItemSubtitle>

          <template #append>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="icon icon-tabler icons-tabler-filled icon-tabler-circle-check text-success"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path
                d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z"
              /></svg
          ></template>
        </VListItem>

        <template v-for="item in allUsers">
          <VDivider />
          <VListItem @click="changeProfile(item)">
            <template #prepend>
              <VListItemAction start>
                <VAvatar
                  rounded
                  :color="auth()?.user?.image_path ? undefined : 'white'"
                  :class="
                    item?.image_path ? '' : 'v-avatar-light-bg white--text'
                  "
                  :variant="item?.image_path ? undefined : 'tonal'"
                >
                  <AppAvatar
                    :image="item?.image_path"
                    :title="item?.name_kh"
                    rounded
                    color="white"
                  />
                </VAvatar>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold" style="color: white">
              {{ item?.name_kh }}&nbsp;
            </VListItemTitle>
            <VListItemSubtitle style="color: white">
              {{ item?.position?.name_kh }}
            </VListItemSubtitle>
          </VListItem>
        </template>
        <VDivider class="my-2" />
        <template v-for="(item, index) in systemParts">
          <template v-if="hasPermission(item.permission)">
            <VListItem
              @click="checkSystemPart(item.part)"
              :active="item.active"
              :variant="item.active ? 'flat' : 'text'"
              :color="item.active ? 'primary' : ''"
              class="mb-1"
            >
              <template #prepend>
                <VIcon class="me-2" :icon="item.icon" size="22" color="white" />
              </template>

              <VListItemTitle style="color: white">
                {{ $t(item.title) }}
              </VListItemTitle>
            </VListItem>
            <VDivider class="my-2" />
          </template>
        </template>

        <!-- <VDivider class="my-2" /> -->

        <VCol class="pt-0 mt-0 pb-0 mb-0">
          <VBtn size="small" class="w-100" color="error" @click="logout()">
            {{ $t("Logout")
            }}<VIcon class="me-2" icon="tabler-logout" size="18" end
          /></VBtn>
        </VCol>
      </VList>
    </VMenu>
  </div>
</template>
<style scoped>
/* Ensure the text never wraps during the animation */
.text-no-wrap {
  white-space: nowrap;
}

/* Entering Animation */
.transition-slide-x-enter-active {
  transition: all 0.2s ease-out;
}

/* Leaving Animation */
.transition-slide-x-leave-active {
  transition: all 0.1s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.transition-slide-x-enter-from,
.transition-slide-x-leave-to {
  opacity: 0;
  transform: translateX(-10px);
  max-width: 0; /* Forces the container to shrink smoothly */
  margin-left: 0 !important;
}

.transition-slide-x-enter-to,
.transition-slide-x-leave-from {
  opacity: 1;
  transform: translateX(0);
  max-width: 200px; /* Adjust based on your max expected name length */
}

/* Optional: Smooth out the width change of the wrapper */
.user-info-wrapper {
  display: flex;
  overflow: hidden;
  transition: width 0.3s ease;
}
</style>
