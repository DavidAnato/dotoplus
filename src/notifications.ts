import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
import { api } from "./api";
import { storage } from "./storage";
import { useAppStore, type DossierSub } from "./store/appStore";
import { qk } from "./queries/keys";
import { playAccessRequestSound } from "./sounds";

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
  if (kind === "appointment") return "rdv";
  if (data.payload?.kind?.startsWith("rdv")) return "rdv";
  return null;
}

function applyDossierEvent(
  qc: QueryClient,
  data: {
    type?: string;
    notif_type?: string;
    payload?: { section?: string; kind?: string };
  },
  opts?: { bump?: boolean }
) {
  const section = sectionFromEvent(data);
  const bump = opts?.bump !== false;

  if (section === "rdv" || data.type === "appointment") {
    refreshAppointments(qc);
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
  if (section === "assurance") {
    if (bump) useAppStore.getState().bumpDossierBadge("assurance");
    return;
  }
  if (bump) useAppStore.getState().bumpDossierBadge("dossier");
}

/**
 * Temps réel consentement / alertes / Mon dossier.
 *
 * React Native n'a pas EventSource fiable → le polling (4s app active) est le
 * chemin principal pour le consentement. SSE (web / polyfill) est additif.
 * Historique dossier : poll plus lent (12s) + invalidation immédiate sur events.
 */
export function usePatientSSE(enabled: boolean) {
  const qc = useQueryClient();
  const setUnread = useAppStore((s) => s.setUnread);
  const online = useAppStore((s) => s.online);
  const esRef = useRef<EventSource | null>(null);

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
            data.payload?.section ||
            data.payload?.kind?.startsWith?.("rdv")
          ) {
            // bump dédupliqué : couvre RN sans EventSource + web (event typé compagnon)
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

    const connectSse = async () => {
      if (closed) return;
      if (typeof EventSource === "undefined") return;

      const access = await storage.getAccess();
      if (!access || closed) return;

      try {
        esRef.current?.close();
        const es = new EventSource(api.patientEventsUrl(access));
        esRef.current = es;
        es.onmessage = (msg) => {
          try {
            handleEvent(JSON.parse(msg.data));
          } catch {
            /* ignore */
          }
        };
        es.onerror = () => {
          es.close();
          esRef.current = null;
          if (!closed) retry = setTimeout(() => void connectSse(), 8000);
        };
      } catch {
        /* polling already running */
      }
    };

    startPoll();
    void connectSse();

    appSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        tickConsent();
        tickDossier();
      }
    });

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      if (poll) clearInterval(poll);
      if (dossierPoll) clearInterval(dossierPoll);
      appSub?.remove();
      esRef.current?.close();
      esRef.current = null;
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
