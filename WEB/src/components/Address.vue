<script setup>
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import { app } from "@/utils/app";
import { onMounted, ref, watch } from "vue";

const props = defineProps({
  province_code: {
    type: [String, Number],
    default: null,
  },
  district_code: {
    type: [String, Number],
    default: null,
  },
  commune_code: {
    type: [String, Number],
    default: null,
  },
  village_code: {
    type: [String, Number],
    default: null,
  },
});

const emit = defineEmits([
  "update:province_code",
  "update:district_code",
  "update:commune_code",
  "update:village_code",
]);

const provinces = ref([]);
const districts = ref([]);
const communes = ref([]);
const villages = ref([]);

const toInt = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
};

const sameCode = (a, b) => {
  const na = toInt(a);
  const nb = toInt(b);
  if (na != null && nb != null) return na === nb;
  return String(a ?? "") === String(b ?? "");
};

const getAddressData = () => {
  const data = app();
  if (!data) return null;
  return {
    provinces: data.provinces ?? [],
    districts: data.districts ?? [],
    communes: data.communes ?? [],
    villages: data.villages ?? [],
  };
};

const getVillageCommuneCode = (village) =>
  village?.commune_code ??
  village?.commune_id ??
  village?.communeCode ??
  village?.communeId ??
  null;

const loadDistricts = (provinceCode) => {
  const data = getAddressData();
  if (!data || provinceCode == null) {
    districts.value = [];
    return;
  }

  districts.value = data.districts.filter((d) =>
    sameCode(d.province_code, provinceCode),
  );
};

const loadCommunes = (districtCode) => {
  const data = getAddressData();
  if (!data || districtCode == null) {
    communes.value = [];
    return;
  }

  communes.value = data.communes.filter((c) =>
    sameCode(c.district_code, districtCode),
  );
};

const loadVillages = (communeCode) => {
  const data = getAddressData();
  if (!data || communeCode == null) {
    villages.value = [];
    return;
  }

  villages.value = data.villages.filter((v) =>
    sameCode(getVillageCommuneCode(v), communeCode),
  );
};

// Load dropdown lists when editing (values already set)
const syncListsFromProps = () => {
  provinces.value = getAddressData()?.provinces ?? [];

  if (props.province_code != null) {
    loadDistricts(props.province_code);
  } else {
    districts.value = [];
  }

  if (props.district_code != null) {
    loadCommunes(props.district_code);
  } else {
    communes.value = [];
  }

  if (props.commune_code != null) {
    loadVillages(props.commune_code);
  } else {
    villages.value = [];
  }
};

onMounted(() => {
  syncListsFromProps();
});

const updateProvince = (val) => {
  emit("update:province_code", val);
  emit("update:district_code", null);
  emit("update:commune_code", null);
  emit("update:village_code", null);
  loadDistricts(val);
  communes.value = [];
  villages.value = [];
};

const updateDistrict = (val) => {
  emit("update:district_code", val);
  emit("update:commune_code", null);
  emit("update:village_code", null);
  loadCommunes(val);
  villages.value = [];
};

const updateCommune = (val) => {
  emit("update:commune_code", val);
  emit("update:village_code", null);
  loadVillages(val);
};

const updateVillage = (val) => {
  emit("update:village_code", val);

  // If village picked first, fill parent codes
  if (val != null && props.province_code == null) {
    const data = getAddressData();
    if (!data) return;

    const village = data.villages.find((v) => sameCode(v.code, val));
    if (!village) return;

    const communeCode = getVillageCommuneCode(village);
    const commune = data.communes.find((c) => sameCode(c.code, communeCode));
    const district = commune
      ? data.districts.find((d) => sameCode(d.code, commune.district_code))
      : null;

    emit("update:commune_code", communeCode);
    emit("update:district_code", commune?.district_code ?? null);
    emit("update:province_code", district?.province_code ?? null);

    syncListsFromProps();
  }
};

// Re-sync lists when parent changes values (edit dialog opens with data)
watch(
  () => [props.province_code, props.district_code, props.commune_code],
  () => syncListsFromProps(),
);
</script>

<template>
  <VRow>
    <VCol cols="12" sm="6" md="3">
      <AppAutocomplete
        class="customFontSiemreap"
        label="ខេត្ត/រាជធានី"
        :items="provinces"
        item-value="code"
        item-title="name_kh"
        :model-value="province_code"
        autocomplete="off"
        @update:model-value="updateProvince"
      />
    </VCol>

    <VCol cols="12" sm="6" md="3">
      <AppAutocomplete
        class="customFontSiemreap"
        label="ស្រុក/ខណ្ឌ"
        :items="districts"
        item-value="code"
        item-title="name_kh"
        :model-value="district_code"
        autocomplete="off"
        @update:model-value="updateDistrict"
      />
    </VCol>

    <VCol cols="12" sm="6" md="3">
      <AppAutocomplete
        class="customFontSiemreap"
        label="ឃុំ/សង្កាត់"
        :items="communes"
        item-value="code"
        item-title="name_kh"
        :model-value="commune_code"
        autocomplete="off"
        @update:model-value="updateCommune"
      />
    </VCol>

    <VCol cols="12" sm="6" md="3">
      <AppAutocomplete
        class="customFontSiemreap"
        label="ភូមិ"
        :items="villages"
        item-value="code"
        item-title="name_kh"
        :model-value="village_code"
        autocomplete="off"
        @update:model-value="updateVillage"
      />
    </VCol>
  </VRow>
</template>
