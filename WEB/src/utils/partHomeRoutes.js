export const PART_DASHBOARD_ROUTES = {
  admin: "admin-dashboards",
  khmer: "khmer-dashboard",
  english: "english-dashboard",
  chinese: "chinese-dashboard",
};

export const getPartDashboardRoute = (part) =>
  PART_DASHBOARD_ROUTES[part] ?? "global-dashboard";
