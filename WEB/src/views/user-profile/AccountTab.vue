<script setup>
import { auth } from "@/utils/auth";
import getImageUrl from "@/utils/image/getImageUrl";
import avatar1 from "@images/avatars/my-avatar-1.jpg";
import { ref } from "vue";
import { VCardItem } from "vuetify/components";
import { useDisplay } from "vuetify";
import UpdateProfileImageDialog from "./UpdateProfileImageDialog.vue";
import { useAuthStore } from "@/stores/authStore";
import AppAvatar from "@/components/AppAvatar.vue";

const loading = ref(false);
const refInputEl = ref();

const formData = ref({ ...auth().user });

const showList = ref([
  {
    title: "Full Name",
    value: auth().user.name_kh,
    icon: "tabler-label",
  },
  {
    title: "Username",
    value: auth().user.username,
    icon: "tabler-brand-twitch",
  },
  {
    title: "Email",
    value: auth().user.email,
    icon: "tabler-mail",
  },
  {
    title: "Contact",
    value: auth().user.contact || "N/A",
    icon: "tabler-address-book",
  },
  {
    title: "Branch",
    value: auth().user.branch?.name_kh,
    icon: "tabler-home",
  },
  {
    title: "Role Name",
    value: auth().user.role?.display_name || "N/A",
    icon: "tabler-user-circle",
  },
  {
    title: "Position Name",
    value: auth().user.position?.name_kh || "N/A",
    icon: "tabler-user-circle",
  },
  {
    title: "Group Name",
    value: auth().user.under_user?.name_kh || "N/A",
    icon: "tabler-user-circle",
  },
]);

const authStore = useAuthStore();

const onUpdate = async () => {
  isProfileDialog.value = true;
};
const { mdAndUp } = useDisplay();

const changeAvatar = (file) => {
  const fileReader = new FileReader();
  const { files } = file.target;
  if (files && files.length) {
    fileReader.readAsDataURL(files[0]);
    fileReader.onload = () => {
      if (typeof fileReader.result === "string")
        formData.value.image_path = fileReader.result;
    };
  }
};

const isProfileDialog = ref(false);
// reset avatar image
const resetAvatar = () => {
  formData.value.image_path = accountData.image_path;
};

const onReload = () => {
  authStore.bootstrap();
  isProfileDialog.value = false;
};
</script>

<template>
  <UpdateProfileImageDialog
    v-model:isDialogVisible="isProfileDialog"
    @onReload="onReload"
  />
  <AppCard :is-header="false" border="border-none">
    <VCard class="border-none">
      <VCardItem class="pa-0 ma-1">
        <div class="align-start d-sm-flex ga-5">
          <div
            class="d-flex flex-column mr-6"
            :class="[!mdAndUp ? 'mb-4' : 'mb-1']"
          >
            <AppAvatar
              :image="auth()?.user?.image_path"
              :title="auth()?.user?.name_kh"
              :isShowFullImage="false"
              is-edit
              @on-edit="onUpdate()"
              :size="115"
              :q="100"
            />
            <!-- <VAvatar
              rounded
              :size="115"
              border
              :color="
                auth().user.image_path && !imageLoadError
                  ? undefined
                  : 'primary'
              "
              :class="
                auth().user.image_path && !imageLoadError
                  ? ''
                  : 'v-avatar-light-bg primary--text'
              "
              :variant="
                auth().user.image_path && !imageLoadError ? undefined : 'tonal'
              "
            >
              <VImg
                v-if="auth().user.image_path"
                :src="getImageUrl(auth().user.image_path)"
                @click="showImage(null)"
              />
              <span v-else style="font-size: 32px">{{
                avatarText(auth()?.user?.name_kh)
              }}</span>
            </VAvatar> -->
          </div>
          <div class="d-flex flex-column">
            <VRow>
              <template v-if="showList.length > 0" v-for="i in showList">
                <VCol cols="12" lg="3" md="3" sm="6">
                  <div class="d-flex flex-row align-center">
                    <VAvatar color="secondary" variant="tonal">
                      <VIcon :size="22" :icon="i.icon || 'tabler-folder'" />
                    </VAvatar>
                    <div class="d-flex flex-column ml-2">
                      <span style="font-size: 13px">{{ $t(i.title) }}</span>
                      <span class="text-primary">{{ i.value }}</span>
                    </div>
                  </div>
                </VCol>
              </template>
            </VRow>
          </div>
        </div>
      </VCardItem>
    </VCard>
  </AppCard>
</template>
