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
      // Keep "*" as string; coerce numeric branch ids so VSelect can match
      // item-value (number) after first login when API sends default_branch as text.
      if (id == null || id === "") {
        this.branch_id = null;
        return;
      }
      if (id === "*") {
        this.branch_id = "*";
        return;
      }
      const n = Number(id);
      this.branch_id = Number.isFinite(n) ? n : id;
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
    key: "setting",
    storage: localStorage,
  },
});
