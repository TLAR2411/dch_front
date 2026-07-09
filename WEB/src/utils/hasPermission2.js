import {auth} from "/src/plugins/auth.js";

function hasPermission2(requiredPermission) {
    const userPermissions = auth()?.permissions || [];

    if (Array.isArray(requiredPermission)) {
        // Check if user has **any** of the required permissions
        return requiredPermission.some((perm) =>
            userPermissions.some((userPerm) => userPerm.name === perm)
        );
    } else {
        // Single permission check
        return userPermissions.some((userPerm) => userPerm.name === requiredPermission);
    }
}
export default hasPermission2;
