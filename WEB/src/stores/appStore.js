import { defineStore } from "pinia";
import { api } from "@/utils/api";

export const useAppStore = defineStore("app", {
  state: () => ({
    villages: [],
    communes: [],
    districts: [],
    provinces: [],
    years: [],
    // accountTypes: [],
    // chartAccounts: [],
    // activeChartAccounts: [],
    isHaveData: false,
    _appStorePromise: null,
  }),
  actions: {
    async getProvinces() {
      try {
        const response = await api.get("provinces");

        this.$patch({
          provinces: response.data.data,
        });
      } catch (error) {
        console.error("Server error: ", error);
      }
    },
    async getDistricts() {
      try {
        const response = await api.get("districts");
        this.$patch({
          districts: response.data.data,
        });
      } catch (error) {
        console.error("Server error: ", error);
      }
    },
    async getCommunes() {
      console.log("hello commune")
      try {
        const response = await api.get("communes");
        this.$patch({
          communes: response.data.data,
        });
      } catch (error) {
        console.error("Server error: ", error);
      }
    },
    async getVillages() {
      try {
        const response = await api.get("villages");
        this.$patch({
          villages: response.data.data,
        });
      } catch (error) {
        console.error("Server error: ", error);
      }
    },

    async getYears() {
      try {
        const response = await api.post("years-all");
        this.$patch({
          years: response.data.data.data,
        });
      } catch (error) {
        console.error("Server error: ", error);
      }
    },


    // Get All App Store — one in-flight fetch; overlapping callers share it
    async getAllAppStore(forceUpdate = false) {
      if (this.isHaveData && !forceUpdate) return;
      if (this._appStorePromise && !forceUpdate) return this._appStorePromise;

      this._appStorePromise = this.getAppStore()
        .then(() => {
          this.isHaveData = true;
        })
        .finally(() => {
          this._appStorePromise = null;
        });

      return this._appStorePromise;
    },
    async getAppStore() {
      await Promise.all([
        this.getVillages(),
        this.getCommunes(),
        this.getDistricts(),
        this.getProvinces(),
        this.getYears()
      ]);
      // this.getAccountTypes();
      // this.getChartAccounts();
    },
    async clearAllAppStore() {
      this._appStorePromise = null;
      this.$patch({
        villages: [],
        communes: [],
        districts: [],
        provinces: [],
        years: [],
        // accountTypes: [],
        // chartAccounts: [],
        // activeChartAccounts: [],
        isHaveData: false,
      });
    },
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
