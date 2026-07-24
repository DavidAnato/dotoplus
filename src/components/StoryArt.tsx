/**
 * Illustrations « SmartArt » : clusters d’icônes Ionicons + formes douces.
 * Style médical premium — vivant sans être enfantin.
 */
import React from "react";
import { StyleSheet, Text, View, ViewStyle, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, brandBlue, brandNavy } from "../theme";
import { CardDecor } from "../motion";

export type StoryIcon = keyof typeof Ionicons.glyphMap;

export type StoryPreset =
  | "welcome"
  | "home"
  | "dossier"
  | "carte"
  | "alerts"
  | "rdv"
  | "urgence"
  | "settings"
  | "success"
  | "otp"
  | "ordonnance"
  | "examen"
  | "assurance";

type IconSlot = {
  name: StoryIcon;
  size?: number;
  color?: string;
  bg?: string;
};

const PRESETS: Record<
  StoryPreset,
  { icons: IconSlot[]; accent: string; soft: string }
> = {
  welcome: {
    accent: brandBlue,
    soft: C.lightBlue,
    icons: [
      { name: "medical", size: 28 },
      { name: "heart", size: 18, color: brandNavy },
      { name: "shield-checkmark", size: 16 },
    ],
  },
  home: {
    accent: brandBlue,
    soft: C.lightBlue,
    icons: [
      { name: "medkit", size: 26 },
      { name: "calendar", size: 16, color: "#B45309" },
      { name: "card", size: 15, color: brandNavy },
    ],
  },
  dossier: {
    accent: brandNavy,
    soft: "#EEF1F4",
    icons: [
      { name: "clipboard", size: 26 },
      { name: "flask", size: 16, color: brandBlue },
      { name: "document-text", size: 15 },
    ],
  },
  carte: {
    accent: brandBlue,
    soft: C.lightBlue,
    icons: [
      { name: "card", size: 26 },
      { name: "qr-code", size: 16, color: brandNavy },
      { name: "scan", size: 15 },
    ],
  },
  alerts: {
    accent: brandBlue,
    soft: C.lightBlue,
    icons: [
      { name: "notifications", size: 26 },
      { name: "shield-checkmark", size: 16, color: brandNavy },
      { name: "people", size: 15 },
    ],
  },
  rdv: {
    accent: "#B45309",
    soft: C.amberSoft,
    icons: [
      { name: "calendar", size: 26 },
      { name: "time", size: 16, color: brandBlue },
      { name: "business", size: 15, color: brandNavy },
    ],
  },
  urgence: {
    accent: C.emergency,
    soft: C.redSoft,
    icons: [
      { name: "medkit", size: 26 },
      { name: "car", size: 16 },
      { name: "call", size: 15 },
    ],
  },
  settings: {
    accent: brandBlue,
    soft: C.lightBlue,
    icons: [
      { name: "settings", size: 26 },
      { name: "lock-closed", size: 16, color: brandNavy },
      { name: "person-circle", size: 15 },
    ],
  },
  success: {
    accent: C.green,
    soft: C.lightGreen,
    icons: [
      { name: "checkmark-circle", size: 28 },
      { name: "heart", size: 16, color: brandBlue },
      { name: "shield-checkmark", size: 14 },
    ],
  },
  otp: {
    accent: brandBlue,
    soft: C.lightBlue,
    icons: [
      { name: "chatbubble-ellipses", size: 26 },
      { name: "phone-portrait", size: 16, color: brandNavy },
      { name: "key", size: 15 },
    ],
  },
  ordonnance: {
    accent: brandBlue,
    soft: C.lightBlue,
    icons: [
      { name: "medkit", size: 26 },
      { name: "fitness", size: 16, color: brandNavy },
      { name: "water", size: 15 },
    ],
  },
  examen: {
    accent: brandNavy,
    soft: "#EEF1F4",
    icons: [
      { name: "flask", size: 26 },
      { name: "pulse", size: 16, color: brandBlue },
      { name: "eyedrop", size: 15 },
    ],
  },
  assurance: {
    accent: brandBlue,
    soft: C.lightBlue,
    icons: [
      { name: "shield-checkmark", size: 26 },
      { name: "business", size: 16, color: brandNavy },
      { name: "document-text", size: 15 },
    ],
  },
};

/** Cluster d’icônes avec blobs décoratifs (composition SmartArt). */
export function IconCluster({
  icons,
  dark = false,
  size = "md",
  accent,
  soft,
}: {
  icons: IconSlot[];
  dark?: boolean;
  size?: "sm" | "md" | "lg";
  accent?: string;
  soft?: string;
}) {
  const dim = size === "lg" ? 112 : size === "sm" ? 64 : 88;
  const primary = icons[0];
  const satellites = icons.slice(1, 3);
  const accentColor = accent || brandBlue;
  const softBg = dark ? "rgba(62,130,149,0.18)" : soft || C.lightBlue;

  return (
    <View style={{ width: dim + 24, height: dim + 16, alignItems: "center", justifyContent: "center" }}>
      {/* Blobs */}
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            width: dim * 0.72,
            height: dim * 0.72,
            borderRadius: dim,
            backgroundColor: dark ? "rgba(62,130,149,0.22)" : accentColor + "22",
            top: 0,
            right: 0,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            width: dim * 0.55,
            height: dim * 0.55,
            borderRadius: dim,
            backgroundColor: dark ? "rgba(30,55,85,0.35)" : "rgba(30,55,85,0.08)",
            bottom: 2,
            left: 0,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.blob,
          {
            width: 18,
            height: 18,
            borderRadius: 6,
            backgroundColor: dark ? "rgba(62,130,149,0.35)" : accentColor + "33",
            top: 8,
            left: 10,
            transform: [{ rotate: "22deg" }],
          },
        ]}
      />

      {/* Icône principale */}
      <View
        style={{
          width: dim * 0.62,
          height: dim * 0.62,
          borderRadius: dim * 0.22,
          backgroundColor: softBg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1.5,
          borderColor: dark ? "rgba(62,130,149,0.4)" : accentColor + "40",
          zIndex: 2,
        }}
      >
        <Ionicons
          name={primary.name}
          size={primary.size || (size === "lg" ? 34 : size === "sm" ? 22 : 28)}
          color={primary.color || accentColor}
        />
      </View>

      {/* Satellites */}
      {satellites[0] ? (
        <View
          style={[
            styles.sat,
            {
              top: 4,
              right: 2,
              backgroundColor: dark ? "#1C1C1C" : "#fff",
              borderColor: dark ? "rgba(62,130,149,0.45)" : (satellites[0].color || brandNavy) + "33",
            },
          ]}
        >
          <Ionicons
            name={satellites[0].name}
            size={satellites[0].size || 14}
            color={satellites[0].color || brandNavy}
          />
        </View>
      ) : null}
      {satellites[1] ? (
        <View
          style={[
            styles.sat,
            {
              bottom: 6,
              right: 8,
              backgroundColor: dark ? "#1C1C1C" : "#fff",
              borderColor: dark ? "rgba(62,130,149,0.45)" : (satellites[1].color || accentColor) + "33",
            },
          ]}
        >
          <Ionicons
            name={satellites[1].name}
            size={satellites[1].size || 13}
            color={satellites[1].color || accentColor}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Carte illustration réutilisable (cluster + titre + sous-titre). */
export function StoryArt({
  preset,
  title,
  subtitle,
  dark = false,
  compact = false,
  style,
  icons,
}: {
  preset?: StoryPreset;
  title?: string;
  subtitle?: string;
  dark?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  icons?: IconSlot[];
}) {
  const cfg = PRESETS[preset || "welcome"];
  const list = icons || cfg.icons;
  const accent = dark && preset === "urgence" ? "#F87171" : cfg.accent;
  const soft = dark
    ? preset === "urgence"
      ? "#1A1010"
      : "rgba(62,130,149,0.18)"
    : cfg.soft;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: dark ? "#161616" : "#fff",
          borderColor: dark ? "#2A2A2A" : C.border,
          paddingVertical: compact ? 14 : 18,
          paddingHorizontal: compact ? 14 : 16,
        },
        style,
      ]}
    >
      <CardDecor
        variant={preset === "urgence" ? "calm" : preset === "rdv" ? "soft" : "teal"}
        dark={dark}
      />
      <View style={{ alignItems: "center", zIndex: 1 }}>
        <IconCluster icons={list} dark={dark} size={compact ? "sm" : "md"} accent={accent} soft={soft} />
        {title ? (
          <Text
            style={{
              color: dark ? "#F5F5F5" : brandNavy,
              fontWeight: "800",
              fontSize: compact ? 15 : 17,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            style={{
              color: dark ? "#A3A3A3" : C.muted,
              fontSize: compact ? 12 : 13,
              textAlign: "center",
              marginTop: 4,
              lineHeight: 18,
              paddingHorizontal: 8,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Bandeau section compact (icône + label) pour Paramètres / listes. */
export function SectionArt({
  icon,
  label,
  dark = false,
  tone = "teal",
}: {
  icon: StoryIcon;
  label: string;
  dark?: boolean;
  tone?: "teal" | "navy" | "amber" | "emergency";
}) {
  const color =
    tone === "navy"
      ? brandNavy
      : tone === "amber"
        ? dark
          ? "#FCD34D"
          : "#B45309"
        : tone === "emergency"
          ? C.emergency
          : brandBlue;
  const bg = dark
    ? tone === "emergency"
      ? "#1A1010"
      : "rgba(62,130,149,0.18)"
    : tone === "amber"
      ? C.amberSoft
      : tone === "emergency"
        ? C.redSoft
        : tone === "navy"
          ? "#EEF1F4"
          : C.lightBlue;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 2 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: color + "33",
        }}
      >
        <Ionicons name={icon} size={14} color={dark && tone === "navy" ? "#E5E5E5" : color} />
      </View>
      <Text
        style={{
          color: dark ? "#A3A3A3" : C.muted,
          fontSize: 11,
          fontWeight: "800",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Mini rangée d’icônes décoratives (hero / headers). */
export function IconRibbon({
  icons,
  dark = false,
}: {
  icons: StoryIcon[];
  dark?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
      {icons.map((name, i) => (
        <View
          key={`${name}-${i}`}
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            backgroundColor: dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.18)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.22)",
          }}
        >
          <Ionicons name={name} size={16} color="#fff" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: brandNavy,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  blob: {
    position: "absolute",
  },
  sat: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    zIndex: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
