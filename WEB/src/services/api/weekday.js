import { api } from "@/utils/api";

/** Replaces supabase.from("weekday") in services/dataService.js. */
export const allWeekdays = () =>
  api.post("/api/weekday-all", {}).then((r) => r.data.data);
