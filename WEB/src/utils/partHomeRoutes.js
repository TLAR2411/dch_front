import adminNavItems from "@/navigation/vertical/admin";
import chineseNavItems from "@/navigation/vertical/chinese";
import englishNavItems from "@/navigation/vertical/english";
import khmerNavItems from "@/navigation/vertical/khmer";

export const PART_DASHBOARD_ROUTES = {
  admin: "admin-dashboards",
  khmer: "khmer-dashboard",
  english: "english-dashboard",
  chinese: "chinese-dashboard",
};

const PART_NAV_ITEMS = {
  admin: adminNavItems,
  khmer: khmerNavItems,
  english: englishNavItems,
  chinese: chineseNavItems,
};

export const getPartDashboardRoute = (part) =>
  PART_DASHBOARD_ROUTES[part] ?? "global-dashboard";

// Same visibility rule as VerticalNavLink.vue: empty permission = visible to all.
const isNavItemAllowed = (item, permissions) => {
  if (!item.permission) return true;
  if (Array.isArray(item.permission)) {
    return item.permission.some((perm) => permissions.includes(perm));
  }
  return permissions.includes(item.permission);
};

const findFirstAccessibleRoute = (items, permissions) => {
  for (const item of items) {
    if (!isNavItemAllowed(item, permissions)) continue;
    if (item.to) return item.to;
    if (item.children?.length) {
      const childRoute = findFirstAccessibleRoute(item.children, permissions);
      if (childRoute) return childRoute;
    }
  }
  return null;
};

/**
 * Resolve where a user should land for a given part: the part dashboard if
 * they can see it, otherwise the first sidebar item they have permission for.
 */
export const getPartHomeRoute = (part, permissions = []) => {
  const navItems = PART_NAV_ITEMS[part];
  if (navItems) {
    const route = findFirstAccessibleRoute(navItems, permissions);
    if (route) return route;
  }
  return { name: getPartDashboardRoute(part) };
};
