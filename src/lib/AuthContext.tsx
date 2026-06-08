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
  requestAccess: (input: AccessRequestInput) => Promise<string>;
  resetPassword: (email: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface AccessRequestInput {
  email: string;
  firstName: string;
  lastName?: string;
  houseNumber: string;
}

const pendingAccessRequestMessage = "Je aanvraag is al ontvangen en staat nog in behandeling. Je hoeft niets opnieuw te versturen.";
const existingAccountMessage = "Dit e-mailadres is al in gebruik. Log in of kies Wachtwoord vergeten.";

const AuthContext = createContext<AuthContextValue | null>(null);

function hasPasswordSetupIntent() {
  if (typeof window === "undefined") return false;
  const combinedUrlState = `${window.location.pathname} ${window.location.search} ${window.location.hash}`.toLowerCase();
  return (
    combinedUrlState.includes("type=invite") ||
    combinedUrlState.includes("type=recovery") ||
    combinedUrlState.includes("code=") ||
    combinedUrlState.includes("access_token") && combinedUrlState.includes("invite") ||
    combinedUrlState.includes("access_token") && combinedUrlState.includes("recovery") ||
    combinedUrlState.includes("wachtwoord-instellen")
  );
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    naam_of_bijnaam: String(row.naam_of_bijnaam ?? ""),
    achternaam: row.achternaam ? String(row.achternaam) : undefined,
    huisnummer: row.huisnummer ? String(row.huisnummer) : undefined,
    verdieping_of_gebouwdeel: row.verdieping_of_gebouwdeel ? String(row.verdieping_of_gebouwdeel) : undefined,
    profielfoto_url: row.profielfoto_url ? String(row.profielfoto_url) : undefined,
    account_geblokkeerd: row.account_geblokkeerd === true,
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
      if (mappedProfile.account_geblokkeerd) {
        await supabase.auth.signOut();
        throw new Error("Dit account is tijdelijk geblokkeerd. Neem contact op met beheer.");
      }
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
        if (hasPasswordSetupIntent()) setPasswordRecovery(true);
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
      if (event === "PASSWORD_RECOVERY" || hasPasswordSetupIntent()) setPasswordRecovery(true);
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          try {
            await loadProfile(data.user);
          } catch (caught) {
            await supabase.auth.signOut();
            setSession(null);
            setProfile(null);
            throw caught;
          }
        }
      },
      requestAccess: async ({ email, firstName, lastName, houseNumber }) => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const { error } = await supabase.from("access_requests").insert({
          email: email.trim().toLowerCase(),
          naam_of_bijnaam: firstName.trim(),
          achternaam: lastName?.trim() || null,
          huisnummer: houseNumber.trim(),
          verdieping_of_gebouwdeel: floorForHouseNumber(houseNumber),
          status: "Nieuw",
        });
        if (error) {
          const errorText = JSON.stringify(error).toLowerCase();
          if (errorText.includes("al in gebruik") || errorText.includes("al goedgekeurd")) {
            throw new Error(existingAccountMessage);
          }
          if (
            error.code === "23505" ||
            errorText.includes("duplicate") ||
            errorText.includes("unique constraint") ||
            errorText.includes("access_requests_email_active_key")
          ) {
            throw new Error(pendingAccessRequestMessage);
          }
          throw error;
        }
        return "Je aanvraag is verstuurd. Beheer controleert je aanvraag. Na goedkeuring krijg je een e-mail om je account te activeren en zelf een wachtwoord in te stellen. Kijk ook in spam of ongewenste mail.";
      },
      resetPassword: async (email) => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?type=recovery` });
        if (error) throw error;
      },
      updateEmail: async (email) => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const normalizedEmail = email.trim().toLowerCase();
        const currentUserId = session?.user.id;
        const { data: existingProfiles, error: profileError } = await supabase
          .from("profiles")
          .select("user_id,email")
          .ilike("email", normalizedEmail)
          .limit(1);
        if (profileError) throw profileError;
        if (existingProfiles?.some((existingProfile) => existingProfile.user_id !== currentUserId)) {
          throw new Error(existingAccountMessage);
        }

        const { error } = await supabase.auth.updateUser({ email: normalizedEmail }, { emailRedirectTo: window.location.origin });
        if (error) throw error;
      },
      updatePassword: async (password) => {
        if (!supabase) throw new Error("Supabase is nog niet gekoppeld.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPasswordRecovery(false);
        window.history.replaceState({}, document.title, window.location.pathname);
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
    [loadProfile, loading, passwordRecovery, profile, refreshProfile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
