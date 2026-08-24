import { defineStore } from "pinia";
import { api } from "@/utils/api";
import { router } from "@/router/index";
import { useAppStore } from "@/stores/appStore";
import { useSettingStore } from "./settingStore";
import { usePartStore } from "./partStore";
import { useYearStore } from "./yearStore";
import { decrypt } from "@/utils/encrypteData";
import { getAccessToken, removeAccessToken, setAccessToken } from "@/utils/accessToken";
import { supabase } from "@/utils/supabase";
import { getPartHomeRoute } from "@/utils/partHomeRoutes";

const PART_PERMISSIONS = {
  khmer: "allow-part-khmer",
  english: "allow-part-english",
  chinese: "allow-part-chinese",
  admin: "allow-part-admin",
};

const resolveAccessiblePart = (preferredPart, permissions = [], currentPart = null) => {
  const allowedParts = Object.entries(PART_PERMISSIONS)
    .filter(([, permission]) => permissions.includes(permission))
    .map(([part]) => part);

  if (preferredPart && allowedParts.includes(preferredPart)) return preferredPart;
  if (currentPart && allowedParts.includes(currentPart)) return currentPart;

  return allowedParts[0] ?? null;
};

const getDefaultAuthenticatedRoute = (part, permissions = []) => {
  if (part && ["admin", "khmer", "english", "chinese"].includes(part)) {
    // Lands on the part dashboard if permitted, otherwise the first
    // sidebar page the user has permission to view.
    return getPartHomeRoute(part, permissions);
  }

  return { path: "/" };
};

export const useAuthStore = defineStore("auth", {
  state: () => {
    // const token = getAccessToken();
    const token = localStorage.getItem("accessToken");
    return {
      id: null,
      isAuthenticated: !!token,
      user: null,
      accessToken: token || null,
      refreshToken: null,
      isTokenRefreshing: false,
      permissions: [],
      branches: [],
      isBootstrapped: false,
      googleId: null,
    }
  },


  actions: {
    async login(payload) {
      try {
        const response = await api.post("login", {
          ...payload,
        },
          {               // Third argument: The config object
            headers: {
              'X-CLIENT-ID': import.meta.env.VITE_CLIENT_ID,
            }
          }
        );

        const redirectTo = `${window.location.origin}/login`;
        console.log("Redirecting to Google OAuth with redirectTo:", redirectTo);

        if (response.data.status) {

          const data = response.data.data;
          const token = data.access_token;
          setAccessToken(token);

          this.$patch({
            isAuthenticated: true,
            accessToken: response.data.data.access_token,
            refreshToken: response.data.data.refresh_token,
            isTokenRefreshing: false,
          });

          await this.bootstrap(token);
          const defaultPart = resolveAccessiblePart(
            response?.data?.data?.default_part,
            this.permissions,
            usePartStore().system_part,
          );
          const defaultBranch = response?.data?.data?.default_branch;
          if (defaultPart) {
            usePartStore().setSystemPart(defaultPart);
          }
          useSettingStore().setBranchId(defaultBranch);
          router.push(getDefaultAuthenticatedRoute(defaultPart, this.permissions));
        } else {
          console.error("Login failed with status:", response.data.status);
        }
      } catch (error) {
        console.error("Login error:", error);
      }
    },

    /**
     * After OAuth redirect, Supabase restores the session on the return URL.
     * Call on mount (e.g. login page), not immediately after signInWithOAuth.
     */
    async getSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("getSession failed:", error.message);
        return;
      }

      if (data.session) {
        const token = {
          value: data.session.access_token,
          expiry: data.session.expires_at,
        }
        this.googleId = data.session.user.id;
        setAccessToken(token);

        console.log("token-session:", token);
        const redirectTo = `${window.location.origin}/login`;
        console.log("Redirecting to Google OAuth with redirectTo:", redirectTo);


        this.$patch({
          isAuthenticated: true,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          isTokenRefreshing: false,
        });

        await this.bootstrap(token);
        const defaultPart = resolveAccessiblePart(
          usePartStore().system_part,
          this.permissions,
          usePartStore().system_part,
        );
        if (defaultPart) {
          usePartStore().setSystemPart(defaultPart);
        }
        router.replace(getDefaultAuthenticatedRoute(defaultPart, this.permissions));
      }
    },

    async bootstrap(accessToken = null) {
      const token = accessToken ?? getAccessToken();

      if (!token) {
        return this.unAuthenticated();
      }

      try {
        // "/api/auth/verify-session", not "/auth/...". Every other call site
        // in the app (58 of them) includes the /api prefix and VITE_API_URL is
        // the bare origin. This one was the sole exception, which forced
        // VITE_API_URL to carry a trailing /api to keep login working — and
        // that in turn doubled every other path into /api/api/...

        const response = await api.post("/api/auth/verify-session", {
          google_id: this.googleId,
        });


        console.log("verify-session:", response.data.data.branches);
        if (response.data.success == true || response.data.success == 'true') {
          const branches = response.data.data.branches;
          const permissions = response.data.data.permissions;
          const userData = response.data.data.user;
          const partStore = usePartStore();

          // Prefer the part already selected (sessionStorage / URL), not the
          // user's saved default_part — otherwise a refresh jumps back to Admin.
          const defaultPart = resolveAccessiblePart(
            partStore.system_part,
            permissions,
            response?.data?.data?.default_part,
          );
          const defaultBranch = response?.data?.data?.default_branch;
          console.log("defaultPart:", defaultPart);
          const settingStore = useSettingStore()
          if (defaultPart && partStore.system_part !== defaultPart) {
            partStore.setSystemPart(defaultPart);
          }

          await useAppStore().getAllAppStore();

          // Patch branches before setting branch_id so NavbarBranches can resolve
          // the selected item's title on first sign-in (not just the raw id).
          this.$patch({
            id: userData?.id ?? null,
            user: userData ?? [],
            branches: branches ?? [],
            permissions: permissions ?? [],
            isAuthenticated: true,
            accessToken: token,
          });

          if (!settingStore.branch_id && defaultBranch != null && defaultBranch !== "") {
            settingStore.setBranchId(defaultBranch);
          }
        }
      } catch (error) {
        console.error("Verify user error:", error);
        if (error.code === 'ERR_CANCELED' || error.message === 'canceled') {
          return;
        }
        // Auth failures and unexpected server errors should not leave a
        // half-bootstrapped session with empty permissions.
        if (!error.response || error.response?.status === 401 || error.response?.status >= 500) {
          await this.unAuthenticated();
        }
      } finally {
        this.isBootstrapped = true;
      }
    },

    async bootstrap1(accessToken = null) {
      const token = accessToken ?? getAccessToken();

      if (!token) {
        return this.unAuthenticated();
      }

      try {
        const response = await api.get('bootstrap');
        if (response.data.a) {
          const userData = decrypt(response.data.b);
          const branches = decrypt(response.data.c);
          const permissions = decrypt(response.data.d);

          console.log(userData);
          console.log(branches);
          console.log(permissions);

          this.$patch({
            id: userData.id,
            user: userData,
            branches: branches,
            permissions: permissions,
            isAuthenticated: true,
            accessToken: token, // Sync token just in case
          });
        }
      } catch (error) {
        if (error.code === 'ERR_CANCELED' || error.message === 'canceled') {
          return;
        }
        if (error.response?.status === 401) {
          await this.unAuthenticated();
        }
      } finally {
        this.isBootstrapped = true;
      }
    },
    async logout() {
      // Always clear the client session, even if the API/revoke call fails.
      try {
        await api.post("/api/auth/logout");
      } catch (error) {
        console.error("Logout API error:", error);
      }

      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Supabase signOut error:", error);
      }

      await this.clearSessionAndRedirect();
    },

    async clearSessionAndRedirect() {
      try {
        useSettingStore().$patch({
          branch_id: null,
          branch_symbol: null,
          branch_province_code: null,
        });
        usePartStore().$patch({
          system_part: null,
          cur_id: null,
        });
        useYearStore().$patch({
          year_id: null,
        });
        useAppStore().clearAllAppStore();
      } catch (error) {
        console.error("Store reset error:", error);
      }

      this.$patch({
        id: null,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        isTokenRefreshing: false,
        permissions: [],
        branches: [],
        isBootstrapped: false,
        googleId: null,
      });

      removeAccessToken();
      localStorage.removeItem("accessToken");
      localStorage.clear();
      sessionStorage.clear();

      router.replace({ name: "login" });
    },

    async unAuthenticated() {
      await this.clearSessionAndRedirect();
    },
  }
});
