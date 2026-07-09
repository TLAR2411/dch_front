<script setup>
import { GoogleMap, Marker, InfoWindow, AdvancedMarker } from "vue3-google-map";

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const props = defineProps({
  center: {
    type: Object,
    required: false,
    default: () => ({ lat: 40.689247, lng: -74.044502 }),
  },
});

const redirectToGoogleMaps = () => {
  if (props.center) {
    const { lat, lng } = props.center;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank");
  }
};
</script>

<template>
  <GoogleMap
    v-if="center"
    :api-key="apiKey"
    style="width: 100%; height: 100%"
    :center="center"
    :zoom="15"
  >
    <Marker :options="{ position: center }">
      <!-- <InfoWindow :options="{ position: center }">
        <div id="content">
          <h1 id="firstHeading" class="firstHeading">Uluru</h1>
          <div id="bodyContent">
            <p>
              <b>Uluru</b>, also referred to as <b>Ayers Rock</b>, is a large
              sandstone rock formation in the southern part of the Northern
              Territory, central Australia. It lies 335&#160;km (208&#160;mi)
              south west of the nearest large town, Alice Springs; 450&#160;km
              (280&#160;mi) by road. Kata Tjuta and Uluru are the two major
              features of the Uluru - Kata Tjuta National Park. Uluru is sacred
              to the Pitjantjatjara and Yankunytjatjara, the Aboriginal people
              of the area. It has many springs, waterholes, rock caves and
              ancient paintings. Uluru is listed as a World Heritage Site.
            </p>
            <p>
              Attribution: Uluru,
              <a
                href="https://en.wikipedia.org/w/index.php?title=Uluru&oldid=297882194"
              >
                https://en.wikipedia.org/w/index.php?title=Uluru</a
              >
              (last visited June 22, 2009).
            </p>
          </div>
        </div>
      </InfoWindow> -->
    </Marker>

    <VBtn size="x-small" class="redirect-button" @click="redirectToGoogleMaps"
      >Open</VBtn
    >
  </GoogleMap>
</template>

<style scoped>
.redirect-button {
  position: absolute;
  bottom: 20px;
}

.redirect-button:hover {
  background-color: #1557b0;
}
</style>
