import { create } from "zustand";
import { C, DEMO_USER, Profile, darkC, normalizeProfile } from "../theme";
import { api } from "../api";
import { storage } from "../storage";

export type AppPhase = "boot" | "onboarding" | "login" | "main" | "urgence";
export type Tab = "home" | "dossier" | "carte" | "parametres" | "notifications";

type AppState = {
  phase: AppPhase;
  tab: Tab;
  user: Profile;
  online: boolean;
  dark: boolean;
  unread: number;
  pushEnabled: boolean;
  pendingConsentId: number | null;
  /** Session app verrouillée (PIN / bio) */
  locked: boolean;
  /** Accès Urgence depuis l'écran de verrouillage */
  urgenceBypass: boolean;
  setPhase: (p: AppPhase) => void;
  setTab: (t: Tab) => void;
  setUser: (u: Profile) => void;
  setOnline: (v: boolean) => void;
  setDark: (v: boolean) => void;
  setUnread: (n: number) => void;
  setPushEnabled: (v: boolean) => void;
  setPendingConsentId: (id: number | null) => void;
  setLocked: (v: boolean) => void;
  setUrgenceBypass: (v: boolean) => void;
  toggleDark: () => Promise<void>;
  hydrateTheme: () => Promise<void>;
  enterMain: (p: Profile) => void;
  /** Remet l'état mémoire à zéro (changement de compte / logout). */
  resetSessionState: () => void;
  colors: () => typeof C;
};

export const useAppStore = create<AppState>((set, get) => ({
  phase: "boot",
  tab: "home",
  user: DEMO_USER,
  online: true,
  dark: false,
  unread: 0,
  pushEnabled: true,
  pendingConsentId: null,
  locked: false,
  urgenceBypass: false,

  setPhase: (phase) => set({ phase }),
  setTab: (tab) => set({ tab }),
  setUser: (user) => set({ user: normalizeProfile(user) }),
  setOnline: (online) => set({ online }),
  setDark: (dark) => set({ dark }),
  setUnread: (unread) => set({ unread }),
  setPushEnabled: (pushEnabled) => set({ pushEnabled }),
  setPendingConsentId: (pendingConsentId) => set({ pendingConsentId }),
  setLocked: (locked) => set({ locked, urgenceBypass: locked ? get().urgenceBypass : false }),
  setUrgenceBypass: (urgenceBypass) => set({ urgenceBypass }),

  toggleDark: async () => {
    const next = !get().dark;
    set({ dark: next });
    await storage.setTheme(next ? "dark" : "light");
  },
  hydrateTheme: async () => {
    const t = await storage.getTheme();
    set({ dark: t === "dark" });
  },
  enterMain: (user) =>
    set({
      user: normalizeProfile(user),
      phase: "main",
      tab: "home",
      locked: !!user.requireUnlock && (!!user.hasPin || false),
      urgenceBypass: false,
    }),
  resetSessionState: () =>
    set({
      user: DEMO_USER,
      tab: "home",
      unread: 0,
      pendingConsentId: null,
      locked: false,
      urgenceBypass: false,
    }),
  colors: () => (get().dark ? darkC : C),
}));

function deviceLooksOnline(): boolean | null {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return null;
}

/** Online = réseau device OK. Un health ping raté ≠ hors ligne (API down ≠ offline). */
export async function pingOnline() {
  const nav = deviceLooksOnline();
  if (nav === false) {
    useAppStore.getState().setOnline(false);
    return;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${api.url}/api/health/`, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      useAppStore.getState().setOnline(true);
      return;
    }
    useAppStore.getState().setOnline(true);
  } catch {
    useAppStore.getState().setOnline(true);
  }
}
