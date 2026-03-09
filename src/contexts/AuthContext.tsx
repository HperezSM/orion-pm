import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"] | "owner";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  timezone: string | null;
  capacity_hours_per_day: number | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  impersonatingRole: AppRole | null;
  setImpersonatingRole: (role: AppRole | null) => void;
  effectiveIsAdmin: boolean;
  effectiveIsOwner: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonatingRole, setImpersonatingRole] = useState<AppRole | null>(null);

  const fetchUserData = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    setProfile(profileData);

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    setRoles(rolesData?.map(r => r.role as AppRole) ?? []);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setRoles([]);
          setImpersonatingRole(null);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: displayName },
      },
    });
    return { error };
  };

  const signOut = async () => {
    setImpersonatingRole(null);
    await supabase.auth.signOut();
  };

  const isOwner = roles.includes("owner" as AppRole);
  const isAdmin = isOwner || roles.includes("admin") || roles.includes("super_admin");
  const isSuperAdmin = isOwner || roles.includes("super_admin");

  // When impersonating, restrict effective permissions
  const effectiveIsOwner = impersonatingRole ? false : isOwner;
  const effectiveIsAdmin = impersonatingRole
    ? ["owner", "super_admin", "admin"].includes(impersonatingRole)
    : isAdmin;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        isLoading,
        isAdmin: effectiveIsAdmin,
        isSuperAdmin: impersonatingRole ? impersonatingRole === "super_admin" || impersonatingRole === "owner" : isSuperAdmin,
        isOwner: effectiveIsOwner,
        impersonatingRole,
        setImpersonatingRole,
        effectiveIsAdmin,
        effectiveIsOwner,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
