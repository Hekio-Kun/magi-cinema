import { useCallback, useEffect, useMemo, useState } from "react";

export type DashboardTimeFormat = "relative" | "absolute";

export interface DashboardPreferences {
  accentColor: string;
  compactSidebar: boolean;
  compactHeader: boolean;
  reduceMotion: boolean;
  defaultPage: string;
  enableSearchShortcut: boolean;
  showSearchHistory: boolean;
  maxSearchResults: number;
  notificationRefreshSeconds: number;
  notificationUnreadOnly: boolean;
  notificationSound: boolean;
  desktopNotifications: boolean;
  notificationTimeFormat: DashboardTimeFormat;
}

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  accentColor: "#f59e0b",
  compactSidebar: false,
  compactHeader: false,
  reduceMotion: false,
  defaultPage: "Tổng quan",
  enableSearchShortcut: true,
  showSearchHistory: true,
  maxSearchResults: 8,
  notificationRefreshSeconds: 30,
  notificationUnreadOnly: false,
  notificationSound: false,
  desktopNotifications: false,
  notificationTimeFormat: "relative",
};

export const DASHBOARD_PREFERENCES_EVENT = "magi-dashboard-preferences-changed";
export const DASHBOARD_SEARCH_HISTORY_PREFIX = "magi:dashboard-search-history:";
const STORAGE_PREFIX = "magi:dashboard-preferences:";

const safeUserKey = (userKey?: string) => (userKey?.trim().toLowerCase() || "default").replace(/[^a-z0-9@._-]/g, "_");
const storageKey = (userKey?: string) => `${STORAGE_PREFIX}${safeUserKey(userKey)}`;

export const getDashboardSearchHistoryKey = (userKey?: string) => `${DASHBOARD_SEARCH_HISTORY_PREFIX}${safeUserKey(userKey)}`;

export function readDashboardPreferences(userKey?: string): DashboardPreferences {
  if (typeof window === "undefined") return DEFAULT_DASHBOARD_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(storageKey(userKey));
    if (!raw) return DEFAULT_DASHBOARD_PREFERENCES;
    return { ...DEFAULT_DASHBOARD_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES;
  }
}

export function useDashboardPreferences(userKey?: string) {
  const normalizedUserKey = useMemo(() => safeUserKey(userKey), [userKey]);
  const [preferences, setPreferencesState] = useState<DashboardPreferences>(() => readDashboardPreferences(normalizedUserKey));

  useEffect(() => {
    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<{ userKey: string }>).detail;
      if (!detail || detail.userKey === normalizedUserKey) {
        setPreferencesState(readDashboardPreferences(normalizedUserKey));
      }
    };
    window.addEventListener(DASHBOARD_PREFERENCES_EVENT, handleChange);
    return () => window.removeEventListener(DASHBOARD_PREFERENCES_EVENT, handleChange);
  }, [normalizedUserKey]);

  const persist = useCallback((next: DashboardPreferences) => {
    window.localStorage.setItem(storageKey(normalizedUserKey), JSON.stringify(next));
    setPreferencesState(next);
    window.dispatchEvent(new CustomEvent(DASHBOARD_PREFERENCES_EVENT, { detail: { userKey: normalizedUserKey } }));
  }, [normalizedUserKey]);

  const updatePreferences = useCallback((patch: Partial<DashboardPreferences>) => {
    const next = { ...readDashboardPreferences(normalizedUserKey), ...patch };
    persist(next);
  }, [normalizedUserKey, persist]);

  const replacePreferences = useCallback((next: DashboardPreferences) => {
    persist({ ...DEFAULT_DASHBOARD_PREFERENCES, ...next });
  }, [persist]);

  const resetPreferences = useCallback(() => persist(DEFAULT_DASHBOARD_PREFERENCES), [persist]);

  return { preferences, updatePreferences, replacePreferences, resetPreferences };
}
