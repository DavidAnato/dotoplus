import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
import { api } from "./api";
import { storage } from "./storage";
import { useAppStore, type DossierSub } from "./store/appStore";
import { qk } from "./queries/keys";
import { playAccessRequestSound } from "./sounds";
import { connectSse } from "./sse";

const POLL_MS = 4_000;
const DOSSIER_POLL_MS = 12_000;

const CONSENT_TYPES = new Set([
  "notification",
  "access_request",
  "access_granted",
  "access_denied",
  "access_expired",
  "access_revoked",
]);

const DOSSIER_EVENT_TYPES = new Set([
  "dossier_updated",
  "ordonnance",
  "examen",
  "appointment",
  "insurance_updated",
]);

function refreshConsentQueries(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.notifications });
  void qc.invalidateQueries({ queryKey: qk.unread });
  void qc.invalidateQueries({ queryKey: qk.accessPending });
  void qc.invalidateQueries({ queryKey: qk.accessActive });
  void qc.invalidateQueries({ queryKey: qk.accessRequests });
}

function refreshDossierQueries(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.historique });
  void qc.invalidateQueries({ queryKey: qk.assurance });
  void qc.invalidateQueries({ queryKey: qk.me });
}

function refreshAppointments(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.appointments });
}

async function refreshProfile(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: qk.me });
  void qc.invalidateQueries({ queryKey: qk.assurance });
  try {
    const profile = await api.me();
    if (profile) useAppStore.getState().setUser(profile);
  } catch {
    /* ignore */
  }
}

function applyInsuranceFromEvent(data: {
  type?: string;
  kind?: string;
  has_insurance?: boolean;
  assureur?: string;
  num_police?: string;
  payload?: {
    has_insurance?: boolean;
    assureur?: string;
    num_police?: string;
    kind?: string;
  };
}) {
  const kind = data.kind || data.payload?.kind;
  const has =
    kind === "removed"
      ? false
      : data.has_insurance ?? data.payload?.has_insurance ?? false;
  const insurer = has ? data.assureur || data.payload?.assureur || "" : "";
  const policy = has ? data.num_police || data.payload?.num_police || "" : "";
  const user = useAppStore.getState().user;
  if (!user) return;
  useAppStore.getState().setUser({
    ...user,
    hasInsurance: !!has,
    insurer,
    policyNumber: policy,
  });
}

function sectionFromEvent(data: {
  type?: string;
  notif_type?: string;
  payload?: { section?: string; kind?: string };
}): DossierSub | "rdv" | null {
  const section = data.payload?.section;
  if (
    section === "dossier" ||
    section === "ordonnances" ||
    section === "examens" ||
    section === "assurance"
  ) {
    return section;
  }
  if (section === "rdv") return "rdv";

  const kind = data.notif_type || data.type || "";
  if (kind === "ordonnance") return "ordonnances";
  if (kind === "examen") return "examens";
  if (kind === "dossier_updated") return "dossier";
  if (kind === "appointment" || kind === "insurance_updated") return kind === "appointment" ? "rdv" : "assurance";
  if (data.payload?.kind?.startsWith("rdv")) return "rdv";
  if (data.payload?.kind?.startsWith("insurance")) return "assurance";
  return null;
}

function applyDossierEvent(
  qc: QueryClient,
  data: {
    type?: string;
    notif_type?: string;
    has_insurance?: boolean;
    assureur?: string;
    num_police?: string;
    payload?: {
      section?: string;
      kind?: string;
      has_insurance?: boolean;
      assureur?: string;
      num_police?: string;
    };
  },
  opts?: { bump?: boolean }
) {
  const section = sectionFromEvent(data);
  const bump = opts?.bump !== false;

  if (section === "rdv" || data.type === "appointment") {
    refreshAppointments(qc);
    return;
  }

  if (section === "assurance" || data.type === "insurance_updated") {
    applyInsuranceFromEvent(data);
    void refreshProfile(qc);
    if (bump) useAppStore.getState().bumpDossierBadge("assurance");
    return;
  }

  refreshDossierQueries(qc);

  if (section === "ordonnances" || data.type === "ordonnance" || data.notif_type === "ordonnance") {
    if (bump) useAppStore.getState().bumpDossierBadge("ordonnances");
    return;
  }
  if (section === "examens" || data.type === "examen" || data.notif_type === "examen") {
    if (bump) useAppStore.getState().bumpDossierBadge("examens");
    return;
  }
  if (bump) useAppStore.getState().bumpDossierBadge("dossier");
}

/**
 * Temps réel consentement / alertes / Mon dossier / RDV / assurance.
 * SSE (EventSource web + XHR natif) + poll de secours si le flux tombe.
 */
export function usePatientSSE(enabled: boolean) {
  const qc = useQueryClient();
  const setUnread = useAppStore((s) => s.setUnread);
  const online = useAppStore((s) => s.online);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !online) return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    let dossierPoll: ReturnType<typeof setInterval> | undefined;
    let appSub: { remove: () => void } | undefined;

    const handleEvent = (data: any) => {
      if (!data?.type) return;

      if (CONSENT_TYPES.has(data.type)) {
        refreshConsentQueries(qc);
        if (data.type === "access_request") {
          void playAccessRequestSound();
        }
        if (data.type === "notification" || data.type === "access_request") {
          const cur = useAppStore.getState().unread;
          setUnread(cur + 1);
        }
        if (data.type === "notification") {
          const nt = data.notif_type as string | undefined;
          if (
            nt === "ordonnance" ||
            nt === "examen" ||
            nt === "dossier_updated" ||
            nt === "appointment" ||
            data.payload?.section ||
            data.payload?.kind?.startsWith?.("rdv") ||
            data.payload?.kind?.startsWith?.("insurance")
          ) {
            applyDossierEvent(qc, data, { bump: true });
          }
        }
      }

      if (DOSSIER_EVENT_TYPES.has(data.type)) {
        applyDossierEvent(qc, data, { bump: true });
        refreshConsentQueries(qc);
      }
    };

    const tickConsent = () => {
      if (closed) return;
      if (AppState.currentState !== "active") return;
      refreshConsentQueries(qc);
    };

    const tickDossier = () => {
      if (closed) return;
      if (AppState.currentState !== "active") return;
      refreshDossierQueries(qc);
      refreshAppointments(qc);
    };

    const startPoll = () => {
      if (poll) return;
      tickConsent();
      poll = setInterval(tickConsent, POLL_MS);
      dossierPoll = setInterval(tickDossier, DOSSIER_POLL_MS);
    };

    const connect = async () => {
      if (closed) return;
      const access = await storage.getAccess();
      if (!access || closed) return;
      closeRef.current?.();
      closeRef.current = connectSse(api.patientEventsUrl(access), handleEvent, {
        onError: () => {
          closeRef.current = null;
          if (!closed) retry = setTimeout(() => void connect(), 5000);
        },
      });
    };

    startPoll();
    void connect();

    appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        tickConsent();
        tickDossier();
        void connect();
      }
    });

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      if (poll) clearInterval(poll);
      if (dossierPoll) clearInterval(dossierPoll);
      appSub?.remove();
      closeRef.current?.();
      closeRef.current = null;
    };
  }, [enabled, online, qc, setUnread]);
}

/** Enregistrement push Expo — no-op si module absent / simulateur / Expo Go Android. */
export async function registerPushToken(app = "dotoplus"): Promise<string | null> {
  try {
    // SDK 53+ : import d'expo-notifications plante sur Expo Go Android
    // (PushTokenAutoRegistration.throw). Skip avant tout import.
    const { isRunningInExpoGo } = await import("expo");
    if (isRunningInExpoGo() && Platform.OS === "android") {
      console.log("[push] Expo Go Android — push distant désactivé (SDK 53+)");
      return null;
    }

    const Notifications = await import("expo-notifications");
    const Device = await import("expo-device").catch(() => null);

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Device && !Device.isDevice && Platform.OS !== "web") {
      console.log("[push] simulateur — enregistrement ignoré");
      return null;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== "granted") return null;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    const platform =
      Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
    await api.registerDeviceToken(token, platform, app);
    return token;
  } catch (e) {
    console.log("[push] indisponible:", (e as Error)?.message || e);
    return null;
  }
}

let pendingPush: Record<string, unknown> | null = null;

export function takePendingPush() {
  const p = pendingPush;
  pendingPush = null;
  return p;
}

/** Navigation au clic d'une notification push (payload type + ids). */
export function subscribePushNavigation(
  navigate?: (data: Record<string, unknown>) => void
): () => void {
  let sub: { remove: () => void } | undefined;
  const handle = (data: Record<string, unknown>) => {
    pendingPush = data;
    navigate?.(data);
  };
  void (async () => {
    try {
      const Notifications = await import("expo-notifications");
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last?.notification?.request?.content?.data) {
        handle(last.notification.request.content.data as Record<string, unknown>);
      }
      sub = Notifications.addNotificationResponseReceivedListener((resp) => {
        const data = resp.notification.request.content.data as Record<string, unknown>;
        if (data) handle(data);
      });
    } catch {
      /* module absent */
    }
  })();
  return () => sub?.remove();
}
