/**
 * Responsibility: Owns auth session state, refresh rotation, profile sync, and the `useAuth` API for the frontend.
 */
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { apiClient, registerAuthHandlers } from "../lib/api";
import type { AuthResponse, UserResponse } from "../types/api";
import type {
  AuthSession,
  AuthStatus,
  AuthUser,
  LoginCredentials,
  ProfileUpdateInput,
  RegisterInput,
} from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  refreshSession: () => Promise<string | null>;
  refreshProfile: () => Promise<AuthUser>;
  updateProfile: (input: ProfileUpdateInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const authStorageKey =
  import.meta.env.VITE_AUTH_STORAGE_KEY?.trim() || "shopsphere.auth.session";

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const sessionRef = useRef<AuthSession | null>(null);

  const persistSession = (nextSession: AuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);

    if (nextSession) {
      window.localStorage.setItem(authStorageKey, JSON.stringify(nextSession));
      setStatus("authenticated");
      return;
    }

    window.localStorage.removeItem(authStorageKey);
    setStatus("guest");
  };

  const applyAuthResponse = (payload: AuthResponse) => {
    const nextSession = {
      accessToken: payload.accessToken,
      user: payload.user,
    };

    persistSession(nextSession);

    return payload.accessToken;
  };

  const mergeUserIntoSession = (user: AuthUser) => {
    const currentSession = sessionRef.current;

    if (currentSession) {
      persistSession({
        ...currentSession,
        user,
      });
    }

    return user;
  };

  const refreshSession = async () => {
    const { data } = await apiClient.post<AuthResponse>(
      "/auth/refresh",
      undefined,
      {
        skipAuthRefresh: true,
      },
    );

    return applyAuthResponse(data);
  };

  const refreshProfile = async () => {
    const { data } = await apiClient.get<UserResponse>("/users/me");
    return mergeUserIntoSession(data.user);
  };

  const updateProfile = async (input: ProfileUpdateInput) => {
    const { data } = await apiClient.patch<UserResponse>("/users/me", input);
    return mergeUserIntoSession(data.user);
  };

  useEffect(() => {
    const storedSession = window.localStorage.getItem(authStorageKey);
    let hasStoredSession = false;

    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession) as AuthSession;
        persistSession(parsedSession);
        hasStoredSession = true;
      } catch {
        window.localStorage.removeItem(authStorageKey);
      }
    }

    void refreshSession().catch(() => {
      if (!hasStoredSession) {
        persistSession(null);
      }
    });
  }, []);

  useEffect(() => {
    registerAuthHandlers({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      refreshSession,
      onAuthFailure: () => {
        persistSession(null);
      },
    });

    return () => {
      registerAuthHandlers(null);
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const { data } = await apiClient.post<AuthResponse>("/auth/login", credentials, {
      skipAuthRefresh: true,
    });

    applyAuthResponse(data);
  };

  const register = async (input: RegisterInput) => {
    await apiClient.post(
      "/auth/register",
      input,
      {
        skipAuthRefresh: true,
      },
    );

    await login({
      email: input.email,
      password: input.password,
    });
  };

  const logout = async () => {
    try {
      await apiClient.post(
        "/auth/logout",
        undefined,
        {
          skipAuthRefresh: true,
        },
      );
    } finally {
      persistSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        accessToken: session?.accessToken ?? null,
        status,
        isAdmin: session?.user.role === "ADMIN",
        login,
        register,
        refreshSession,
        refreshProfile,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
};
