export const PART_DASHBOARD_ROUTES = {
  admin: "admin-dashboards",
  khmer: "global-dashboard",
  english: "global-dashboard",
  chinese: "global-dashboard",
};

export const getPartDashboardRoute = (part) =>
  PART_DASHBOARD_ROUTES[part] ?? "global-dashboard";
