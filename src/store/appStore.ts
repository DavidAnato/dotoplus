import { create } from "zustand";
import { C, DEMO_USER, Profile, darkC, normalizeProfile } from "../theme";
import { api } from "../api";
import { storage } from "../storage";

export type AppPhase = "boot" | "onboarding" | "login" | "main" | "urgence";
export type Tab = "home" | "dossier" | "carte" | "parametres" | "notifications";
export type DossierSub = "dossier" | "ordonnances" | "examens" | "assurance";

export type DossierBadges = Record<DossierSub, number>;

const EMPTY_DOSSIER_BADGES: DossierBadges = {
  dossier: 0,
  ordonnances: 0,
  examens: 0,
  assurance: 0,
};

const BADGE_DEDUP_MS = 2_500;
const lastBadgeBumpAt: Partial<Record<DossierSub, number>> = {};

type AppState = {
  phase: AppPhase;
  tab: Tab;
  user: Profile;
  online: boolean;
  dark: boolean;
  unread: number;
  pushEnabled: boolean;
  pendingConsentId: number | null;
  /** Nouveautés non consultées par onglet de Mon dossier */
  dossierBadges: DossierBadges;
  /** Session app verrouillée (PIN / bio) */
  locked: boolean;
  needsPinSetup: boolean;
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
  bumpDossierBadge: (sub: DossierSub, n?: number) => void;
  clearDossierBadge: (sub: DossierSub) => void;
  clearAllDossierBadges: () => void;
  setLocked: (v: boolean) => void;
  setNeedsPinSetup: (v: boolean) => void;
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
  dossierBadges: { ...EMPTY_DOSSIER_BADGES },
  locked: false,
  needsPinSetup: false,
  urgenceBypass: false,

  setPhase: (phase) => set({ phase }),
  setTab: (tab) => set({ tab }),
  setUser: (user) => set({ user: normalizeProfile(user) }),
  setOnline: (online) => set({ online }),
  setDark: (dark) => set({ dark }),
  setUnread: (unread) => set({ unread }),
  setPushEnabled: (pushEnabled) => set({ pushEnabled }),
  setPendingConsentId: (pendingConsentId) => set({ pendingConsentId }),
  bumpDossierBadge: (sub, n = 1) => {
    const now = Date.now();
    if ((lastBadgeBumpAt[sub] || 0) + BADGE_DEDUP_MS > now) return;
    lastBadgeBumpAt[sub] = now;
    set((s) => ({
      dossierBadges: {
        ...s.dossierBadges,
        [sub]: Math.min(99, (s.dossierBadges[sub] || 0) + Math.max(1, n)),
      },
    }));
  },
  clearDossierBadge: (sub) =>
    set((s) => ({
      dossierBadges: { ...s.dossierBadges, [sub]: 0 },
    })),
  clearAllDossierBadges: () => set({ dossierBadges: { ...EMPTY_DOSSIER_BADGES } }),
  setLocked: (locked) => set({ locked, urgenceBypass: locked ? get().urgenceBypass : false }),
  setNeedsPinSetup: (needsPinSetup) => set({ needsPinSetup }),
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
      locked: false,
      needsPinSetup: !user.hasPin,
      urgenceBypass: false,
    }),
  resetSessionState: () =>
    set({
      user: DEMO_USER,
      tab: "home",
      unread: 0,
      pendingConsentId: null,
      dossierBadges: { ...EMPTY_DOSSIER_BADGES },
      locked: false,
      needsPinSetup: false,
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
      try {
        const { replayOfflineQueue } = await import("../offlineQueue");
        await replayOfflineQueue(async (a) => {
          const token = await storage.getAccess();
          const r = await fetch(`${api.url}${a.path}`, {
            method: a.method,
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: a.body != null ? JSON.stringify(a.body) : undefined,
          });
          return { ok: r.ok || r.status === 202, status: r.status };
        });
      } catch {
        /* ignore */
      }
      return;
    }
    useAppStore.getState().setOnline(true);
  } catch {
    useAppStore.getState().setOnline(true);
  }
}
