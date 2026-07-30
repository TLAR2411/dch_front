<script setup>
import { auth } from "@/utils/auth.js";
import { useAuthStore } from "@/stores/authStore.js";
// import { IconRosetteDiscountCheckFilled } from "@tabler/icons-vue";
import { useRoute, useRouter } from "vue-router";
import hasPermission from "@/utils/hasPermission.js";
import { useI18n } from "vue-i18n";
import { usePartStore } from "@/stores/partStore.js";
import AppAvatar from "@/components/AppAvatar.vue";

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
  if (part == "loan") {
    router.push({ name: "index" });
  } else {
    router.push({ name: `${part}-app` });
  }
};
const route = useRoute();

const firstSegment = ref(route.path.split("/")[1]);
const setting = usePartStore();

const systemParts = ref([
  {
    title: "Loan System",
    icon: "tabler-cash",
    part: "loan",
    active: setting.system_part == "loan",
    permission: "loan-allow-part",
  },
  {
    title: "HR System",
    icon: "tabler-users",
    part: "human-resource",
    active: setting.system_part == "human-resource",
    permission: "hr-allow-part",
  },
  {
    title: "Admin System",
    icon: "tabler-settings",
    part: "admin",
    active: setting.system_part == "admin",
    permission: "admin-allow-part",
  },
]);

watch(
  () => setting.system_part,
  (newVal) => {
    systemParts.value = [
      {
        title: "Loan System",
        icon: "tabler-cash",
        part: "loan",
        active: newVal == "loan",
        permission: "loan-allow-part",
      },
      {
        title: "HR System",
        icon: "tabler-users",
        part: "human-resource",
        active: newVal == "human-resource",
        permission: "hr-allow-part",
      },
      {
        title: "Admin System",
        icon: "tabler-settings",
        part: "admin",
        active: newVal == "admin",
        permission: "admin-allow-part",
      },
    ];
  },
);

const allUsers = computed(() => {
  const user = auth()?.user;
  if (!user) return [];

  // Place the main_user (if it exists) into an array
  const main = user.main_user ? [user.main_user] : [];

  // Get the sub_users (default to an empty array)
  const subs = user.sub_users || [];

  // Return the combined list
  return [...main, ...subs];
});
</script>

<template>
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
      :class="auth()?.user?.image_path ? '' : 'v-avatar-light-bg primary--text'"
      :variant="auth()?.user?.image_path ? undefined : 'tonal'"
    >
      <AppAvatar
        :image="auth()?.user?.image_path"
        :title="auth().user?.name_kh"
      />
      <!-- <VImg
        v-if="auth().user.image_path"
        :src="getImageUrl(auth().user.image_path)"
      /> -->
      <!-- SECTION Menu -->
      <VMenu activator="parent" width="230" location="bottom end" offset="14px">
        <VList>
          <!-- 👉 User Avatar & Name -->
          <VListItem @click="profile()">
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                >
                  <VAvatar
                    :color="auth()?.user?.image_path ? undefined : 'primary'"
                    :class="
                      auth()?.user?.image_path
                        ? ''
                        : 'v-avatar-light-bg primary--text'
                    "
                    :variant="auth()?.user?.image_path ? undefined : 'tonal'"
                  >
                    <AppAvatar
                      :image="auth()?.user?.image_path"
                      :title="auth()?.user?.name_kh"
                    />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">
              {{ auth()?.user?.name_kh }}&nbsp;
              <VIcon color="success">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="icon icon-tabler icons-tabler-filled icon-tabler-circle-check"
                >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                  <path
                    d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-1.293 5.953a1 1 0 0 0 -1.32 -.083l-.094 .083l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.403 1.403l.083 .094l2 2l.094 .083a1 1 0 0 0 1.226 0l.094 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z"
                  />
                </svg>
              </VIcon>
            </VListItemTitle>
            <VListItemSubtitle>
              {{ auth()?.user?.position?.name_kh }}
            </VListItemSubtitle>
          </VListItem>
          <VDivider class="my-2" />

          <template v-for="item in allUsers">
            <VListItem @click="changeProfile(item)">
              <template #prepend>
                <VListItemAction start>
                  <VAvatar
                    :color="item?.image_path ? undefined : 'primary'"
                    :class="
                      item?.image_path ? '' : 'v-avatar-light-bg primary--text'
                    "
                    :variant="item?.image_path ? undefined : 'tonal'"
                  >
                    <AppAvatar
                      :image="item?.image_path"
                      :title="item?.name_kh"
                    />
                  </VAvatar>
                </VListItemAction>
              </template>

              <VListItemTitle class="font-weight-semibold">
                {{ item?.name_kh }}&nbsp;
              </VListItemTitle>
              <VListItemSubtitle>
                {{ item?.position?.name_kh }}
              </VListItemSubtitle>
            </VListItem>
            <VDivider class="my-2" />
          </template>

          <template v-for="item in systemParts">
            <VListItem
              @click="checkSystemPart(item.part)"
              :active="item.active"
              v-if="hasPermission(item.permission)"
            >
              <template #prepend>
                <VIcon class="me-2" :icon="item.icon" size="22" />
              </template>

              <VListItemTitle>{{ $t(item.title) }}</VListItemTitle>
            </VListItem>

            <VDivider class="my-2" v-if="hasPermission(item.permission)" />
          </template>

          <!-- 👉 Logout -->
          <VListItem @click="logout()" class="bg-error">
            <template #prepend>
              <VIcon class="me-2" icon="tabler-logout" size="22" />
            </template>

            <VListItemTitle>{{ $t("Logout") }}</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>
