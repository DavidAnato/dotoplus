import React from "react";
import { Text, View, ViewStyle, StyleProp } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  C,
  Profile,
  darkC,
  displayAllergies,
  displayMedicalValue,
  allergiesLabel,
} from "../theme";
import { IconBadge } from "../motion";

type Colors = typeof C;

type Accent = "blood" | "electro" | "allergy" | "neutral";

function accentTokens(kind: Accent, dark: boolean, colors: Colors) {
  if (kind === "blood") {
    return {
      icon: "water" as const,
      color: dark ? "#FCA5A5" : C.red,
      soft: dark ? "#2A1515" : C.redSoft,
      border: dark ? "#7F1D1D" : C.red + "44",
    };
  }
  if (kind === "electro") {
    return {
      icon: "flask" as const,
      color: dark ? "#5EEAD4" : C.blue,
      soft: dark ? "#12201E" : C.lightBlue,
      border: dark ? "#134E4A" : C.blue + "44",
    };
  }
  if (kind === "allergy") {
    return {
      icon: "warning" as const,
      color: dark ? "#FCD34D" : C.amber,
      soft: dark ? "#2A2110" : C.amberSoft,
      border: dark ? "#78350F" : C.amber + "44",
    };
  }
  return {
    icon: "information-circle" as const,
    color: colors.muted,
    soft: colors.lightBlue,
    border: colors.border,
  };
}

/** Ligne critique : badge icône + libellé + valeur (contraste dark/light). */
export function CriticalInfoRow({
  label,
  value,
  kind,
  dark = false,
  last = false,
}: {
  label: string;
  value: string;
  kind: Accent;
  dark?: boolean;
  last?: boolean;
}) {
  const colors = dark ? darkC : C;
  const a = accentTokens(kind, dark, colors);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: a.soft,
          borderWidth: 1,
          borderColor: a.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={a.icon} size={18} color={a.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: colors.muted,
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 0.3,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontWeight: "800",
            fontSize: 15,
            marginTop: 2,
          }}
          numberOfLines={3}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/** Carte infos critiques (groupe / électrophorèse / allergies). */
export function CriticalMedicalCard({
  user,
  dark = false,
  style,
}: {
  user: Profile;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = dark ? darkC : C;
  const allergies = displayAllergies(user.allergies);
  return (
    <View
      style={[
        {
          backgroundColor: colors.white,
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 4,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: 3,
          borderLeftColor: dark ? "#FCA5A5" : C.red,
        },
        style,
      ]}
    >
      <CriticalInfoRow
        label="Groupe sanguin"
        value={displayMedicalValue(user.bloodType)}
        kind="blood"
        dark={dark}
      />
      <CriticalInfoRow
        label="Électrophorèse"
        value={displayMedicalValue(user.electrophoresis)}
        kind="electro"
        dark={dark}
      />
      <CriticalInfoRow
        label="Allergies"
        value={allergies.join(" · ")}
        kind="allergy"
        dark={dark}
        last
      />
    </View>
  );
}

/** Bandeau compact Home (hero navy) — 3 cellules lisibles. */
export function CriticalHeroStrip({
  user,
}: {
  user: Profile;
}) {
  const cells = [
    {
      label: "Groupe",
      value: displayMedicalValue(user.bloodType),
      icon: "water" as const,
    },
    {
      label: "Électrophorèse",
      value: displayMedicalValue(user.electrophoresis),
      icon: "flask" as const,
    },
    {
      label: "Allergies",
      value: allergiesLabel(user.allergies),
      icon: "warning" as const,
    },
  ];
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
      {cells.map((c) => (
        <View
          key={c.label}
          style={{
            flex: 1,
            backgroundColor: "rgba(255,255,255,0.14)",
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.22)",
            minHeight: 78,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name={c.icon} size={12} color="rgba(255,255,255,0.85)" />
            <Text
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: 9,
                fontWeight: "800",
                letterSpacing: 0.2,
                textTransform: "uppercase",
              }}
              numberOfLines={1}
            >
              {c.label}
            </Text>
          </View>
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "800",
              fontSize: c.label === "Allergies" ? 12 : 16,
              marginTop: 6,
              lineHeight: c.label === "Allergies" ? 16 : 20,
            }}
            numberOfLines={2}
          >
            {c.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function CriticalChip({
  label,
  dark = false,
  kind = "allergy",
}: {
  label: string;
  dark?: boolean;
  kind?: Accent;
}) {
  const colors = dark ? darkC : C;
  const a = accentTokens(kind, dark, colors);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: a.soft,
        borderWidth: 1,
        borderColor: a.border,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 7,
      }}
    >
      <Ionicons name={a.icon} size={13} color={a.color} />
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** Petite pastille icône pour raccourcis (ex. RDV) avec contraste dark. */
export function ThemedIconBadge({
  name,
  dark = false,
  size = 40,
  tone = "calendar",
}: {
  name: keyof typeof Ionicons.glyphMap;
  dark?: boolean;
  size?: number;
  tone?: "calendar" | "default";
}) {
  if (tone === "calendar") {
    const color = dark ? "#FCD34D" : "#B45309";
    const bg = dark ? "#2A2110" : "#FEF3C7";
    const border = dark ? "#78350F" : "#F59E0B55";
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: border,
        }}
      >
        <Ionicons name={name} size={size * 0.48} color={color} />
      </View>
    );
  }
  return <IconBadge name={name} size={size} />;
}
