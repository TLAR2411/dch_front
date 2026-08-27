import { useAuthStore } from "@/stores/authStore";

const STORAGE_KEY = "dewey-page-tours-seen";

function getUserKey() {
  const auth = useAuthStore();
  return String(auth.id || auth.user?.id || "anonymous");
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function hasSeenPageTour(tourId) {
  const all = readAll();
  const userKey = getUserKey();
  return Boolean(all[userKey]?.[tourId]);
}

export function markPageTourSeen(tourId) {
  const all = readAll();
  const userKey = getUserKey();
  if (!all[userKey]) all[userKey] = {};
  all[userKey][tourId] = true;
  writeAll(all);
}
