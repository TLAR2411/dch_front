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
 * Includes method, URL, and serialized params for better uniqueness.
 */
const getRequestKey = (config) => {
  const params = config.params ? JSON.stringify(config.params) : '';
  return `${config.method}::${config.url}::${params}`;
};

/**
 * Determines if a request should be cancellable based on its endpoint
 */
const isCancellable = (url) => {
  return !NON_CANCELLABLE_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

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
  const settingStore = useSettingStore();
  const accessToken = getAccessToken();
  const part = usePartStore();
  const year = useYearStore();

  // --- CANCELLATION LOGIC ---
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

  // --- AUTH & BRANCH HEADERS ---
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

    // Handle cancelled requests silently
    if (axios.isCancel(error)) {
      console.debug('Request cancelled:', error.message);
      return Promise.reject(error);
    }

    // Cleanup failed request
    cleanupRequest(error.config);

    const authStore = useAuthStore();
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message || "Connection Error";

    // Handle authentication errors
    if (statusCode === 401) {
      authStore.unAuthenticated();
    }

    // Show error dialog (skip for cancelled requests)
    if (!axios.isCancel(error)) {
      const { showDialog } = useDialog();
      showDialog({
        title: errorMessage,
        icon: 'error',
        isConfirm: false,
        timer: 4000
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