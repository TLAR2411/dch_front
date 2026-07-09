import { defineStore } from "pinia";
import { api } from "@/utils/api";
import { router } from "@/router/index";
import { useAppStore } from "@/stores/appStore";
import { useSettingStore } from "./settingStore";
import { usePartStore } from "./partStore";
import { decrypt } from "@/utils/encrypteData";
import { getAccessToken, removeAccessToken, setAccessToken } from "@/utils/accessToken";
import { supabase } from "@/utils/supabase";

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

          useAppStore().getAllAppStore();

          await this.bootstrap(token);
          const defaultPart = response?.data?.data?.default_part;
          const defaultBranch = response?.data?.data?.default_branch;
          usePartStore().setSystemPart(defaultPart);
          useSettingStore().setBranchId(defaultBranch);

          let redirectTo = null;
          if (defaultPart === 'loan') {
            redirectTo = "/loan";
          } else if (defaultPart === 'human-resource') {
            redirectTo = "/hr";
          } else if (defaultPart === 'admin') {
            redirectTo = "/admin";
          } else if (defaultPart === 'accounting') {
            redirectTo = "/accounting";
          } else if (defaultPart === 'pos') {
            redirectTo = "/pos";
          } else if (defaultPart === 'stock') {
            redirectTo = "/stock";
          } else {
            redirectTo = "/";
          }

          router.push(redirectTo);
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

        this.$patch({
          isAuthenticated: true,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          isTokenRefreshing: false,
        });

        useAppStore().getAllAppStore();
        await this.bootstrap(token);
      }
    },

    async bootstrap(accessToken = null) {
      const token = accessToken ?? getAccessToken();

      if (!token) {
        return this.unAuthenticated();
      }

      try {
        const response = await api.post("/auth/verify-session", {
          google_id: this.googleId,
        });
        console.log("verify-session:", response.data.data.branches);
        if (response.data.success == true || response.data.success == 'true') {
          const branches = response.data.data.branches;
          const permissions = response.data.data.permissions;
          const userData = response.data.data.user;

          const defaultPart = response?.data?.data?.default_part;
          const defaultBranch = response?.data?.data?.default_branch;
          console.log("defaultPart:", defaultPart);
          // usePartStore().setSystemPart(defaultPart);
          const partStore = usePartStore();
          const settingStore = useSettingStore()
          if (!partStore.system_part) {
            partStore.setSystemPart(defaultPart);
          }

          if (!settingStore.branch_id) {
            useSettingStore().setBranchId(defaultBranch);
          }

          useAppStore().getAllAppStore();


          this.$patch({
            id: userData?.id ?? null,
            user: userData ?? [],
            branches: branches ?? [],
            permissions: permissions ?? [],
            isAuthenticated: true,
            accessToken: token,
          });

          if (!token) {
            let redirectTo = null;
            if (defaultPart === 'admin') {
              redirectTo = "/admin";
            } else if (defaultPart === 'khmer') {
              redirectTo = "/khmer";
            } else if (defaultPart === 'english') {
              redirectTo = "/english";
            } else if (defaultPart === 'chinese') {
              redirectTo = "/chinese";
            } else {
              redirectTo = "/";
            }

            router.push(redirectTo);
          }
        }
      } catch (error) {
        console.error("Verify user error:", error);
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
      try {
        const response = await api.post("logout");

        if (response.data.status) {

          useSettingStore().branch_id = null;
          useAppStore().clearAllAppStore();

          this.unAuthenticated();
        }
      } catch (error) {
        console.error("Server error:", error);
      }
    },

    async unAuthenticated() {
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
      });

      removeAccessToken();
      router.replace({ name: 'login' });
    },
  }
});
