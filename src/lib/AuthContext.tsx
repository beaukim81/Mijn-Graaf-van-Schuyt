/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";
import { floorForHouseNumber } from "./floorForHouseNumber";
import type { Profile } from "../types";

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<string>;
  resetPassword: (email: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  houseNumber: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    naam_of_bijnaam: String(row.naam_of_bijnaam ?? ""),
    achternaam: row.achternaam ? String(row.achternaam) : undefined,
    huisnummer: row.huisnummer ? String(row.huisnummer) : undefined,
    verdieping_of_gebouwdeel: row.verdieping_of_gebouwdeel ? String(row.verdieping_of_gebouwdeel) : undefined,
    profielfoto_url: row.profielfoto_url ? String(row.profielfoto_url) : undefined,
    rol: row.rol === "admin" ? "admin" : "bewoner",
    email: row.email ? String(row.email) : undefined,
    telefoon: row.telefoon ? String(row.telefoon) : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const loadProfile = useCallback(async (currentUser: User) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", currentUser.id).maybeSingle();
    if (error) throw error;
    if (data) {
      const mappedProfile = mapProfile(data);
      if (currentUser.email && mappedProfile.email !== currentUser.email) {
        const { data: syncedProfile } = await supabase
          .from("profiles")
          .update({ email: currentUser.email })
          .eq("user_id", currentUser.id)
          .select("*")
          .maybeSingle();
        setProfile(syncedProfile ? mapProfile(syncedProfile) : { ...mappedProfile, email: currentUser.email });
        return;
      }
      setProfile(mappedProfile);
      return;
    }

    const metadata = currentUser.user_metadata;
    const { data: createdProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        user_id: currentUser.id,
        naam_of_bijnaam: metadata.naam_of_bijnaam ?? currentUser.email?.split("@")[0] ?? "Bewoner",
        achternaam: metadata.achternaam ?? null,
        huisnummer: metadata.huisnummer ?? null,
        verdieping_of_gebouwdeel: floorForHouseNumber(String(metadata.huisnummer ?? "")) || null,
        email: currentUser.email,
      })
      .select("*")
      .single();
    if (createError) throw createError;
    setProfile(mapProfile(createdProfile));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user);
  }, [loadProfile, session]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const client = supabase;

    client.auth.getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user) await loadProfile(data.session.user);
        if (mounted) setLoading(false);
      })
      .catch(async () => {
        await client.auth.signOut();
        if (!mounted) return;
        setSession(null);
        setProfile(null);
        setLoading(false);
      });

    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      setSession(nextSession);
      if (nextSession?.user) {
        loadProfile(nextSession.user).catch(() => setProfile(null));
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      user: session?.user ?? null,
      session,
      profile,
      passwordRecovery,
      signIn: async (email, password) => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async ({ email, password, firstName, lastName, houseNumber }) => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              naam_of_bijnaam: firstName,
              achternaam: lastName ?? "",
              huisnummer: houseNumber,
            },
          },
        });
        if (error) throw error;
        return data.session
          ? "Je account is aangemaakt. Je kunt de app nu gebruiken."
          : "Je account is bijna klaar. We hebben je een bevestigingsmail gestuurd. Open de link in die mail om je account te activeren. Kijk ook even in spam of ongewenste mail als je niets ziet.";
      },
      resetPassword: async (email) => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
      },
      updateEmail: async (email) => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: window.location.origin });
        if (error) throw error;
      },
      updatePassword: async (password) => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPasswordRecovery(false);
      },
      deleteAccount: async () => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const { error } = await supabase.rpc("delete_own_account");
        if (error) throw error;
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      },
      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
      refreshProfile,
    }),
    [loading, passwordRecovery, profile, refreshProfile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
