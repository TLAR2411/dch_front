import { auth } from "/src/utils/auth.js";

/**
 * Session permission keys:
 * - Most permissions: the DB `name` as-is ("add-students", "allow-part-khmer")
 * - view-page / view-data: "group:name" ("students:view-page", "students:view-data")
 *
 * Use viewPage(group) / viewData(group) when wiring nav, routes, or checks.
 */
export function viewPage(group) {
  return `${group}:view-page`;
}

export function viewData(group) {
  return `${group}:view-data`;
}

function hasPermission(requiredPermission) {
  const userPermissions = auth()?.permissions || [];

  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some((perm) => userPermissions.includes(perm));
  }

  return userPermissions.includes(requiredPermission);
}

export default hasPermission;
