"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./supabase-client";
import { isSupabaseConfigured } from "@/lib/config/env";
import { normalizeAuthError } from "./error-handler";
import type { UserProfile, UserPreferences, SavedLocation } from "./types";
import { DEFAULT_USER_PREFERENCES } from "./types";

export type SaveLocationTarget = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string | null;
  countryCode?: string | null;
  adminArea?: string | null;
  timezone?: string | null;
  id?: string | number | null;
};

export interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  preferences: UserPreferences;
  savedLocations: SavedLocation[];
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    pass: string,
    displayName?: string
  ) => Promise<{
    success: boolean;
    error?: string;
    needsVerification?: boolean;
  }>;
  signOut: () => Promise<void>;
  saveLocation: (
    location: SaveLocationTarget,
    label?: string
  ) => Promise<{ success: boolean; error?: string; location?: SavedLocation }>;
  removeLocation: (
    locationId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updatePreferences: (
    updates: Partial<UserPreferences>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    user_id: "",
    ...DEFAULT_USER_PREFERENCES,
  });
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [isLoading, setIsLoading] = useState<boolean>(() =>
    isSupabaseConfigured()
  );

  // Fetch authenticated user's locations and preferences from API routes
  const loadUserData = useCallback(async () => {
    try {
      const [locRes, prefRes] = await Promise.all([
        fetch("/api/user/locations"),
        fetch("/api/user/preferences"),
      ]);

      if (locRes.ok) {
        const { locations } = await locRes.json();
        if (Array.isArray(locations)) {
          setSavedLocations(locations);
        }
      }

      if (prefRes.ok) {
        const { preferences: serverPrefs } = await prefRes.json();
        if (serverPrefs) {
          setPreferences(serverPrefs);
          // Sync with HTML data-theme
          if (serverPrefs.theme && typeof document !== "undefined") {
            const resolvedTheme =
              serverPrefs.theme === "system"
                ? window.matchMedia("(prefers-color-scheme: light)").matches
                  ? "light"
                  : "dark"
                : serverPrefs.theme;
            document.documentElement.setAttribute("data-theme", resolvedTheme);
          }
        }
      }
    } catch {
      // Offline or network error; keep existing state
    }
  }, []);

  // Initialize session and auth listener
  useEffect(() => {
    if (!configured) {
      return;
    }

    const supabase = getBrowserSupabase();
    if (!supabase) {
      return;
    }

    let isMounted = true;

    // 1. Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error || !session?.user) {
          setUser(null);
          setProfile(null);
          setSavedLocations([]);
          setIsLoading(false);
          return;
        }

        setUser(session.user);
        setIsLoading(false);
        loadUserData();
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    // 2. Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          loadUserData();
        }
      } else {
        setUser(null);
        setProfile(null);
        setSavedLocations([]);
        setPreferences({
          user_id: "",
          ...DEFAULT_USER_PREFERENCES,
        });
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configured, loadUserData]);

  // Sign In
  const signIn = useCallback(
    async (email: string, pass: string) => {
      if (!configured) {
        return {
          success: false,
          error: "Authentication service is not configured.",
        };
      }

      const supabase = getBrowserSupabase();
      if (!supabase) {
        return {
          success: false,
          error: "Authentication client unavailable.",
        };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });

        if (error) {
          const normalized = normalizeAuthError(error);
          return { success: false, error: normalized.message };
        }

        if (data.user) {
          setUser(data.user);
          await loadUserData();
        }

        return { success: true };
      } catch (err) {
        const normalized = normalizeAuthError(err);
        return { success: false, error: normalized.message };
      }
    },
    [configured, loadUserData]
  );

  // Sign Up
  const signUp = useCallback(
    async (email: string, pass: string, displayName?: string) => {
      if (!configured) {
        return {
          success: false,
          error: "Authentication service is not configured.",
        };
      }

      const supabase = getBrowserSupabase();
      if (!supabase) {
        return {
          success: false,
          error: "Authentication client unavailable.",
        };
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              display_name: displayName || splitEmail(email),
            },
          },
        });

        if (error) {
          const normalized = normalizeAuthError(error);
          return { success: false, error: normalized.message };
        }

        // Check if email confirmation is required
        const isEmailConfirmed = Boolean(
          data.user?.email_confirmed_at || data.user?.confirmed_at
        );
        const needsVerification =
          !data.session && Boolean(data.user && !isEmailConfirmed);

        if (data.user && data.session) {
          setUser(data.user);
          await loadUserData();
        }

        return { success: true, needsVerification };
      } catch (err) {
        const normalized = normalizeAuthError(err);
        return { success: false, error: normalized.message };
      }
    },
    [configured, loadUserData]
  );

  // Sign Out
  const signOut = useCallback(async () => {
    if (!configured) return;
    const supabase = getBrowserSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setSavedLocations([]);
    setPreferences({
      user_id: "",
      ...DEFAULT_USER_PREFERENCES,
    });
  }, [configured]);

  // Save Current Location
  const saveLocation = useCallback(
    async (location: SaveLocationTarget, label?: string) => {
      if (!user) {
        return {
          success: false,
          error: "Please sign in to save locations to your account.",
        };
      }

      try {
        const payload = {
          name: location.name,
          country: location.country ?? null,
          country_code: location.countryCode ?? null,
          admin_area: location.adminArea ?? null,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone ?? null,
          provider_location_id: location.id ? String(location.id) : null,
          label: label || null,
          display_order: savedLocations.length,
        };

        const res = await fetch("/api/user/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || "Failed to save location.",
          };
        }

        const { location: saved } = await res.json();
        setSavedLocations((prev) => {
          const exists = prev.some((l) => l.id === saved.id);
          return exists ? prev : [saved, ...prev];
        });

        return { success: true, location: saved };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Failed to save location.",
        };
      }
    },
    [user, savedLocations.length]
  );

  // Remove Saved Location
  const removeLocation = useCallback(
    async (locationId: string) => {
      if (!user) {
        return {
          success: false,
          error: "Authentication required.",
        };
      }

      try {
        const res = await fetch(`/api/user/locations/${locationId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || "Failed to remove location.",
          };
        }

        setSavedLocations((prev) => prev.filter((l) => l.id !== locationId));
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Failed to remove location.",
        };
      }
    },
    [user]
  );

  // Update Preferences
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      // Optimistic update
      setPreferences((prev) => ({ ...prev, ...updates }));

      if (!user) {
        // For anonymous user, just apply locally
        return { success: true };
      }

      try {
        const res = await fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || "Failed to persist preferences.",
          };
        }

        const { preferences: updated } = await res.json();
        if (updated) {
          setPreferences(updated);
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Failed to persist preferences.",
        };
      }
    },
    [user]
  );

  // Delete Account
  const deleteAccount = useCallback(async () => {
    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || "Failed to delete account.",
        };
      }

      setUser(null);
      setProfile(null);
      setSavedLocations([]);
      setPreferences({
        user_id: "",
        ...DEFAULT_USER_PREFERENCES,
      });

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete account.",
      };
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    if (user) {
      await loadUserData();
    }
  }, [user, loadUserData]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      preferences,
      savedLocations,
      isLoading,
      isConfigured: configured,
      signIn,
      signUp,
      signOut,
      saveLocation,
      removeLocation,
      updatePreferences,
      deleteAccount,
      refreshData,
    }),
    [
      user,
      profile,
      preferences,
      savedLocations,
      isLoading,
      configured,
      signIn,
      signUp,
      signOut,
      saveLocation,
      removeLocation,
      updatePreferences,
      deleteAccount,
      refreshData,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

function splitEmail(email: string): string {
  const parts = email.split("@");
  return parts[0] || "User";
}
