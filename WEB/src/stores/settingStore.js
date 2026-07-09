import { get } from "@vueuse/core";
import { defineStore } from "pinia";

export const useSettingStore = defineStore("setting", {
  state: () => ({
    branch_id: null,
    branch_symbol: null,
    branch_province_code: null,
  }),

  getters: {
    getBranchId() {
      return this.branch_id;
    },
    getBranchSymbol() {
      return this.branch_symbol;
    },
    getBranchProvinceCode() {
      return this.branch_province_code;
    },
    getCurriculum() {
      return this.curriculum;
    }
  },

  actions: {
    setBranchId(id) {
      this.branch_id = id;
    },
    setBranchSymbol(symbol) {
      this.branch_symbol = symbol;
    },
    setBranchProvinceCode(code) {
      this.branch_province_code = code;
    },
    setCurriculum(id) {
      this.curriculum = id;
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: "app",
        storage: localStorage,
      },
    ],
  },
});
