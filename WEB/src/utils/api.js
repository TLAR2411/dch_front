import axios from "axios";
import { useAuthStore } from "@/stores/authStore";
import { useSettingStore } from "@/stores/settingStore";
import { useDialog } from '@/composable/useDialog';
import { getAccessToken } from "./accessToken";

import { usePartStore } from "@/stores/partStore";
import { useYearStore } from "@/stores/yearStore";


const pendingRequests = new Map();

// Endpoints that should NOT be cancelled (e.g., save/update operations)
const NON_CANCELLABLE_ENDPOINTS = [
  '/save',
  '/update',
  '/create',
  '/delete',
  '/upload'
];

/**
 * Generates a unique key for the request.
 * Includes method, URL, query params, body, AND scope headers — otherwise
 * parallel POSTs to the same path with different bodies (e.g.
 * grading-rule-layout per subject) OR the same body under a different
 * X-Branch-Id / X-Year-Id look identical and abort each other. That left
 * Score Entry / Attendance showing the previous branch's classes after a
 * navbar branch switch.
 */
const getRequestKey = (config) => {
  const params = config.params ? JSON.stringify(config.params) : "";

  let serializedData = "";
  if (config.data != null) {
    if (typeof config.data === "string") {
      serializedData = config.data;
    } else {
      try {
        serializedData = JSON.stringify(config.data);
      } catch {
        serializedData = "[non-serializable request data]";
      }
    }
  }

  const headers = config.headers || {};
  const branch = headers["X-Branch-Id"] ?? headers["x-branch-id"] ?? "";
  const year = headers["X-Year-Id"] ?? headers["x-year-id"] ?? "";
  const curriculum =
    headers["X-Curriculum-Id"] ?? headers["x-curriculum-id"] ?? "";
  return `${config.method}::${config.url}::${params}::${serializedData}::${branch}::${year}::${curriculum}`;
};

/**
 * Determines if a request should be cancellable based on its endpoint
 */
const isCancellable = (url) => {
  return !NON_CANCELLABLE_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

export const isRequestCanceled = (error) =>
  axios.isCancel(error) ||
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.message === "canceled";

/**
 * Cleanup pending request from the map
 */
const cleanupRequest = (config) => {
  if (config) {
    const key = getRequestKey(config);
    pendingRequests.delete(key);
  }
};

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}`,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    // This is to skip the ngrok browser warning
  },

  timeout: 30000, // 30 second timeout
});

api.interceptors.request.use((config) => {
  // Normalise every path to /api/... exactly once.
  //
  // Two conventions coexist here and they are mutually exclusive:
  //   - 59 call sites (the src/services/api/* layer) use "/api/weekday-all"
  //     and need VITE_API_URL to be the bare origin.
  //   - 219 call sites across 54 older files use a bare "years-all" and
  //     relied on VITE_API_URL carrying a trailing /api.
  // With the /api suffix the first group doubles into /api/api/... — the
  // "Cannot POST /api/api/academics-periods-terms" report. Without it, the
  // second group loses the prefix and 404s. There is no VITE_API_URL value
  // that satisfies both.
  //
  // Doing it here fixes both with one rule instead of 219 edits, and keeps
  // VITE_API_URL as the bare origin. It runs BEFORE the cancellation logic
  // below on purpose, so request keys are built from the final URL and the
  // same endpoint written both ways dedupes as one.
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    const path = config.url.replace(/^\/+/, "");
    config.url = path === "api" || path.startsWith("api/") ? `/${path}` : `/api/${path}`;
  }

  const settingStore = useSettingStore();
  const accessToken = getAccessToken();
  const part = usePartStore();
  const year = useYearStore();

  // --- AUTH & SCOPE HEADERS (before cancellation key) ---
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // config.headers['X-CLIENT-ID'] = import.meta.env.VITE_CLIENT_ID;
  config.headers['X-Branch-Id'] = settingStore.branch_id || "*";
  config.headers['X-Curriculum-Id'] = part.cur_id || "*";
  config.headers['X-Year-Id'] = year.year_id || '*';
  config.headers['X-Branch-Symbol'] = settingStore.branch_symbol || null;

  // --- DATA FORMATTING ---
  if (config.data instanceof FormData) {
    // Drop the instance default application/json so axios/browser can set
    // multipart/form-data with a boundary. Otherwise File fields serialize as
    // {} and multer never receives the upload.
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
    // For FormData, add branch ID if available
    if (settingStore.branch_id) {
      config.data.append("branchId", settingStore.branch_id);
    }
  } else {
    // For regular JSON payloads
    config.data = config.data || {};

    // Preserve filter object if it exists
    if (config.data.filter && typeof config.data.filter === 'object') {
      config.data.filter = { ...config.data.filter };
    }
  }

  // --- CANCELLATION LOGIC ---
  // Runs after headers/body so the key distinguishes branch/year scope.
  if (isCancellable(config.url)) {
    const requestKey = getRequestKey(config);

    // Cancel existing duplicate request
    if (pendingRequests.has(requestKey)) {
      const existingController = pendingRequests.get(requestKey);
      existingController.abort();
      pendingRequests.delete(requestKey);
    }

    // Create new abort controller
    const controller = new AbortController();
    config.signal = controller.signal;
    pendingRequests.set(requestKey, controller);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => {
    const { showDialog } = useDialog();
    // Cleanup completed request
    cleanupRequest(response.config);

    const { status, message } = response.data || {};

    // Handle success messages
    if (status === true && message) {
      showDialog({
        title: message,
        icon: 'success',
        isConfirm: false,
        timer: 3000
      });
    }
    // Handle API-level errors (when status is false or error codes)
    else if (status === false || [401, 404, 500].includes(response.data?.status)) {
      showDialog({
        title: message || "An error occurred",
        icon: 'error',
        isConfirm: false,
        timer: 5000
      });
      return Promise.reject(new Error(message || "Request failed"));
    }

    return response;
  },
  (error) => {
    // Handle cancelled requests silently (AbortController / axios v1 CanceledError)
    if (isRequestCanceled(error)) {
      console.debug("Request cancelled:", error.message);
      return Promise.reject(error);
    }

    // Cleanup failed request
    cleanupRequest(error.config);

    const authStore = useAuthStore();
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Connection Error";

    // Handle authentication errors
    if (statusCode === 401) {
      authStore.unAuthenticated();
    }

    // 409 duplicate_candidates is human-gated in create forms — don't toast over the confirm dialog.
    const isDuplicateCandidates =
      statusCode === 409 &&
      Array.isArray(error.response?.data?.data?.candidates);

    if (!isDuplicateCandidates) {
      const { showDialog } = useDialog();
      showDialog({
        title: errorMessage,
        icon: "error",
        isConfirm: false,
        timer: 4000,
      });
    }

    return Promise.reject(error);
  }
);

// Optional: Export cleanup function for manual use
export const cancelAllPendingRequests = () => {
  pendingRequests.forEach((controller) => {
    controller.abort();
  });
  pendingRequests.clear();
};