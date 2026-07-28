import { api } from "@/utils/api";

/**
 * Replaces supabase.from("report_signatures") in footerRepor.vue.
 *
 * show() resolves to null when no row exists yet — the replaced call used
 * .maybeSingle(), so absence is normal on first open, not an error.
 * branch_id is taken from the caller's entitlement server-side; do not send it.
 */
export const showReportSignatures = () =>
  api.post("/api/report-signatures-show", {}).then((r) => r.data.data);

export const saveReportSignatures = (payload) =>
  api.post("/api/report-signatures-upsert", payload).then((r) => r.data.data);
