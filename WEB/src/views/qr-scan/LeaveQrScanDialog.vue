<script setup>
import AppGoogleMap from "@/components/AppGoogleMap.vue";
import { ref, watch } from "vue";
import { QrcodeStream } from "vue-qrcode-reader";
import AppTowRadioIcon from "@/components/AppTowRadioIcon.vue";
import formatDate from "@/utils/formater/formatDate";
import { useSound } from "@vueuse/sound";
import buttonSfx from "@/assets/sounds/notification.mp3";
import { api } from "@/utils/api";

const props = defineProps({
  itemData: {
    type: Object,
    required: false,
    default: () => ({
      type: "check_in",
    }),
  },
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
});

const { play } = useSound(buttonSfx);

const itemData = ref({
  type: "check_in",
});
const result = ref(null);
const position = ref(null);
const error = ref(null);

const getLocation = () => {
  if (!navigator.geolocation) {
    error.value = "Geolocation is not supported by your browser";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      position.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
    },
    (err) => {
      error.value = `Error getting location: ${err.message}`;
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    },
  );
};

// import { QrcodeStream } from "vue-qrcode-reader";

const onDetect = (detectedCodes) => {
  // detectedCodes[0].rawValue contains the string from the QR code
  // It usually looks like: "123456789|SOK|SAVY|..."
  console.log("ID Data:", detectedCodes[0].rawValue);
};
// const onDetect = async (detectedCodes) => {
//   console.log(detectedCodes);

//   if (detectedCodes.length > 0) {
//     getLocation();
//     result.value = detectedCodes[0].rawValue;

//     const res = await api.get("fake-request");

//     if (res.data.status) {
//       play();
//       onCloseDialog();
//     }
//   }
// };

const emit = defineEmits(["update:isDialogVisible"]);

const onCloseDialog = () => {
  emit("update:isDialogVisible", false);
};

const propertyRadioContent = [
  {
    title: "Check-in",
    icon: {
      icon: "tabler-door-enter",
      size: "28",
    },
    value: "check_in",
  },
  {
    title: "Check-out",
    icon: {
      icon: "tabler-door-exit",
      size: "28",
    },
    value: "check_out",
  },
];
</script>

<template>
  <VDialog
    :model-value="isDialogVisible"
    fullscreen
    :scrim="false"
    @update:model-value="(value) => $emit('update:isDialogVisible', value)"
    transition="dialog-bottom-transition"
    persistent
  >
    <VCard>
      <!-- <div>
        <VToolbar color="primary">
          <VToolbarTitle>
            <span style="font-size: 18px">
              <VIcon>tabler-scan</VIcon>
              {{ $t("Attendance Scan") }}
            </span>
          </VToolbarTitle>

          <VSpacer />

          <VToolbarItems style="width: 50px">
            <VBtn icon variant="plain" @click="onCloseDialog">
              <VIcon color="white" icon="tabler-x" />
            </VBtn>
          </VToolbarItems>
        </VToolbar>
      </div>
      <VList lines="two" class="d-flex flex-row justify-center align-center">
        <div style="max-width: 450px">
          <VCardText class="pa-0 qr-wrapper">
            <QrcodeStream @detect="onDetect" />

            <div class="qr-outline">
              <span class="corner top-left"></span>
              <span class="corner top-right"></span>
              <span class="corner bottom-left"></span>
              <span class="corner bottom-right"></span>
            </div>
          </VCardText>
        </div>
      </VList>

      --><qrcode-stream @detect="onDetect"></qrcode-stream>
    </VCard>
  </VDialog>
  <!-- <VDialog
    v-if="isDialogVisible"
    :model-value="isDialogVisible"
    @update:model-value="(value) => $emit('update:isDialogVisible', value)"
    :max-width="425"
    persistent
  >
    <div class="dialog-content" style="max-height: 100vh; overflow-y: auto">
      <DialogCloseBtn @click="onCloseDialog" />
      <VCard>
        <VCardItem
          class="text-primary"
          style="
            padding: 12px;
            background-color: rgba(211, 211, 211, 0.2) !important;
          "
        >
          <span style="font-size: 18px">
            <VIcon>tabler-scan</VIcon>
            {{ $t("Attendance Scan") }}
          </span>
        </VCardItem>

        <VCardText class="pa-0 qr-wrapper">
          <QrcodeStream @detect="onDetect" />

          <div class="qr-outline">
            <span class="corner top-left"></span>
            <span class="corner top-right"></span>
            <span class="corner bottom-left"></span>
            <span class="corner bottom-right"></span>
          </div>
        </VCardText>

        <div class="date-line d-flex flex-row justify-space-between pr-4 pl-4">
          <div class="d-flex flex-column">
            <span class="text-success">Last Check In</span>
            <span>123123123</span>
          </div>
          <div class="d-flex flex-column text-end">
            <span class="text-error">Last Check Out</span>
            <span>123123123</span>
          </div>
        </div>

        <VCardText class="d-flex justify-end flex-wrap gap-3 pa-0">
          <VCol cols="12" sm="12" md="12">
            <AppTowRadioIcon
              v-model:selected-radio="itemData.type"
              :radio-content="propertyRadioContent"
              :grid-column="{ cols: '6', sm: '6' }"
            />
          </VCol>
        </VCardText>
      </VCard>
    </div>
  </VDialog> -->
</template>

<style scoped>
.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.2s ease-in-out;
}
.qr-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1; /* keep it square */
  overflow: hidden;
}

.qr-wrapper video {
  object-fit: cover;
  border-radius: 12px;
  background-color: #000; /* black background to make sure it's visible */
}

/* The container for corners */
.qr-outline {
  position: absolute;
  inset: 15%; /* margin inside */
  width: 70%;
  height: 70%;
  pointer-events: none; /* let camera clicks pass */
}

/* Corner styles */
.corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 3px solid white;
}

.top-left {
  top: 0;
  left: 0;
  border-right: none;
  border-bottom: none;
}

.top-right {
  top: 0;
  right: 0;
  border-left: none;
  border-bottom: none;
}

.bottom-left {
  bottom: 0;
  left: 0;
  border-right: none;
  border-top: none;
}

.bottom-right {
  bottom: 0;
  right: 0;
  border-left: none;
  border-top: none;
}
</style>
