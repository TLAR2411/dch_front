import { useAuthStore } from "@/stores/authStore";
import hasPermission from "@/utils/hasPermission";
// import { useLoanStore } from "@/stores/loanStore";
import { useSettingStore } from "@/stores/settingStore";
import { getI18n } from '@/plugins/i18n';
import { usePartStore } from "@/stores/partStore";
import { getAccessToken } from "@/utils/accessToken";
// import { useCookie } from "#imports";
const { t } = getI18n().global;
export const setupGuards = (router) => {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    const part = usePartStore()
    const setting = useSettingStore()
    // const loan = useLoanStore()

    document.title = t(to?.meta?.title || "DCH");

    // 1. Get the token - use a fresh check
    const accessToken = getAccessToken();

    // 2. Bootstrap first so default_part from API is saved before URL-based sync
    if (accessToken && !auth.isBootstrapped) {
      try {
        await auth.bootstrap();
      } catch (error) {
        console.error("Bootstrap failed, likely invalid token:", error);
        localStorage.setItem('token', null); // Clear invalid cookie
        return { name: 'login' };
      }
    }

    // 3. Sync module from URL only for known path segments (do not overwrite with a fallback)
    const firstSegment = to.path.split("/")[1];
    const segmentMap = {
      admin: 'admin',
      khmer: 'khmer',
      english: 'english',
      chinese: 'chinese',
    };
    if (firstSegment && segmentMap[firstSegment] && !part.system_part) {
      part.setSystemPart(segmentMap[firstSegment]);
    }
    // if (firstSegment && segmentMap[firstSegment]) {
    //   part.setSystemPart(segmentMap[firstSegment]);
    // }

    // 4. Determine Login Status
    const isLoggedIn = Boolean(accessToken) || auth.isAuthenticated;

    // 5. Public Route Logic
    if (to.meta.public) return true;

    // 6. Redirect Logic
    if (!isLoggedIn) {
      if (to.name !== 'login') {
        return { name: 'login' };
      }
      return true;
    }

    if (to.meta.unauthenticatedOnly && isLoggedIn) {
      return { name: 'root' };
    }

    // 7. Permissions
    if (to.meta.permissions && !hasPermission(to.meta.permissions)) {
      return { name: "not-authorized" };
    }

    // 8. Background Data Fetching
    // if (setting.branch_id && isLoggedIn) {
    //   if (hasPermission('view-loans')) {
    //     loan.fetchApprovalCount();
    //   }
    // }

    return true;
  });
};
