import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { login as loginRequest } from './auth.service';
import type { AuthUser, LoginPayload } from './interfaces/auth.interface';

// Key 'token' is also read by the axios request interceptor (src/api/axios-client.ts).
const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'auth_user';

function readStoredUser(): AuthUser | null {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);

  if (rawUser === null) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  // --- State (rehydrated from localStorage so the session survives reloads) ---
  const token = ref<string | null>(localStorage.getItem(TOKEN_STORAGE_KEY));
  const user = ref<AuthUser | null>(readStoredUser());

  // --- Getters ---
  const isAuthenticated = computed<boolean>(() => token.value !== null);

  /**
   * Whether the logged-in user's role has the given module permission
   * (a `clavePermiso` id from config/module-catalog.ts). Used to gate
   * routes (router/index.ts) and sidebar items (DashboardLayout.vue).
   */
  function hasPermission(clavePermiso: string): boolean {
    return user.value?.permisos?.some((permiso) => permiso.clavePermiso === clavePermiso) ?? false;
  }

  // --- Actions ---
  async function login(payload: LoginPayload): Promise<void> {
    const response = await loginRequest(payload);

    token.value = response.accessToken;
    user.value = response.user;

    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
  }

  function logout(): void {
    token.value = null;
    user.value = null;

    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  return {
    token,
    user,
    isAuthenticated,
    hasPermission,
    login,
    logout,
  };
});
