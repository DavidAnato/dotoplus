import React from "react";
import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Card, SectionLabel } from "../ui";
import { C, Profile, darkC } from "../theme";
import {
  BrandBackground,
  CardDecor,
  EmptyState,
  IconBadge,
  PressScale,
  ScreenEnter,
  StaggerItem,
  hapticMedium,
} from "../motion";
import { CriticalHeroStrip, CriticalMedicalCard, ThemedIconBadge } from "../components/CriticalMedical";
import { IconRibbon } from "../components/StoryArt";
import { usePendingAccessRequests, useUnreadCount, useAppointments } from "../queries/hooks";
import { qk } from "../queries/keys";
import { ConsentCard } from "./Notifications";
import { useAppStore } from "../store/appStore";
import { Avatar } from "../components/Avatar";
import { usePullRefresh } from "../hooks/usePullRefresh";
import { api } from "../api";

function formatRdvWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRdvShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function pickNextAppointment(list: any[] | undefined) {
  if (!list?.length) return null;
  const now = Date.now();
  const upcoming = list
    .filter((a) => a.statut !== "annule" && a.statut !== "termine" && a.debut)
    .map((a) => ({ a, t: new Date(a.debut).getTime() }))
    .filter((x) => !Number.isNaN(x.t) && x.t >= now - 60 * 60 * 1000)
    .sort((x, y) => x.t - y.t);
  return upcoming[0]?.a ?? null;
}

function quickItems(dark: boolean, nextRdvSub: string) {
  const calendarAccent = dark ? "#FCD34D" : "#B45309";
  return [
    { key: "carte", icon: "card-outline" as const, label: "Ma DotoCard", sub: "QR & NPI", accent: C.blue },
    { key: "dossier", icon: "clipboard-outline" as const, label: "Mon dossier", sub: "Historique", accent: C.navy },
    {
      key: "notifications",
      icon: "notifications-outline" as const,
      label: "Alertes",
      sub: "Consentements",
      accent: C.emerald,
    },
    {
      key: "rdv",
      icon: "calendar" as const,
      label: "Rendez-vous",
      sub: nextRdvSub,
      accent: calendarAccent,
      themedCalendar: true,
    },
  ];
}

export default function Home({
  user,
  onUrgence,
  onNavigate,
  dark = false,
}: {
  user: Profile;
  onUrgence: () => void;
  onNavigate?: (key: string) => void;
  dark?: boolean;
}) {
  const colors = dark ? darkC : C;
  const online = useAppStore((s) => s.online);
  const storeUnread = useAppStore((s) => s.unread);
  const setUser = useAppStore((s) => s.setUser);
  const setUnread = useAppStore((s) => s.setUnread);
  const pending = usePendingAccessRequests(online);
  const unreadQ = useUnreadCount(online);
  const apptsQ = useAppointments(online);
  const pendingList = pending.data || [];
  const unread = unreadQ.data ?? storeUnread;
  const nextRdv = pickNextAppointment(apptsQ.data);
  const QUICK = quickItems(
    dark,
    nextRdv?.debut ? `Prochain ${formatRdvShort(nextRdv.debut)}` : "Aucun à venir"
  );
  const { refreshControl } = usePullRefresh({
    keys: [qk.accessPending, qk.unread, qk.notifications, qk.me, qk.appointments],
    refetch: [
      async () => {
        const profile = await api.me();
        if (profile) setUser(profile);
        const n = await api.unreadCount().catch(() => null);
        if (typeof n === "number") setUnread(n);
      },
    ],
  });

  return (
    <BrandBackground dark={dark}>
      <ScreenEnter>
        <LinearGradient
          colors={[C.navy, "#2A4A66", C.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 20,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600" }}>
                Bonjour,
              </Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.2 }}>
                {user.firstName} {user.lastName}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 11,
                  marginTop: 3,
                  fontFamily: "monospace",
                }}
              >
                {user.npi}
              </Text>
            </View>
            <PressScale onPress={() => onNavigate?.("notifications")}>
              <View style={{ position: "relative" }}>
                <Avatar
                  uri={user.photoUrl}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  size={50}
                  bg="rgba(255,255,255,0.2)"
                  textColor="#fff"
                  style={{ borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" }}
                />
                {unread > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      backgroundColor: C.emergency,
                      borderRadius: 10,
                      minWidth: 18,
                      height: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                      {unread > 9 ? "9+" : unread}
                    </Text>
                  </View>
                ) : null}
              </View>
            </PressScale>
          </View>

          <CriticalHeroStrip user={user} />
          <IconRibbon icons={["medkit", "card", "calendar", "heart"]} dark={dark} />
        </LinearGradient>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
          refreshControl={refreshControl}
        >
          {pendingList.length > 0 ? (
            <View style={{ gap: 12 }}>
              <SectionLabel color={C.navy}>Consentement requis</SectionLabel>
              {pendingList.map((req) => (
                <ConsentCard key={req.id} req={req} dark={dark} />
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {QUICK.map((q, i) => (
              <StaggerItem
                key={q.key}
                index={i}
                style={{ width: "47%", maxWidth: "48%", flexGrow: 1 }}
              >
                <PressScale
                  onPress={() => onNavigate?.(q.key)}
                  style={{
                    backgroundColor: colors.white,
                    borderRadius: 18,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    shadowColor: "#1E3755",
                    shadowOpacity: 0.07,
                    shadowRadius: 8,
                    elevation: 2,
                    overflow: "hidden",
                    minHeight: 108,
                  }}
                >
                  <CardDecor variant={i % 2 === 0 ? "teal" : "navy"} dark={dark} />
                  <View style={{ alignSelf: "flex-start" }}>
                    {"themedCalendar" in q && q.themedCalendar ? (
                      <ThemedIconBadge name={q.icon} dark={dark} size={40} tone="calendar" />
                    ) : (
                      <IconBadge name={q.icon} color={q.accent} size={40} />
                    )}
                    {q.key === "notifications" && (unread > 0 || pendingList.length > 0) ? (
                      <View
                        style={{
                          position: "absolute",
                          top: -4,
                          right: -4,
                          backgroundColor: C.emergency,
                          borderRadius: 10,
                          minWidth: 18,
                          height: 18,
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: 4,
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
                          {(() => {
                            const n = unread + pendingList.length;
                            return n > 9 ? "9+" : String(n);
                          })()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "800",
                      marginTop: 10,
                      fontSize: 13,
                    }}
                  >
                    {q.label}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{q.sub}</Text>
                </PressScale>
              </StaggerItem>
            ))}
          </View>

          <StaggerItem index={4}>
            <Card colors={colors} onPress={() => onNavigate?.("rdv")} decor="teal">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <ThemedIconBadge name="calendar" dark={dark} size={44} tone="calendar" />
                <View style={{ flex: 1 }}>
                  <SectionLabel color={dark ? colors.amber : "#B45309"}>Prochain RDV</SectionLabel>
                  {nextRdv ? (
                    <>
                      <Text
                        style={{
                          fontWeight: "800",
                          color: colors.text,
                          fontSize: 15,
                          textTransform: "capitalize",
                        }}
                      >
                        {formatRdvWhen(nextRdv.debut)}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                        {[
                          nextRdv.professionnel_nom,
                          nextRdv.structure_nom,
                        ]
                          .filter(Boolean)
                          .join(" • ") || nextRdv.motif || "Consultation"}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>
                        Aucun rendez-vous
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                        Votre médecin planifiera la prochaine consultation
                      </Text>
                    </>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
            </Card>
          </StaggerItem>

          <View style={{ gap: 8 }}>
            <SectionLabel color={colors.navy}>Infos critiques</SectionLabel>
            <CriticalMedicalCard user={user} dark={dark} />
          </View>

          <StaggerItem index={5}>
            <Card colors={colors} onPress={() => onNavigate?.("notifications")}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <SectionLabel color={colors.navy}>Centre d'alertes</SectionLabel>
                {unread > 0 ? (
                  <View
                    style={{
                      backgroundColor: C.red,
                      borderRadius: 99,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>{unread}</Text>
                  </View>
                ) : null}
              </View>
              {pendingList.length === 0 && unread === 0 ? (
                <EmptyState
                  icon="notifications-off-outline"
                  title="Tout est à jour"
                  subtitle="Les demandes d'accès professionnels apparaîtront ici."
                  dark={dark}
                  companions={["shield-checkmark", "people"]}
                />
              ) : (
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {pendingList.length > 0
                    ? `${pendingList.length} demande(s) d'accès en attente de votre confirmation.`
                    : `${unread} notification(s) non lue(s).`}
                </Text>
              )}
            </Card>
          </StaggerItem>

          <PressScale
            onPress={() => {
              hapticMedium();
              onUrgence();
            }}
            style={{
              marginTop: 4,
              backgroundColor: dark ? "#141414" : colors.white,
              borderRadius: 18,
              paddingVertical: 16,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              borderWidth: 1,
              borderColor: dark ? "#2A1515" : C.emergency + "33",
              borderLeftWidth: 3,
              borderLeftColor: C.emergency,
              minHeight: 64,
              overflow: "hidden",
            }}
          >
            <View style={{ position: "relative" }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  backgroundColor: dark ? "#1A1010" : C.redSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="medkit" size={22} color={C.emergency} />
              </View>
              <View
                style={{
                  position: "absolute",
                  top: -6,
                  right: -8,
                  width: 22,
                  height: 22,
                  borderRadius: 8,
                  backgroundColor: dark ? "#1C1C1C" : "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: C.emergency + "44",
                }}
              >
                <Ionicons name="car" size={11} color={C.emergency} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.emergency, fontWeight: "800", fontSize: 15, letterSpacing: 0.3 }}>
                Mode urgence
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                Identité, sang, allergies — hors ligne
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.emergency} />
          </PressScale>
        </ScrollView>
      </ScreenEnter>
    </BrandBackground>
  );
}
