import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { storage } from "../storage";
import { Profile } from "../theme";
import { useAppStore } from "../store/appStore";
import { qk } from "./keys";

export function useMyCard(enabled = true) {
  return useQuery({
    queryKey: qk.myCard,
    enabled,
    queryFn: async () => {
      try {
        const card = await api.myCard();
        const snap = await storage.getSnapshot();
        if (snap) {
          await storage.saveSnapshot({
            ...snap,
            cardToken: card.token_chiffre,
            cardId: card.id,
            syncedAt: new Date().toISOString(),
          });
        }
        return { card, offline: false as const };
      } catch {
        const snap = await storage.getSnapshot();
        if (snap?.cardToken) {
          return {
            card: {
              token_chiffre: snap.cardToken,
              date_expiration: "",
              id: snap.cardId,
              statut: "active",
              statut_label: "Active (cache)",
            },
            offline: true as const,
          };
        }
        throw new Error("Impossible de charger la DotoCard");
      }
    },
  });
}

export function useReportCardLossMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (motif?: string) => api.reportCardLoss(motif || "perte"),
    networkMode: "online",
    onSuccess: async (data: any) => {
      const card = data?.card;
      if (card?.token_chiffre) {
        const snap = await storage.getSnapshot();
        if (snap) {
          await storage.saveSnapshot({
            ...snap,
            cardToken: card.token_chiffre,
            cardId: card.id,
            syncedAt: new Date().toISOString(),
          });
        }
      }
      qc.invalidateQueries({ queryKey: qk.myCard });
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unread });
    },
  });
}

export function useReissueMyCardMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (motif?: string) => api.reissueMyCard(motif || "demande_remplacement"),
    networkMode: "online",
    onSuccess: async (data: any) => {
      const card = data?.card || data;
      if (card?.token_chiffre) {
        const snap = await storage.getSnapshot();
        if (snap) {
          await storage.saveSnapshot({
            ...snap,
            cardToken: card.token_chiffre,
            cardId: card.id,
            syncedAt: new Date().toISOString(),
          });
        }
      }
      qc.invalidateQueries({ queryKey: qk.myCard });
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unread });
    },
  });
}

export function useMeQuery(enabled = false) {
  return useQuery({
    queryKey: qk.me,
    enabled,
    queryFn: () => api.me(),
  });
}

export function useNotifications(enabled = true) {
  const online = useAppStore((s) => s.online);
  return useQuery({
    queryKey: qk.notifications,
    enabled,
    queryFn: () => api.notifications(),
    // Consentement critique : pas de cache long (persist RQ sinon masque les alertes)
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: online && enabled ? 4_000 : false,
  });
}

export function useUnreadCount(enabled = true) {
  const online = useAppStore((s) => s.online);
  return useQuery({
    queryKey: qk.unread,
    enabled,
    queryFn: () => api.unreadCount(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: online && enabled ? 4_000 : false,
  });
}

export function usePendingAccessRequests(enabled = true) {
  const online = useAppStore((s) => s.online);
  return useQuery({
    queryKey: qk.accessPending,
    enabled: enabled && online,
    queryFn: () => api.accessRequests(true),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: online ? 4_000 : false,
    networkMode: "online",
  });
}

export function useActiveAccessGrants(enabled = true) {
  const online = useAppStore((s) => s.online);
  return useQuery({
    queryKey: qk.accessActive,
    enabled: enabled && online,
    queryFn: () => api.accessRequests(false, true),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: online ? 8_000 : false,
    networkMode: "online",
  });
}

export function useApproveAccessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.approveAccess(id),
    networkMode: "online",
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.accessPending });
      qc.invalidateQueries({ queryKey: qk.accessActive });
      qc.invalidateQueries({ queryKey: qk.accessRequests });
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unread });
    },
  });
}

export function useDenyAccessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.denyAccess(id),
    networkMode: "online",
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.accessPending });
      qc.invalidateQueries({ queryKey: qk.accessActive });
      qc.invalidateQueries({ queryKey: qk.accessRequests });
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unread });
    },
  });
}

export function useRevokeAccessMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.revokeAccess(id),
    networkMode: "online",
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.accessPending });
      qc.invalidateQueries({ queryKey: qk.accessActive });
      qc.invalidateQueries({ queryKey: qk.accessRequests });
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unread });
    },
  });
}

export function useMarkReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unread });
    },
  });
}

export function useMarkAllReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.unread });
      useAppStore.getState().setUnread(0);
    },
  });
}

export function useAppointments(enabled = true) {
  return useQuery({
    queryKey: qk.appointments,
    enabled,
    queryFn: () => api.appointments(),
  });
}

export function useHistorique(enabled = true) {
  return useQuery({
    queryKey: qk.historique,
    enabled,
    queryFn: () =>
      api.historique().catch(() => ({
        consultations: [] as any[],
        ordonnances: [] as any[],
        examens: [] as any[],
        bons_examen: [] as any[],
      })),
    staleTime: 30_000,
  });
}

export function useMyAssurance(enabled = true) {
  return useQuery({
    queryKey: qk.assurance,
    enabled,
    queryFn: () => api.myAssurance().catch(() => null),
    staleTime: 60_000,
  });
}

/**
 * Badges Mon dossier depuis le poll notifications (chemin principal RN sans EventSource).
 * Ignore le premier snapshot pour ne pas badge-ifier l'historique déjà présent.
 */
export function useDossierBadgesFromNotifications(enabled = true) {
  const qc = useQueryClient();
  const notifs = useNotifications(enabled);
  const primed = useRef(false);
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    const list: any[] = Array.isArray(notifs.data)
      ? notifs.data
      : Array.isArray((notifs.data as any)?.results)
        ? (notifs.data as any).results
        : [];

    if (!primed.current) {
      for (const n of list) {
        if (n?.id != null) seen.current.add(n.id);
      }
      primed.current = true;
      return;
    }

    for (const n of list) {
      if (n?.id == null || seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.read_at) continue;
      const section = n.payload?.section as string | undefined;
      const type = n.type as string | undefined;
      if (section === "ordonnances" || type === "ordonnance") {
        useAppStore.getState().bumpDossierBadge("ordonnances");
        void qc.invalidateQueries({ queryKey: qk.historique });
      } else if (section === "examens" || type === "examen") {
        useAppStore.getState().bumpDossierBadge("examens");
        void qc.invalidateQueries({ queryKey: qk.historique });
      } else if (section === "assurance") {
        useAppStore.getState().bumpDossierBadge("assurance");
        void qc.invalidateQueries({ queryKey: qk.assurance });
        void qc.invalidateQueries({ queryKey: qk.me });
        void api.me().then((profile) => {
          if (profile) useAppStore.getState().setUser(profile);
        });
      } else if (section === "dossier" || type === "dossier_updated") {
        useAppStore.getState().bumpDossierBadge("dossier");
        void qc.invalidateQueries({ queryKey: qk.historique });
        void qc.invalidateQueries({ queryKey: qk.me });
      } else if (section === "rdv" || String(n.payload?.kind || "").startsWith("rdv")) {
        void qc.invalidateQueries({ queryKey: qk.appointments });
      }
    }
  }, [enabled, notifs.data, qc]);
}

export function useLoginMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, otp }: { phone: string; otp: string }) => api.login(phone, otp),
    onSuccess: () => {
      qc.clear();
      void qc.prefetchQuery({ queryKey: qk.me, queryFn: () => api.me() });
      void qc.prefetchQuery({
        queryKey: qk.myCard,
        queryFn: async () => {
          const card = await api.myCard();
          return { card, offline: false as const };
        },
      });
      qc.invalidateQueries({ queryKey: qk.notifications });
      qc.invalidateQueries({ queryKey: qk.accessPending });
      qc.invalidateQueries({ queryKey: qk.appointments });
    },
  });
}

export function useRegisterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      phone: string;
      otp: string;
      first_name?: string;
      last_name?: string;
      npi?: string;
      birth_date?: string;
      birth_place?: string;
      father_name?: string;
      mother_name?: string;
      address_commune?: string;
      address_quartier?: string;
    }) => api.register(payload),
    onSuccess: () => {
      qc.clear();
      qc.invalidateQueries({ queryKey: qk.me });
      qc.invalidateQueries({ queryKey: qk.myCard });
    },
  });
}

export type { Profile };
