<script setup>
import { app } from "@/utils/app.js";
import AppAutocomplete from "@core/components/app-form-elements/AppAutocomplete.vue";
import AppDateTimePicker from "@core/components/app-form-elements/AppDateTimePicker.vue";
import AppTextField from "@core/components/app-form-elements/AppTextField.vue";
import { api } from "@/utils/api";
import { requiredValidator } from "@/@core/utils/validators";
import { useI18n } from "vue-i18n";
import { ref, watch, computed, onMounted } from "vue";
import {
  getCurrencies,
  getJournalClasses,
  getPeople,
} from "@/services/dataService";
import formatCurrency from "@/utils/formater/formatCurrency";
import { useAppStore } from "@/stores/appStore";
import AppSelect from "@/@core/components/app-form-elements/AppSelect.vue";

definePage({
  meta: {
    title: "Create Journals",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "add-journals",
  },
});

const chartAccounts = ref(app().chartAccounts);
const accountTypes = ref(app().accountTypes);
const { t, locale } = useI18n();
const appCardRef = ref(null);
// const currencies = ref([]);
const isLoading = ref(false);
const filteredChartAccounts = ref([]);
const people = ref([]);
const journalClasses = ref([]);

const formData = ref({
  journal_date: new Date(),
  totalCredit: 0,
  totalDebit: 0,
  total_amount: null,
  description: null,
  name: null,
  class: null,
  reference: null,
  // currency_id: currencies.value.find((v) => v.default == 1)?.id,
  class_id: null,
  person_id: null,
  transactions: [
    {
      account_type_id: null,
      account_code: null,
      description: null,
      debit_amount: 0,
      credit_amount: 0,
    },
  ],
});

const resetForm = () => {
  formData.value = {
    journal_date: new Date(),
    totalCredit: 0,
    totalDebit: 0,
    total_amount: null,
    description: null,
    name: null,
    class: null,
    reference: null,
    // currency_id: currencies.value.find((v) => v.default == 1)?.id,
    class_id: null,
    person_id: null,
    transactions: [
      {
        account_type_id: null,
        account_code: null,
        description: null,
        debit_amount: 0,
        credit_amount: 0,
      },
    ],
  };
  filteredChartAccounts.value = [];
};
// Watch transactions for account_type_id changes to filter chart accounts
watch(
  () => formData.value.transactions,
  (newtransactions) => {
    newtransactions.forEach((transition, index) => {
      if (transition.account_type_id) {
        filteredChartAccounts.value[index] = chartAccounts.value.filter(
          (account) => account.account_type_id === transition.account_type_id,
        );
        if (
          transition.account_code &&
          !filteredChartAccounts.value[index].some(
            (account) => account.code === transition.account_code,
          )
        ) {
          transition.account_code = null;
        }
      } else {
        filteredChartAccounts.value[index] = [];
        transition.account_code = null;
      }
    });
  },
  { deep: true },
);

// Watch transactions to auto-add a new row
watch(
  () => formData.value.transactions,
  (newtransactions) => {
    const lastRow = newtransactions[newtransactions.length - 1];
    if (
      lastRow &&
      lastRow.account_type_id &&
      lastRow.account_code &&
      (lastRow.debit_amount > 0 || lastRow.credit_amount > 0)
    ) {
      addTransitionRow();
    }
  },
  { deep: true },
);

// Function to handle debit and credit amount changes
const handleAmountChange = (transition, field) => {
  const debit = parseFloat(transition.debit_amount) || 0;
  const credit = parseFloat(transition.credit_amount) || 0;
  if (field === "debit" && debit > 0) {
    transition.credit_amount = 0;
  } else if (field === "credit" && credit > 0) {
    transition.debit_amount = 0;
  }
};

// Watch transactions to enforce debit_amount and credit_amount rule
watch(
  () => formData.value.transactions,
  (newtransactions) => {
    newtransactions.forEach((transition) => {
      const debit = parseFloat(transition.debit_amount) || 0;
      const credit = parseFloat(transition.credit_amount) || 0;
      if (debit > 0 && credit > 0) {
        transition.credit_amount = 0;
      }
    });
  },
  { deep: true },
);

const onClear = () => {
  resetForm();
};

const addTransitionRow = () => {
  formData.value.transactions.push({
    account_type_id: null,
    account_code: null,
    description: formData.value.transactions[0].description,
    debit_amount: 0,
    credit_amount: 0,
  });
  filteredChartAccounts.value.push([]);
  nextTick(() => {
    appCardRef.value.scrollToBottom();
  });
};

const removeTransitionRow = (index) => {
  if (formData.value.transactions.length > 1) {
    formData.value.transactions.splice(index, 1);
    filteredChartAccounts.value.splice(index, 1);
  }
};

// Computed properties for total debit and credit amounts
const totalDebit = computed(() =>
  formData.value.transactions.reduce(
    (sum, t) => sum + (parseFloat(t.debit_amount) || 0),
    0,
  ),
);
const totalCredit = computed(() =>
  formData.value.transactions.reduce(
    (sum, t) => sum + (parseFloat(t.credit_amount) || 0),
    0,
  ),
);

const onSubmit = async (refForm) => {
  formData.value.totalCredit = totalCredit.value;
  formData.value.totalDebit = totalDebit.value;

  const { valid } = await refForm;
  if (valid) {
    try {
      isLoading.value = true;
      const res = await api.post("journals-store", formData.value);
      if (res.data.status) {
        resetForm();
      } else {
        console.error("Error with the response:", res.data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      isLoading.value = false;
    }
  }
};

onMounted(async () => {
  useAppStore().getChartAccounts();

  const [dataJournalClasses, dataPeople] = await Promise.all([
    getJournalClasses(),
    getPeople(),
  ]);

  journalClasses.value = dataJournalClasses;
  people.value = dataPeople;
});
</script>

<template>
  <AppCard
    ref="appCardRef"
    title="Create Journal"
    title-icon="tabler-edit"
    :is-submit="true"
    :is-header="false"
    :is-clear="true"
    is-check-branch
    :loading="isLoading"
    footer-align="justify-space-between"
    border="border-0"
    isFullHeightTab
    @onSubmit="onSubmit"
    @onClear="resetForm"
  >
    <VRow>
      <VCol cols="12" sm="4" md="2">
        <AppDateTimePicker
          v-model="formData.journal_date"
          placeholder="Select date"
          label="Select date"
          :rules="[requiredValidator]"
          variant="underlined"
          autocomplete="off"
          prepend-inner-icon="tabler-calendar-due"
        />
      </VCol>
      <VCol cols="12" sm="4" md="2">
        <AppTextField
          v-model="formData.reference"
          label="Reference"
          placeholder="e.g. 000001"
          variant="underlined"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" sm="4" md="4">
        <AppAutocomplete
          v-model="formData.class_id"
          clearable
          :items="journalClasses"
          item-value="id"
          item-title="name_kh"
          placeholder="ចំណាត់ថ្នាក់ថវិកា"
          label="Budget Classification"
          variant="underlined"
          autocomplete="off"
        />
      </VCol>
      <VCol cols="12" sm="12" md="4">
        <AppAutocomplete
          v-model="formData.person_id"
          clearable
          :items="people"
          item-value="id"
          item-title="name_kh"
          placeholder="ឈ្មោះ"
          label="Name"
          variant="underlined"
          autocomplete="off"
        />
      </VCol>
    </VRow>

    <VRow>
      <VCol class="pa-0">
        <VDivider />
        <div class="w-100 insert-table">
          <VTable class="text-no-wrap">
            <thead style="background-color: rgba(211, 211, 211, 0.15)">
              <tr>
                <th class="text-center font-weight-bold" style="width: 15%">
                  {{ $t("Account Type") }}
                </th>
                <th class="text-center font-weight-bold" style="width: 35%">
                  {{ $t("Account Name") }}
                </th>
                <th class="text-center font-weight-bold" style="width: 30%">
                  {{ $t("Description") }}
                </th>
                <th class="text-center font-weight-bold" style="width: 10%">
                  {{ $t("Debit") }}
                </th>
                <th class="text-center font-weight-bold" style="width: 10%">
                  {{ $t("Credit") }}
                </th>
                <th style="width: 10px"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(item, index) in formData.transactions">
                <tr>
                  <td class="pr-0 pl-0">
                    <VSelect
                      v-model="item.account_type_id"
                      :items="accountTypes"
                      item-title="name_kh"
                      item-value="id"
                      placeholder="ប្រភេទគណនី"
                      autocomplete="off"
                      :variant="
                        item.debit_amount > 0 || item.credit_amount > 0
                          ? 'plain'
                          : 'underlined'
                      "
                    />
                  </td>
                  <td class="pr-0">
                    <AppAutocomplete
                      v-model="item.account_code"
                      :items="filteredChartAccounts[index] || []"
                      :item-title="
                        (item) => {
                          return `${item.code}-${item.name_kh}`;
                        }
                      "
                      item-value="code"
                      placeholder="ឈ្មោះគណនី"
                      autocomplete="off"
                      :variant="
                        item.debit_amount > 0 || item.credit_amount > 0
                          ? 'plain'
                          : 'underlined'
                      "
                    />
                  </td>
                  <td class="pr-0">
                    <AppTextField
                      v-model="item.description"
                      placeholder=""
                      :variant="
                        item.debit_amount > 0 || item.credit_amount > 0
                          ? 'plain'
                          : 'underlined'
                      "
                      autocomplete="off"
                      :disabled="item.account_code == null"
                    />
                  </td>
                  <td class="pr-0">
                    <AppTextField
                      v-model="item.debit_amount"
                      type="text"
                      format-currency
                      :variant="
                        item.debit_amount > 0 || item.credit_amount > 0
                          ? 'plain'
                          : 'underlined'
                      "
                      autocomplete="off"
                      :disabled="item.account_code == null"
                      @update:model-value="handleAmountChange(item, 'debit')"
                    />
                  </td>
                  <td class="pr-0">
                    <AppTextField
                      v-model="item.credit_amount"
                      type="text"
                      format-currency
                      :variant="
                        item.debit_amount > 0 || item.credit_amount > 0
                          ? 'plain'
                          : 'underlined'
                      "
                      autocomplete="off"
                      :disabled="item.account_code == null"
                      @update:model-value="handleAmountChange(item, 'credit')"
                    />
                  </td>
                  <td class="pr-0">
                    <VBtn
                      v-if="index + 1 != formData.transactions.length"
                      icon="tabler-trash"
                      rounded
                      color="error"
                      variant="text"
                      @click="removeTransitionRow(index)"
                    />
                  </td>
                </tr>
              </template>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3"></td>
                <td class="pr-0">
                  <VChip
                    size="x-large"
                    :color="
                      totalDebit == 0 && totalCredit == 0
                        ? ''
                        : totalDebit == totalCredit
                          ? 'success'
                          : 'error'
                    "
                    class="w-100"
                  >
                    <h2>{{ formatCurrency(totalDebit) }}</h2>
                  </VChip>
                </td>
                <td class="pr-0">
                  <VChip
                    size="x-large"
                    :color="
                      totalDebit == 0 && totalCredit == 0
                        ? ''
                        : totalDebit == totalCredit
                          ? 'success'
                          : 'error'
                    "
                    class="w-100"
                  >
                    <h2>{{ formatCurrency(totalCredit) }}</h2>
                  </VChip>
                </td>
                <th style="width: 10px"></th>
              </tr>
            </tfoot>
          </VTable>
        </div>
      </VCol>
    </VRow>
  </AppCard>
</template>

<style lang="scss" scoped>
@media (max-width: 768px) {
  .insert-table {
    width: 1100px !important;
  }
}
</style>
