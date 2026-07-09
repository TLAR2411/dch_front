<script setup>
import { api } from "@/utils/api";
import formatCurrency from "@/utils/formater/formatCurrency";
import { onMounted } from "vue";
import { useSettingStore } from "@/stores/settingStore";

// const props = defineProps({
//   itemData: {
//     type: Object,
//     required: false,
//     default: () => ({}),
//   },
// });
const items = ref({});
const settingStore = useSettingStore();

const initData = async () => {
  const res = await api.post("accounting-dashboard-summary");

  items.value = res.data.data;
};

onMounted(() => {
  initData();
});

watch(
  () => settingStore.branch_id,
  (n, o) => {
    initData();
  },
);
const logisticData = computed(() => [
  {
    icon: "tabler-cash",
    color: "primary",
    title: "Cash On Hand",
    value: items.value?.cash_on_hand,
    isHover: false,
    label: "Cash On Hand",
  },
  {
    icon: "tabler-credit-card",
    color: "success",
    title: "Cash In Bank",
    value: items.value?.cash_in_bank,
    isHover: false,
    label: "Cash In Bank",
  },
  {
    icon: "tabler-pig-money",
    color: "warning",
    title: "Withdraw Deposit",
    value: items.value?.withdraw_deposit,
    isHover: false,
    label: "Withdraw Deposit",
  },
  {
    icon: "tabler-arrow-up",
    color: "error",
    title: "Expenses",
    value: items.value?.expenses,
    isHover: false,
    label: "Expenses",
  },
  // {
  //   icon: "tabler-file-check",
  //   color: "info",
  //   title: "Total Collected",
  //   amount: formatCurrency(items.value.total_receive) || 0,
  //   value: formatCurrency(items.value.total_count) || 0,
  //   isHover: false,
  // },
  // {
  //   icon: "tabler-file-dollar",
  //   color: "primary",
  //   title: "Loan Disburse",
  //   amount: formatCurrency(items.value.disburse_receive) || 0,
  //   value: formatCurrency(items.value.disburse_count) || 0,
  //   isHover: false,
  // },
]);
</script>

<template>
  <VRow>
    <VCol
      v-for="(data, index) in logisticData"
      :key="index"
      cols="12"
      lg="3"
      md="6"
      sm="12"
    >
      <div>
        <VCard>
          <VCardText class="pa-5">
            <div class="d-flex justify-space-between">
              <div class="d-flex flex-row align-center justify-space-between">
                <VAvatar :color="data.color" size="42" variant="tonal">
                  <VIcon :icon="data.icon" size="20" />
                </VAvatar>
                <div class="d-flex flex-column ml-4">
                  <span class="text-h5">
                    {{ formatCurrency(data.value) }}
                  </span>
                  <span style="font-size: 14px"> {{ $t(data.label) }} </span>
                </div>
              </div>
            </div>
          </VCardText>
        </VCard>
      </div>
    </VCol>
  </VRow>
</template>

<style lang="scss" scoped>
@use "@core/scss/base/mixins" as mixins;

.logistics-card-statistics {
  border-block-end-style: solid;
  border-block-end-width: 2px;

  &:hover {
    border-block-end-width: 3px;
    margin-block-end: -1px;

    @include mixins.elevation(8);

    transition: all 0.1s ease-out;
  }
}

.skin--bordered {
  .logistics-card-statistics {
    border-block-end-width: 2px;

    &:hover {
      border-block-end-width: 3px;
      margin-block-end: -2px;
      transition: all 0.1s ease-out;
    }
  }
}
</style>
