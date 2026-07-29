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

/**
 * Uploads a signature image and resolves to `{ url, path }`.
 *
 * The storage path is composed server-side from the caller's own branch; only
 * `side` travels, and it is checked against an allow-list. The browser used to
 * choose the whole path, which is how any holder of the publishable key could
 * overwrite or delete another branch's signature.
 *
 * Content-Type is cleared deliberately: the axios instance defaults to
 * application/json, and multipart needs the boundary the adapter generates.
 * Sending it as JSON makes multer see no file and the endpoint 422.
 */
export const uploadSignature = ({ side, blob, filename = "signature.png" }) => {
  const body = new FormData();
  body.append("side", side);
  body.append("file", blob, filename);
  return api
    .post("/api/report-signatures-upload", body, {
      headers: { "Content-Type": undefined },
    })
    .then((r) => r.data.data);
};
