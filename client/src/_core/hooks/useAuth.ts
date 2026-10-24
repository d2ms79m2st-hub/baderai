import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

type Profile = { id: string; name: string | null; email: string | null; role: string };
export type AuthUser = User & { profile?: Profile | null };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) { setUser(null); return; }
    const { data: profile } = await supabase.from("profiles").select("id, name, email, role").eq("id", nextUser.id).maybeSingle();
    setUser(Object.assign(nextUser, { profile: profile ?? null }));
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      void loadProfile(session?.user ?? null).finally(() => mounted && setLoading(false));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setIsRecovery(event === "PASSWORD_RECOVERY");
      void loadProfile(session?.user ?? null).finally(() => mounted && setLoading(false));
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback((email: string, password: string) => supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }), []);
  const signUp = useCallback((email: string, password: string, name: string) => supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { name: name.trim() || undefined }, emailRedirectTo: `${window.location.origin}${window.location.pathname}` } }), []);
  const resetPassword = useCallback((email: string) => supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}${window.location.pathname}` }), []);
  const updatePassword = useCallback(async (password: string) => { const result = await supabase.auth.updateUser({ password }); if (!result.error) setIsRecovery(false); return result; }, []);
  const logout = useCallback(() => supabase.auth.signOut(), []);

  return useMemo(() => ({
    user, loading, isAuthenticated: Boolean(user), isRecovery,
    signIn, signUp, resetPassword, updatePassword, logout,
    refresh: async () => { const { data } = await supabase.auth.getUser(); await loadProfile(data.user); },
  }), [user, loading, isRecovery, signIn, signUp, resetPassword, updatePassword, logout, loadProfile]);
}
