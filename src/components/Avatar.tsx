import React from "react";
import { Image, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "../theme";

function initialsFrom(name?: string, first?: string, last?: string): string {
  if (first || last) {
    return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
  }
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Avatar circulaire - photo d'identité ou initiales sur dégradé premium. */
export function Avatar({
  uri,
  name,
  firstName,
  lastName,
  size = 48,
  style,
  bg: _bg,
  textColor = "#fff",
  ring = true,
}: {
  uri?: string | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  size?: number;
  style?: ViewStyle;
  /** Conservé pour compat - le fallback utilise le dégradé marque. */
  bg?: string;
  textColor?: string;
  ring?: boolean;
}) {
  const initials = initialsFrom(name, firstName, lastName);
  const radius = size / 2;
  const ringW = Math.max(1.5, size * 0.04);

  if (uri) {
    return (
      <View
        style={[
          ring
            ? {
                padding: ringW,
                borderRadius: radius + ringW,
                backgroundColor: "rgba(62, 130, 149, 0.35)",
              }
            : undefined,
          style,
        ]}
      >
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: C.navy,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        ring
          ? {
              padding: ringW,
              borderRadius: radius + ringW,
              backgroundColor: "rgba(62, 130, 149, 0.35)",
            }
          : undefined,
        style,
      ]}
    >
      <LinearGradient
        colors={["#1E3755", "#2A5470", "#3E8295"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: textColor, fontWeight: "800", fontSize: size * 0.32, letterSpacing: 0.5 }}>
          {initials}
        </Text>
      </LinearGradient>
    </View>
  );
}
