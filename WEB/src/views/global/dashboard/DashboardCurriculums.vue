<script setup>
import { api } from "@/utils/api";
import { onMounted, ref } from "vue";

const data = ref(null);

const getData = async () => {
  try {
    const res = await api.post("dashboard-curriculum");

    console.log(res.data.data);

    data.value = res.data.data;
  } catch (error) {
    console.log(error);
  }
};

onMounted(() => {
  getData();
});
</script>
<template>
  <div>{{ data }}</div>
</template>
