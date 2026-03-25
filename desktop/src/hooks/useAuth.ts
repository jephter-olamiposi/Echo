import { useState, useEffect, useCallback } from "react";
import { getAuthToken, saveAuthToken, removeAuthToken } from "../api";

export type AuthView = "login" | "register" | "main" | "onboarding";

export interface UseAuthReturn {
  token: string | null;
  email: string | null;
  view: AuthView;
  isLoading: boolean;
  setView: (view: AuthView) => void;
  handleAuthSuccess: (newToken: string, newEmail: string) => Promise<void>;
  logout: () => Promise<void>;
  handleOnboardingComplete: () => void;
}

export function useAuth(
  onAuthSuccess?: () => void,
  onLogoutSideEffects?: () => void | Promise<void>
): UseAuthReturn {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [view, setView] = useState<AuthView>("onboarding");
  const [isLoading, setIsLoading] = useState(true);

  // Restore persisted auth state on mount.
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = await getAuthToken();
        const storedEmail = localStorage.getItem("echo_email");
        const onboardingComplete =
          localStorage.getItem("echo_onboarding_complete") === "true";

        setToken(storedToken);
        setEmail(storedEmail);

        if (!onboardingComplete) {
          setView("onboarding");
        } else if (storedToken) {
          setView("main");
        } else {
          setView("login");
        }
      } catch {
        setView("login");
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const handleAuthSuccess = useCallback(
    async (newToken: string, newEmail: string) => {
      await saveAuthToken(newToken);
      localStorage.setItem("echo_email", newEmail);
      setToken(newToken);
      setEmail(newEmail);
      setView("main");
      onAuthSuccess?.();
    },
    [onAuthSuccess]
  );

  const logout = useCallback(async () => {
    await onLogoutSideEffects?.();
    await removeAuthToken();
    localStorage.removeItem("echo_email");
    setToken(null);
    setEmail(null);
    setView("login");
  }, [onLogoutSideEffects]);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem("echo_onboarding_complete", "true");
    setView("login");
  }, []);

  return {
    token,
    email,
    view,
    isLoading,
    setView,
    handleAuthSuccess,
    logout,
    handleOnboardingComplete,
  };
}
