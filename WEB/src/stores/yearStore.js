import { defineStore } from "pinia";

export const useYearStore = defineStore("year", {
    state: () => ({
        year_id: null
    }),

    getters: {
        getYearId() {
            return this.year_id;
        }
    },

    actions: {
        setYearId(id) {
            this.year_id = id;
        }
    },


    persist: {
        storage: sessionStorage,
    },

})