<script setup>
import AccountTypeList from "@/views/accounting/account-types/AccountTypeList.vue";

definePage({
  meta: {
    title: "Account Types",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-account-types",
  },
});
</script>

<template>
  <AccountTypeList />
</template>
