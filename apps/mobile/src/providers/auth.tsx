import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { Platform } from "react-native";

import { api, type Me } from "@/lib/api";

/**
 * Who is signed in. The login itself happens before the app loads: the gallab hub
 * (Caddy + Google sign-in) only lets signed-in users reach kort.gallab.top, and the
 * server tells us who we are. "No session" means the server said 401.
 */
export interface Session {
  user: Me;
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const HUB_LOGOUT_URL = "https://auth.gallab.top/logout";

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const user = await api.me();
      setSession({ user });
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    setSession(null);
    if (Platform.OS === "web" && typeof window !== "undefined") window.location.href = HUB_LOGOUT_URL;
  }, []);

  return <AuthContext.Provider value={{ session, loading, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
