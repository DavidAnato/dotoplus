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
        throw new Error("Impossible de charger la DodoCard");
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
