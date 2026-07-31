<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BehaviorList from "./BehaviorList.vue";
import RatingList from "@/views/global/rating/RatingList.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const tabs = ["behavior", "rating"];

const resolveTab = (value) =>
  tabs.includes(String(value)) ? String(value) : "behavior";

const activeTab = ref(resolveTab(route.query.tab));

onMounted(() => {
  if (route.query.tab !== activeTab.value) {
    router.replace({ query: { ...route.query, tab: activeTab.value } });
  }
});

watch(
  () => route.query.tab,
  (tab) => {
    const next = resolveTab(tab);
    if (activeTab.value !== next) activeTab.value = next;
  },
);

watch(activeTab, (tab) => {
  if (route.query.tab === tab) return;
  router.replace({ query: { ...route.query, tab } });
});
</script>

<template>
  <div>
    <VTabs v-model="activeTab" color="primary" class="mb-3">
      <VTab value="behavior" prepend-icon="tabler-mood-smile">
        {{ t("Behavior") }}
      </VTab>
      <VTab value="rating" prepend-icon="tabler-star">
        {{ t("Rating") }}
      </VTab>
    </VTabs>

    <VWindow v-model="activeTab" class="disable-tab-transition" :touch="false">
      <VWindowItem value="behavior">
        <BehaviorList />
      </VWindowItem>
      <VWindowItem value="rating">
        <RatingList />
      </VWindowItem>
    </VWindow>
  </div>
</template>
