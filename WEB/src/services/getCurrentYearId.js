import { useYearStore } from "@/stores/yearStore";
export function getCurrentYearId() {
    const yearStore = useYearStore();
    return yearStore.year_id;
}