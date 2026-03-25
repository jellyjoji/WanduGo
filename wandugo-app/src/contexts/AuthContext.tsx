"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/utils/supabase/client";
import { supabase as dbClient } from "@/lib/supabase";
import {
  setSessionId,
  resetSessionId,
  setUserName,
  getUserName,
} from "@/lib/session";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  displayName: string;
  loading: boolean;
  showAuthModal: boolean;
  authModalTab: "login" | "signup";
  openAuthModal: (tab?: "login" | "signup") => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateUserMetaName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  displayName: "",
  loading: true,
  showAuthModal: false,
  authModalTab: "login",
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signIn: async () => null,
  signUp: async () => null,
  signOut: async () => {},
  updateUserMetaName: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "signup">("login");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        setSessionId(data.user.id);
        const name = data.user.user_metadata?.name || getUserName();
        if (name) {
          setUserName(name);
          setDisplayName(name);
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const incoming = session?.user ?? null;
      setUser(incoming);
      setLoading(false);
      if (incoming) {
        // Tie the localStorage session to this Supabase user
        setSessionId(incoming.id);
        const name = incoming.user_metadata?.name || getUserName();
        if (name) {
          setUserName(name);
          setDisplayName(name);
        }
        setShowAuthModal(false);
      } else {
        // User signed out — give them a fresh anonymous session
        resetSessionId();
        setDisplayName("");
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAuthModal = useCallback((tab: "login" | "signup" = "login") => {
    setAuthModalTab(tab);
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? error.message : null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      name: string,
    ): Promise<string | null> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (!error && data.user) {
        // Sync localStorage name immediately (before onAuthStateChange fires)
        setUserName(name);
        setDisplayName(name);
        // Auto-create the profile row so the profile page is pre-populated
        await dbClient.from("profiles").upsert(
          {
            session_id: data.user.id,
            name,
            bio: "",
            photo_url: null,
            location_text: "",
            lat: null,
            lng: null,
          },
          { onConflict: "session_id", ignoreDuplicates: true },
        );
      }
      return error ? error.message : null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  const updateUserMetaName = useCallback(async (name: string) => {
    await supabase.auth.updateUser({ data: { name } });
    setUserName(name);
    setDisplayName(name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        displayName,
        loading,
        showAuthModal,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signOut,
        updateUserMetaName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
