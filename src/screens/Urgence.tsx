import {
  C,
  Profile,
  darkC,
  displayAllergies,
  displayMedicalValue,
  onBrand,
} from "../theme";
import { PressScale, ScreenEnter, StaggerItem, hapticMedium } from "../motion";
import { IconCluster, StoryArt } from "../components/StoryArt";
import { usePullRefresh } from "../hooks/usePullRefresh";
import { api } from "../api";
import { storage } from "../storage";
import { useAppStore } from "../store/appStore";
import { qk } from "../queries/keys";
import { Avatar } from "../components/Avatar";
import { Linking, ScrollView, StatusBar, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

type Colors = typeof C;

const EMERGENCY = C.emergency; // #A32D2D

function InfoRow({
  icon,
  label,
  value,
  colors,
  dark,
  accent,
  last = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: Colors;
  dark: boolean;
  accent?: "blood" | "electro" | "allergy" | "chronic" | "contact" | "insurance";
  last?: boolean;
  onPress?: () => void;
}) {
  const tone =
    accent === "blood"
      ? { color: dark ? "#FCA5A5" : EMERGENCY, soft: dark ? "#1A1010" : "#F8EAEA" }
      : accent === "electro"
        ? { color: dark ? "#5EEAD4" : C.blue, soft: dark ? "#0F1A18" : C.lightBlue }
        : accent === "allergy"
          ? { color: dark ? "#FCD34D" : C.amber, soft: dark ? "#1A160C" : C.amberSoft }
          : accent === "chronic"
            ? { color: dark ? "#A3A3A3" : C.navy, soft: dark ? "#141414" : "#EEF1F4" }
            : accent === "contact"
              ? { color: dark ? "#FCA5A5" : EMERGENCY, soft: dark ? "#1A1010" : "#F8EAEA" }
              : { color: dark ? "#5EEAD4" : C.blue, soft: dark ? "#0F1A18" : C.lightBlue };

  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 13,
          backgroundColor: tone.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={tone.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: colors.muted,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontWeight: "800",
            fontSize: 16,
            marginTop: 3,
            lineHeight: 22,
          }}
          numberOfLines={4}
        >
          {value}
        </Text>
      </View>
      {onPress ? (
        <Ionicons name="call-outline" size={20} color={tone.color} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`Appeler ${value}`}>
        {body}
      </PressScale>
    );
  }
  return body;
}

export default function Urgence({
  user,
  onBack,
  dark = false,
}: {
  user: Profile;
  onBack: () => void;
  dark?: boolean;
}) {
  const colors = dark ? darkC : C;
  const online = useAppStore((s) => s.online);
  const setUser = useAppStore((s) => s.setUser);
  const { refreshControl } = usePullRefresh({
    keys: [qk.me],
    refetch: [
      async () => {
        const snap = await storage.getSnapshot();
        if (snap?.profile) setUser(snap.profile);
        const profile = await api.me().catch(() => null);
        if (profile) setUser(profile);
      },
    ],
  });

  const bg = dark ? "#0A0A0A" : "#F6F4F3";
  const surface = dark ? "#141414" : "#FFFFFF";
  const allergies = displayAllergies(user.allergies);
  const chronicLabel = [
    ...(user.chronic || []).map((c) => (c.depuis ? `${c.nom} (${c.depuis})` : c.nom)),
    (user.antecedents || "").trim(),
  ]
    .filter(Boolean)
    .join(" · ") || "Aucune";

  const callEmergency = () => {
    hapticMedium();
    if (user.emergencyPhone) {
      Linking.openURL(`tel:${user.emergencyPhone.replace(/\s/g, "")}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      <ScreenEnter>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: user.emergencyPhone ? 120 : 40,
            gap: 18,
          }}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <PressScale
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Retour"
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </PressScale>

            <View style={{ alignItems: "center", gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: dark ? "#1A1010" : C.redSoft,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: EMERGENCY + "44",
                  }}
                >
                  <Ionicons name="medkit" size={16} color={EMERGENCY} />
                </View>
                <Text
                  style={{
                    color: EMERGENCY,
                    fontWeight: "900",
                    fontSize: 18,
                    letterSpacing: 4,
                  }}
                >
                  URGENCE
                </Text>
              </View>
              {!online ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: dark ? "#1A160C" : C.amberSoft,
                  }}
                >
                  <Ionicons name="cloud-offline-outline" size={12} color={dark ? "#FCD34D" : C.amber} />
                  <Text
                    style={{
                      color: dark ? "#FCD34D" : C.amber,
                      fontSize: 10,
                      fontWeight: "700",
                      letterSpacing: 0.3,
                    }}
                  >
                    Snapshot hors ligne
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ width: 44 }} />
          </View>

          <StaggerItem index={0}>
            <StoryArt
              preset="urgence"
              compact
              dark={dark}
              title="Infos critiques immédiates"
              subtitle="Groupe sanguin, allergies, contact - calmes et lisibles pour les secours."
            />
          </StaggerItem>

          {/* Identité patient */}
          <StaggerItem index={1}>
            <View
              style={{
                backgroundColor: surface,
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Avatar
                uri={user.photoUrl}
                firstName={user.firstName}
                lastName={user.lastName}
                size={72}
                ring
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "800",
                    fontSize: 20,
                    letterSpacing: 0.2,
                  }}
                  numberOfLines={2}
                >
                  {user.lastName} {user.firstName}
                </Text>
                {user.birthDate ? (
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4, fontWeight: "600" }}>
                    Né(e) le {user.birthDate}
                  </Text>
                ) : null}
                <Text
                  style={{
                    color: dark ? "#5EEAD4" : C.blue,
                    fontSize: 12,
                    marginTop: 6,
                    fontFamily: "monospace",
                    fontWeight: "700",
                  }}
                  numberOfLines={1}
                >
                  {user.npi || "-"}
                </Text>
              </View>
            </View>
          </StaggerItem>

          {/* Grille critique */}
          <StaggerItem index={2}>
            <View
              style={{
                backgroundColor: surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 3,
                  backgroundColor: EMERGENCY,
                  opacity: dark ? 0.85 : 1,
                }}
              />
              <InfoRow
                icon="water"
                label="Groupe sanguin"
                value={displayMedicalValue(user.bloodType)}
                colors={colors}
                dark={dark}
                accent="blood"
              />
              <InfoRow
                icon="flask"
                label="Électrophorèse"
                value={displayMedicalValue(user.electrophoresis)}
                colors={colors}
                dark={dark}
                accent="electro"
              />
              <InfoRow
                icon="warning-outline"
                label="Allergies"
                value={allergies.join(" · ")}
                colors={colors}
                dark={dark}
                accent="allergy"
              />
              <InfoRow
                icon="fitness-outline"
                label="Chroniques"
                value={chronicLabel}
                colors={colors}
                dark={dark}
                accent="chronic"
                last={!user.emergencyPhone && !user.hasInsurance}
              />
              {user.emergencyPhone || user.emergencyName ? (
                <InfoRow
                  icon="person-outline"
                  label="Contact d'urgence"
                  value={
                    user.emergencyName
                      ? `${user.emergencyName}\n${user.emergencyPhone || ""}`.trim()
                      : user.emergencyPhone || "-"
                  }
                  colors={colors}
                  dark={dark}
                  accent="contact"
                  last={!user.hasInsurance}
                  onPress={user.emergencyPhone ? callEmergency : undefined}
                />
              ) : null}
              {user.hasInsurance ? (
                <InfoRow
                  icon="shield-checkmark-outline"
                  label="Assurance"
                  value={`${user.insurer || "-"}${user.policyNumber ? ` · ${user.policyNumber}` : ""}`}
                  colors={colors}
                  dark={dark}
                  accent="insurance"
                  last
                />
              ) : null}
            </View>
          </StaggerItem>

          <StaggerItem index={3}>
            <View style={{ alignItems: "center", paddingVertical: 4 }}>
              <IconCluster
                dark={dark}
                size="sm"
                accent={EMERGENCY}
                soft={dark ? "#1A1010" : C.redSoft}
                icons={[
                  { name: "car", size: 22, color: EMERGENCY },
                  { name: "call", size: 13, color: EMERGENCY },
                  { name: "heart", size: 12, color: EMERGENCY },
                ]}
              />
            </View>
            <Text
              style={{
                color: colors.grey,
                textAlign: "center",
                fontSize: 12,
                lineHeight: 18,
                paddingHorizontal: 12,
              }}
            >
              Infos critiques synchronisées - disponibles hors connexion via le dernier snapshot.
            </Text>
          </StaggerItem>
        </ScrollView>

        {/* FAB appel urgence */}
        {user.emergencyPhone ? (
          <View
            style={{
              position: "absolute",
              left: 20,
              right: 20,
              bottom: 28,
            }}
          >
            <PressScale
              onPress={callEmergency}
              accessibilityRole="button"
              accessibilityLabel={`Appeler ${user.emergencyName || "contact d'urgence"}`}
              style={{
                backgroundColor: EMERGENCY,
                borderRadius: 18,
                paddingVertical: 18,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                shadowColor: EMERGENCY,
                shadowOpacity: dark ? 0.45 : 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 6,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="call" size={22} color={onBrand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: onBrand, fontWeight: "800", fontSize: 16 }}>
                  Appeler le contact
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {user.emergencyName || user.emergencyPhone}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </PressScale>
          </View>
        ) : null}
      </ScreenEnter>
    </View>
  );
}
