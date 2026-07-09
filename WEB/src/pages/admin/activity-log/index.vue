<script setup>
import { useI18n } from "vue-i18n";
import moment from "moment-timezone";
import { onMounted, ref } from "vue";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";
import AppAutocomplete from "@/@core/components/app-form-elements/AppAutocomplete.vue";
import { getUsers } from "@/services/dataService";
import AppDateTimePicker from "@/@core/components/app-form-elements/AppDateTimePicker.vue";

definePage({
  meta: {
    title: "Activity Log",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-activity-log",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const { t, locale } = useI18n();

const dataTableRef = ref(null);
const isLoading = ref(true);
const showDialog = ref(false); // For showing the dialog
const selectedItem = ref(null); // To store the selected log item
const changes = ref([]); // To store the list of changes
const users = ref([]);

const filter = ref({
  user_id: null,
  event: null,
  subject_type: null,
  search: null,
  start_date: moment()
    .tz("Asia/Phnom_Penh")
    .format("YYYY-MM-DDTHH:mm:ss.SSS+07:00"),
});

const events = [
  { title: "Created", value: "created" },
  { title: "Updated", value: "updated" },
  { title: "Deleted", value: "deleted" },
];

const subjectTypes = [
  { title: "User", value: "User" },
  { title: "Loan", value: "Loan" },
  { title: "Receive", value: "Receive" },
  { title: "Journal", value: "Journal" },
  { title: "CloseEntry", value: "CloseEntry" },
];

const headers = [
  {
    title: t("Users"),
    key: "causer",
    value: (item) => item?.causer?.name_kh || null,
  },
  { title: t("Event"), key: "event" },
  { title: t("Subject Type"), key: "subject_type" },
  { title: t("Subject Id"), key: "subject_id" },
  { title: t("Description"), key: "description" },
  {
    title: t("Created At"),
    key: "created_at",
    value: (item) =>
      moment(new Date(item.created_at)).format("DD-MM-YYYY HH:mm:ss"),
  },
  { title: t("Action"), key: "actions", align: "center" },
];

// Handle view action and compute changes
const onView = (item) => {
  selectedItem.value = item;
  if (item.event === "updated" && item.properties) {
    changes.value = computeChanges(
      item.properties.old,
      item.properties.attributes
    );
  } else {
    changes.value = []; // Reset for non-update events
  }
  showDialog.value = true;
};

// Compute differences between old and new values
const computeChanges = (oldData, newData) => {
  const changesList = [];
  for (const key in oldData) {
    if (oldData[key] !== newData[key]) {
      changesList.push({
        field: key,
        oldValue: oldData[key],
        newValue: newData[key],
      });
    }
  }
  return changesList;
};

onMounted(async () => {
  const dataUsers = await getUsers();
  users.value = dataUsers;
});
</script>

<template>
  <AppCardTable
    ref="dataTableRef"
    title="Activity Log"
    title-icon="tabler-file-text-shield"
    api-url="activity-log-list"
    saveHeaderName="header-activity-log-list"
    saveStateName="save-state-activity-log-list"
    v-model:loading="isLoading"
    v-model:filters="filter"
    :headers="headers"
    is-filter
    is-view
    is-excel
    save-state
    :is-back="false"
    @on-view="onView"
  >
    <template #filter>
      <VRow class="justify-end">
        <VCol cols="12" lg="2" md="3" sm="6">
          <AppAutocomplete
            v-model="filter.event"
            :items="events"
            item-title="title"
            item-value="value"
            clearable
          >
            <template v-slot:label>{{ $t("Event") }}</template>
          </AppAutocomplete>
        </VCol>
        <VCol cols="12" lg="2" md="3" sm="6">
          <AppAutocomplete
            v-model="filter.subject_type"
            :items="subjectTypes"
            item-title="title"
            item-value="value"
            clearable
          >
            <template v-slot:label>{{ $t("Subject Type") }}</template>
          </AppAutocomplete>
        </VCol>
        <VCol cols="12" lg="2" md="3" sm="6">
          <AppAutocomplete
            v-model="filter.user_id"
            :items="users"
            item-title="name_kh"
            item-value="id"
            clearable
          >
            <template v-slot:label>{{ $t("User") }}</template>
          </AppAutocomplete>
        </VCol>
        <VCol cols="12" lg="2" md="3" sm="6">
          <AppDateTimePicker v-model="filter.start_date" clearable>
            <template v-slot:label>{{ $t("Date") }}</template>
          </AppDateTimePicker>
        </VCol>
        <VCol cols="12" lg="2" md="3" sm="12">
          <VTextField
            v-model="filter.search"
            :label="t('Search')"
            prepend-inner-icon="tabler-search"
            clearable
            hide-details
            autocomlete="off"
            clear-icon="tabler-x"
          />
        </VCol>
      </VRow>
    </template>

    <template v-slot:item.event="{ item }">
      <VChip color="success" v-if="item.event == 'created'" size="small">
        Created
      </VChip>
      <VChip color="warning" v-if="item.event == 'updated'" size="small">
        Updated
      </VChip>
      <VChip color="error" v-if="item.event == 'deleted'" size="small">
        Deleted
      </VChip>
    </template>

    <template v-slot:item.actions="{ item }">
      <VBtn
        icon="tabler-list-search"
        variant="text"
        color="primary"
        @click="onView(item)"
      />
    </template>
  </AppCardTable>

  <!-- Dialog for showing properties -->
  <VDialog v-model="showDialog" max-width="600px">
    <VCard>
      <VCardTitle>Record Details</VCardTitle>
      <VDivider />
      <VCardText style="padding: 12px">
        <div v-if="selectedItem">
          <div v-if="selectedItem.event === 'updated' && changes.length > 0">
            <VList lines="two" border>
              <template v-for="(change, index) in changes" :key="index">
                <VListItem>
                  <VListItemTitle>
                    <strong>{{ change.field }}</strong>
                  </VListItemTitle>
                  <VListItemSubtitle class="mt-1">
                    <span style="color: rgb(var(--v-theme-se))"
                      >old: {{ change.oldValue }} &nbsp;</span
                    >
                    <!-- <VIcon>tabler-arrow-right</VIcon> -->
                    <span style="color: rgb(var(--v-theme-success))"
                      >new: {{ change.newValue }}</span
                    >
                  </VListItemSubtitle>
                </VListItem>
                <VDivider v-if="index !== changes.length - 1" />
              </template>
            </VList>
          </div>
          <div v-else>
            <VList lines="two" border>
              <template
                v-for="(data, index) in selectedItem?.properties?.attributes"
              >
                <VListItem>
                  <VListItemTitle>
                    <strong>{{ index }}</strong>
                  </VListItemTitle>
                  <VListItemSubtitle class="mt-1"
                    ><span>{{ data }}</span></VListItemSubtitle
                  >
                </VListItem>

                <VDivider
                  v-if="
                    index !== selectedItem?.properties?.attributes.length - 1
                  "
                />
              </template>
              <!-- {{ selectedItem?.properties?.attributes }} -->
            </VList>
          </div>
        </div>
      </VCardText>
      <VCardText class="d-flex flex-row justify-end" style="padding: 12px">
        <VBtn color="secondary" variant="tonal" @click="showDialog = false"
          >Close</VBtn
        >
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
pre {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
