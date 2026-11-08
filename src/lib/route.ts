import { useCallback, useEffect, useState } from "react";

export const PAGES = ["reconciliation", "reports", "rules", "settings"] as const;
export type Page = (typeof PAGES)[number];

export const REPORT_TABS = ["generate", "scheduled", "history"] as const;
export type ReportsTab = (typeof REPORT_TABS)[number];

export const SETTINGS_TABS = ["GENERAL", "DATA SOURCES", "NOTIFICATIONS", "SECURITY", "API"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export interface AppRoute {
  page: Page;
  runId: string;
  reportsTab: ReportsTab;
  settingsTab: SettingsTab;
}

const SETTINGS_SLUG: Record<SettingsTab, string> = {
  GENERAL: "general",
  "DATA SOURCES": "data-sources",
  NOTIFICATIONS: "notifications",
  SECURITY: "security",
  API: "api",
};

function isPage(value: string): value is Page {
  return (PAGES as readonly string[]).includes(value);
}

function isReportsTab(value: string): value is ReportsTab {
  return (REPORT_TABS as readonly string[]).includes(value);
}

function parseSettingsTab(value: string | null): SettingsTab {
  if (!value) return "GENERAL";
  const match = SETTINGS_TABS.find((tab) => SETTINGS_SLUG[tab] === value);
  return match ?? "GENERAL";
}

export function parseHash(defaultRunId: string): AppRoute {
  const raw = window.location.hash.replace(/^#/, "") || "/reconciliation";
  const qIndex = raw.indexOf("?");
  const path = (qIndex === -1 ? raw : raw.slice(0, qIndex)).replace(/^\//, "");
  const query = new URLSearchParams(qIndex === -1 ? "" : raw.slice(qIndex + 1));
  const page = isPage(path) ? path : "reconciliation";
  const reportsTab = isReportsTab(query.get("tab") ?? "") ? (query.get("tab") as ReportsTab) : "generate";
  return {
    page,
    runId: query.get("run") || defaultRunId,
    reportsTab: page === "reports" ? reportsTab : "generate",
    settingsTab: page === "settings" ? parseSettingsTab(query.get("tab")) : "GENERAL",
  };
}

export function toHash(route: AppRoute): string {
  const params = new URLSearchParams();
  if (route.page === "reconciliation" && route.runId) params.set("run", route.runId);
  if (route.page === "reports") params.set("tab", route.reportsTab);
  if (route.page === "settings") params.set("tab", SETTINGS_SLUG[route.settingsTab]);
  const qs = params.toString();
  return `#/${route.page}${qs ? `?${qs}` : ""}`;
}

export function useHashRoute(defaultRunId: string) {
  const [route, setRoute] = useState<AppRoute>(() =>
    typeof window === "undefined" ? { page: "reconciliation", runId: defaultRunId, reportsTab: "generate", settingsTab: "GENERAL" } : parseHash(defaultRunId)
  );

  useEffect(() => {
    const sync = () => setRoute(parseHash(defaultRunId));
    if (!window.location.hash) history.replaceState(null, "", toHash(parseHash(defaultRunId)));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [defaultRunId]);

  const navigate = useCallback((patch: Partial<AppRoute>, mode: "push" | "replace" = "push") => {
    setRoute((prev) => {
      const next = { ...prev, ...patch };
      const hash = toHash(next);
      if (window.location.hash !== hash) {
        if (mode === "replace") history.replaceState(null, "", hash);
        else history.pushState(null, "", hash);
      }
      return next;
    });
  }, []);

  return { route, navigate };
}
