import { defineStore } from "pinia";
const PART_TO_CUR_ID = {
  english: 1,
  khmer: 2,
  chinese: 3,
  admin: null,
};

export const usePartStore = defineStore("part", {

  state: () => ({
    system_part: null,
    cur_id: null,
  }),

  getters: {
    getSystemPart() {
      return this.system_part
    },
    getCurId: (state) => state.cur_id,

  },

  actions: {
    setSystemPart(part) {
      this.system_part = part
      this.cur_id = PART_TO_CUR_ID[part] ?? null
    }

  },

  persist: {
    storage: sessionStorage, // Use sessionStorage instead of localStorage
  },
});
