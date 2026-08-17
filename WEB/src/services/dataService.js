import { api } from "@/utils/api";
import { allWeekdays } from "@/services/api/weekday";
import { app } from "@/utils/app";

export const getTables = async () => {
    try {
        const response = await api.post("tables-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getItemOptions = async () => {
    try {
        const response = await api.post("item-options-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getItemSizes = async () => {
    try {
        const response = await api.post("item-sizes-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getCategories = async () => {
    try {
        const response = await api.post("categories-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};
export const getApproveRanks = async () => {
    try {
        const response = await api.post("approve-ranks-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};
export const getVendors = async () => {
    try {
        const response = await api.post("vendors-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getPeople = async () => {
    try {
        const response = await api.post("people-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getJournalClasses = async () => {
    try {
        const response = await api.post("journal-classes-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getAccountants = async () => {
    try {
        const response = await api.post("accountants-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getIdentities = async () => {
    try {
        const response = await api.post("identities-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getPositions = async () => {
    try {
        const response = await api.post("positions-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getDepartments = async () => {
    try {
        const response = await api.post("departments-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getCurrencies = async () => {
    try {
        const response = await api.post("currencies-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getRoles = async () => {
    try {
        const response = await api.post("roles-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getPermissions = async () => {
    try {
        const response = await api.post("permissions-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getMenuItems = async () => {
    try {
        const response = await api.post("menu-items-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getUsers = async () => {
    try {
        const response = await api.post("users-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getCo = async () => {
    try {
        const response = await api.post("users-get-co");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getApprover = async () => {
    try {
        const response = await api.post("users-get-approver");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getCashDenominationPurposes = async () => {
    try {
        const response = await api.post("cash-denomination-purposes-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getOccupations = async () => {
    try {
        const response = await api.post("occupations-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getMainSourceIncomes = async () => {
    try {
        const response = await api.post("main-source-incomes-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getClients = async () => {
    try {
        const response = await api.post("clients-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getClientsNonLoans = async () => {
    try {
        const response = await api.post("clients-all-non-loans");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};



export const getLoanDurations = async () => {
    try {
        const response = await api.post("loan-durations-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};


export const getLoanTerms = async () => {
    try {
        const response = await api.post("loan-terms-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getLoanRepayments = async () => {
    try {
        const response = await api.post("loan-repayments-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};
export const getBank = async () => {
    try {
        const response = await api.post("bank-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getRestructureSettings = async () => {
    try {
        const response = await api.post("restructure-settings-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getReceiveDays = async () => {
    try {
        const response = await api.post("receive-days-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getBadDebtStatuses = async () => {
    try {
        const response = await api.post("bad-debt-statuses-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getBadDebtDays = async () => {
    try {
        const response = await api.post("bad-debt-days-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getFollowUpStatuses = async () => {
    try {
        const response = await api.post("follow-up-statuses-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getFollowUpDays = async () => {
    try {
        const response = await api.post("follow-up-days-all");
        return response.data.data;
    } catch (error) {
        console.error("Server error: ", error);
        return [];
    }
};

export const getYears = async () => {
    try {
        return app()?.years || [];
    } catch (error) {
        console.error("Server years error: ", error);
    }
}

export const getCurriculums = async () => {
    try {
        const response = await api.post("curriculums-all");
        return response.data.data.data;
    } catch (error) {
        console.error("Server curriculums error: ", error);
    }
}

export const getCurriculumsAssignments = async () => {
    try {
        const response = await api.post("curriculums-assignments-all");
        return response.data.data.data;
    } catch (error) {
        console.error("Server curriculums assignments error: ", error);
    }
}

export const getBranches = async () => {
    try {
        const response = await api.post("branches-all");
        return response.data.data.data;
    } catch (error) {
        console.error("Server branches error: ", error);
    }
}

export const getGrades = async () => {
    try {
        const response = await api.post("grades-all");
        return response.data.data;
    } catch (error) {
        console.error("Server grades error: ", error);
    }
}

export const getRooms = async () => {
    try {
        const response = await api.post("rooms-all");
        return response.data.data.data;
    } catch (error) {
        console.error("Server rooms error: ", error);
    }
}

export const getSubjects = async () => {
    try {
        const response = await api.post("subjects-all");
        return response.data.data;
    } catch (error) {
        console.error("Server subjects error: ", error);
    }
}

export const getTeacher = async () => {
    try {
        const response = await api.post("teachers-all");
        return response.data.data;
    } catch (error) {
        console.error("Server teachers error: ", error);
    }
}


export const getTerms = async (yearId) => {

    console.log(yearId);
    try {
        const response = await api.post("academics-periods-all", {
            year_id: yearId
        });
        return response.data.data;
    } catch (error) {
        console.error("Server academics periods error: ", error);
    }
}


export const getClasses = async () => {
    try {
        const response = await api.post("classes-all");
        return response.data.data ?? [];
    } catch (error) {
        // Let callers ignore aborted in-flight reloads instead of wiping a
        // good list with `|| []`.
        if (
            error?.code === "ERR_CANCELED" ||
            error?.name === "CanceledError" ||
            error?.message === "canceled"
        ) {
            return null;
        }
        console.error("Server classes error: ", error);
        return [];
    }
}
export const getWeekdays = async () => {
    try {
        return (await allWeekdays()) ?? [];
    } catch (error) {
        // Returns [] rather than null. Every caller treats this as a list and
        // reads .length or .find on it, so null turned one transient API 500
        // into a hard TypeError that killed the whole page. /api/weekday-all
        // does intermittently crash on Vercel today, so this path is live, not
        // theoretical.
        console.error("Server weekdays error:", error);
        return [];
    }
};


