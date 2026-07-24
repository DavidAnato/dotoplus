/** Centre de notifications + carte consentement (Approuver / Refuser). */
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { appAlert } from "../components/AppDialog";
import { C, brandBlue, brandNavy, darkC } from "../theme";
import { Button, Card, Header } from "../ui";
import { AccessRequestItem } from "../api";
import {
  useApproveAccessMutation,
  useDenyAccessMutation,
  useMarkAllReadMutation,
  useMarkReadMutation,
  useNotifications,
  usePendingAccessRequests,
  useActiveAccessGrants,
  useRevokeAccessMutation,
} from "../queries/hooks";
import {
  BrandBackground,
  EmptyState,
  IconBadge,
  PressScale,
  ScreenEnter,
  hapticLight,
  hapticSuccess,
} from "../motion";
import { StoryArt } from "../components/StoryArt";
import { useAppStore } from "../store/appStore";
import { usePullRefresh } from "../hooks/usePullRefresh";
import { qk } from "../queries/keys";

export function ConsentCard({
  req,
  dark = false,
}: {
  req: AccessRequestItem;
  dark?: boolean;
}) {
  const colors = dark ? darkC : C;
  const approve = useApproveAccessMutation();
  const deny = useDenyAccessMutation();
  const [err, setErr] = useState("");
  const busy = approve.isPending || deny.isPending;

  return (
    <Card colors={colors} decor="navy" style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <IconBadge name="shield-checkmark-outline" color={brandBlue} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.navy, fontWeight: "800", fontSize: 15 }}>
            Demande d&apos;accès
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            Consentement requis
          </Text>
        </View>
      </View>
      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
        <Text style={{ fontWeight: "800" }}>{req.requester_name || "Professionnel"}</Text>
        {req.requester_role_label ? ` · ${req.requester_role_label}` : ""}
        {req.structure ? `\n${req.structure}` : ""}
      </Text>
      {req.reason ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.muted} style={{ marginTop: 2 }} />
          <Text style={{ color: colors.muted, fontSize: 12, flex: 1, lineHeight: 17 }}>
            {req.reason}
          </Text>
        </View>
      ) : null}
      {req.expires_at ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="time-outline" size={14} color={brandBlue} />
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>
            Expire {new Date(req.expires_at).toLocaleString("fr-FR")}
          </Text>
        </View>
      ) : null}
      {err ? (
        <Text style={{ color: C.emergency, fontWeight: "700", fontSize: 12 }}>{err}</Text>
      ) : null}
      <View style={{ gap: 8, marginTop: 2 }}>
        <Button
          title="Autoriser"
          loading={busy}
          color={brandBlue}
          onPress={async () => {
            setErr("");
            try {
              await approve.mutateAsync(req.id);
              hapticSuccess();
            } catch (e: any) {
              setErr(e.message || "Erreur");
            }
          }}
        />
        <Button
          title="Refuser"
          loading={busy}
          color={brandNavy}
          outline
          onPress={async () => {
            setErr("");
            try {
              await deny.mutateAsync(req.id);
              hapticLight();
            } catch (e: any) {
              setErr(e.message || "Erreur");
            }
          }}
        />
      </View>
    </Card>
  );
}

export default function NotificationsScreen({ dark = false }: { dark?: boolean }) {
  const colors = dark ? darkC : C;
  const online = useAppStore((s) => s.online);
  const { data: notifs = [], isLoading, isFetching } = useNotifications(true);
  const pending = usePendingAccessRequests(online);
  const mark = useMarkReadMutation();
  const markAll = useMarkAllReadMutation();
  const pendingList = pending.data || [];
  const activeGrants = useActiveAccessGrants(online);
  const revoke = useRevokeAccessMutation();
  const activeList = activeGrants.data || [];
  const { refreshControl } = usePullRefresh({
    keys: [qk.notifications, qk.unread, qk.accessPending, qk.accessActive],
  });

  return (
    <BrandBackground dark={dark}>
      <Header title="Notifications" subtitle="Demandes d'accès et alertes" />
      <ScreenEnter>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={refreshControl}
        >
          <StoryArt
            preset="alerts"
            compact
            dark={dark}
            title="Centre d'alertes"
            subtitle="Consentements, accès professionnels et notifications de santé."
          />

          {pendingList.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: colors.navy, fontWeight: "800", fontSize: 13 }}>
                Consentement requis
              </Text>
              {pendingList.map((req) => (
                <ConsentCard key={req.id} req={req} dark={dark} />
              ))}
            </View>
          ) : null}

          {activeList.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: colors.navy, fontWeight: "800", fontSize: 13 }}>
                Accès actifs — révoquer
              </Text>
              {activeList.map((req) => (
                <Card key={`active-${req.id}`} colors={colors} decor="calm" style={{ gap: 8 }}>
                  <Text style={{ color: colors.navy, fontWeight: "800", fontSize: 14 }}>
                    {req.requester_name || "Professionnel"}
                    {req.requester_role_label ? ` (${req.requester_role_label})` : ""}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {req.status === "emergency_bypass" ? "Urgence · " : ""}
                    Expire{" "}
                    {req.grant_expires_at
                      ? new Date(req.grant_expires_at).toLocaleString("fr-FR")
                      : "—"}
                  </Text>
                  <Button
                    title="Révoquer l'accès"
                    color={C.emergency}
                    outline
                    loading={revoke.isPending}
                    onPress={() => {
                      appAlert(
                        "Révoquer l'accès",
                        "Retirer l'accès de ce professionnel à votre dossier ?",
                        [
                          { text: "Annuler", style: "cancel" },
                          {
                            text: "Révoquer",
                            style: "destructive",
                            onPress: async () => {
                              try {
                                await revoke.mutateAsync(req.id);
                                hapticSuccess();
                              } catch {
                                /* ignore */
                              }
                            },
                          },
                        ]
                      );
                    }}
                  />
                </Card>
              ))}
            </View>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.navy, fontWeight: "800", fontSize: 13 }}>
              Historique
            </Text>
            <PressScale onPress={() => markAll.mutate()}>
              <Text style={{ color: C.blue, fontWeight: "700", fontSize: 12 }}>Tout marquer lu</Text>
            </PressScale>
          </View>

          {isLoading ? (
            <ActivityIndicator color={C.blue} style={{ marginTop: 24 }} />
          ) : !notifs.length ? (
            <EmptyState
              icon="notifications-off-outline"
              title="Aucune notification"
              subtitle="Les demandes d'accès et alertes apparaîtront ici."
              dark={dark}
              companions={["shield-checkmark", "people"]}
            />
          ) : (
            notifs.map((n: any) => (
              <PressScale
                key={n.id}
                onPress={() => {
                  if (!n.read_at && !n.is_read) mark.mutate(n.id);
                }}
              >
                <Card
                  colors={colors}
                  decor="calm"
                  style={{
                    opacity: n.read_at || n.is_read ? 0.72 : 1,
                    borderColor:
                      n.read_at || n.is_read ? colors.border : C.blue + "55",
                  }}
                >
                  <Text style={{ color: colors.navy, fontWeight: "800", fontSize: 14 }}>
                    {n.title}
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 13,
                      marginTop: 4,
                      lineHeight: 18,
                    }}
                  >
                    {n.body}
                  </Text>
                  <Text style={{ color: colors.grey, fontSize: 11, marginTop: 8 }}>
                    {n.created_at
                      ? new Date(n.created_at).toLocaleString("fr-FR")
                      : ""}
                    {!(n.read_at || n.is_read) ? " · Non lu" : ""}
                  </Text>
                </Card>
              </PressScale>
            ))
          )}
          {isFetching && !isLoading ? (
            <Text style={{ textAlign: "center", color: colors.muted, fontSize: 11 }}>
              Actualisation…
            </Text>
          ) : null}
        </ScrollView>
      </ScreenEnter>
    </BrandBackground>
  );
}

