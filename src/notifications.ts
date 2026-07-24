import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
import { api } from "./api";
import { storage } from "./storage";
import { useAppStore } from "./store/appStore";
import { qk } from "./queries/keys";
import { playAccessRequestSound } from "./sounds";

const POLL_MS = 4_000;

function refreshConsentQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: qk.notifications });
  void qc.invalidateQueries({ queryKey: qk.unread });
  void qc.invalidateQueries({ queryKey: qk.accessPending });
  void qc.invalidateQueries({ queryKey: qk.accessActive });
  void qc.invalidateQueries({ queryKey: qk.accessRequests });
}

/**
 * Temps réel consentement / alertes.
 *
 * React Native n'a pas EventSource fiable → le polling (4s app active) est le
 * chemin principal. SSE (web / polyfill) est additif et ne remplace jamais le poll.
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
    let appSub: { remove: () => void } | undefined;

    const handleEvent = (data: any) => {
      if (!data?.type) return;
      if (
        data.type === "notification" ||
        data.type === "access_request" ||
        data.type === "access_granted" ||
        data.type === "access_denied" ||
        data.type === "access_expired" ||
        data.type === "access_revoked"
      ) {
        refreshConsentQueries(qc);
        if (data.type === "access_request") {
          void playAccessRequestSound();
        }
        if (data.type === "notification" || data.type === "access_request") {
          const cur = useAppStore.getState().unread;
          setUnread(cur + 1);
        }
      }
    };

    const tick = () => {
      if (closed) return;
      if (AppState.currentState !== "active") return;
      refreshConsentQueries(qc);
    };

    const startPoll = () => {
      if (poll) return;
      tick();
      poll = setInterval(tick, POLL_MS);
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
      if (state === "active") tick();
    });

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      if (poll) clearInterval(poll);
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
