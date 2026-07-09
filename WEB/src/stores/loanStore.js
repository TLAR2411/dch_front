import { api } from "@/utils/api";
import { defineStore } from "pinia";

export const useLoanStore = defineStore("loan", {
    state: () => ({
        approvalCount: 0,
        isLoading: false,
    }),

    actions: {
        // The action now accepts a branch_id
        async fetchApprovalCount() {

            this.isLoading = true;
            try {
                const response = await api.post('loans-approve-count');
                if (response.data.status) {
                    this.approvalCount = response.data.data;
                } else {
                    // Handle cases where the API returns status: false
                    console.error('API returned an error:', response.data.message);
                    this.approvalCount = 0;
                }

            } catch (error) {
                console.error('Failed to fetch loan approval count:', error);
                this.approvalCount = 0; // Reset count on failure
            } finally {
                this.isLoading = false;
            }
        },
    },
});
