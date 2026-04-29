import { useAuthStore } from '../stores/auth.js';

export function useAuth() {
  const authStore = useAuthStore();

  return {
    authStore
  };
}
