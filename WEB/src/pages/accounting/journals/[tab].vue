<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import JournalTwoCard from "@/views/accounting/journals/TwoCardJournal.vue";
import JournalCreate from "@/views/accounting/journals/CreateJournals.vue";
import JournalEdit from "@/views/accounting/journals/EditJournals.vue";
import hasPermission from "@/utils/hasPermission";
import { useDisplay } from "vuetify";

definePage({
  meta: {
    title: "Journals",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-journals",
  },
});

const journalTabs = [
  {
    title: "Journals",
    icon: "tabler-users",
    tab: "journals",
    permission: "",
    sub: [
      {
        title: "Account List",
        icon: "tabler-list-details",
        tab: "list",
        permission: "view-journals",
      },
      {
        title: "Journal",
        icon: "tabler-edit",
        tab: "create",
        permission: "add-journals",
      },
      // {
      //   title: "Close Entry",
      //   tab: "close-entry",
      //   icon: "tabler-checklist",
      //   permission: "view-close-entries",
      // },
    ],
  },
];

const route = useRoute();
const { mdAndUp } = useDisplay();
const defaultTab = "address";
const activeTab = ref(route.params.tab || defaultTab);

const tabs = journalTabs.find((v) => v.tab == "journals")?.sub;

const preventScrollInterference = (event) => {
  if (event.target.closest(".v-window__container")) {
    event.stopPropagation();
  }
};

onMounted(() => {
  const windowContainer = document.querySelector(".v-window");
  if (windowContainer) {
    windowContainer.addEventListener("wheel", preventScrollInterference, {
      passive: false,
    });
    windowContainer.addEventListener("touchmove", preventScrollInterference, {
      passive: false,
    });
  }
});
</script>

<template>
  <VCard>
    <VCol>
      <VRow>
        <div class="d-flex flex-column w-100 h-100">
          <VTabs
            v-model="activeTab"
            grow
            stacked
            class="v-tabs--fixed"
            height="60px"
          >
            <template v-for="item in tabs">
              <VTab
                v-if="!item.permission || hasPermission(item.permission)"
                :key="item.icon"
                :value="item.tab"
                :to="{
                  name: 'accounting-journals-tab',
                  params: { tab: item.tab },
                }"
              >
                <VIcon :icon="item.icon" class="mb-1" />
                <span style="font-size: 14px">
                  {{ $t(item.title) }}
                </span>
              </VTab>
            </template>
          </VTabs>

          <VWindow
            v-model="activeTab"
            class="disable-tab-transition"
            :touch="false"
          >
            <VWindowItem value="list">
              <JournalTwoCard v-if="activeTab === 'list'" :key="activeTab" />
            </VWindowItem>

            <VWindowItem value="create">
              <JournalEdit
                v-if="activeTab === 'create' && route.query.code != null"
                :key="activeTab"
              />
              <JournalCreate v-else :key="activeTab" />
            </VWindowItem>
          </VWindow>
        </div>
      </VRow>
    </VCol>
  </VCard>
</template>

<style scoped>
/* Ensure content area handles scrolling correctly */
.v-window__container {
  max-height: calc(100vh - 150px); /* Adjust based on your layout */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on touch devices */
}

/* Prevent VWindow from intercepting scroll events */
.v-window {
  overflow: hidden !important;
}
</style>
