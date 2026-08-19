import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, brandNavy, onBrand } from "./theme";
import { PressScale, IconBadge, CardDecor } from "./motion";
import { BJ_DIAL, formatNational, nationalDigits, toE164Bj, toE164BjRaw } from "./phone";
import { useScreenInsets } from "./safeArea";

export type ThemeColors = typeof C;

/** Échelle d’espacement normalisée */
export const space = { xs: 8, sm: 12, md: 16, lg: 24 } as const;

function pillTextChildren(children: React.ReactNode): boolean {
  return React.Children.toArray(children).every(
    (c) =>
      c == null ||
      typeof c === "boolean" ||
      typeof c === "string" ||
      typeof c === "number"
  );
}

export function Pill({
  children,
  color = C.blue,
  bg = C.lightBlue,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <View style={[s.pill, { backgroundColor: bg, borderColor: color + "28" }]}>
      {pillTextChildren(children) ? (
        <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function Card({
  children,
  style,
  colors = C,
  onPress,
  decor = "soft",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  colors?: ThemeColors;
  onPress?: () => void;
  decor?: "soft" | "teal" | "navy" | "calm" | "none";
}) {
  const darkish = colors.bg === "#0A0A0A" || colors.bg === "#111111" || colors.white === "#161616";
  const base: StyleProp<ViewStyle> = [
    s.card,
    {
      backgroundColor: colors.white,
      borderColor: colors.border,
      shadowColor: "#1E3755",
      overflow: "hidden",
    },
    style,
  ];
  // CardDecor is absolute + pointerEvents none - keep children as direct layout children
  // so flexDirection / gap / alignItems on `style` apply correctly.
  const inner = (
    <>
      {decor !== "none" ? <CardDecor variant={decor} dark={darkish} /> : null}
      {children}
    </>
  );
  if (onPress) {
    return (
      <PressScale onPress={onPress} style={base}>
        {inner}
      </PressScale>
    );
  }
  return <View style={base}>{inner}</View>;
}

export function SectionLabel({
  children,
  color = C.navy,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return <Text style={[s.sectionLabel, { color }]}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  color = C.blue,
  outline = false,
  disabled = false,
  loading = false,
  icon,
  compact = false,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  outline?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Bouton plus étroit (chips / actions secondaires en ligne) */
  compact?: boolean;
}) {
  const isInactive = disabled || loading;
  const bg = outline
    ? "transparent"
    : isInactive && !loading
      ? "#9CA3AF"
      : color;
  const borderCol = outline ? (isInactive && !loading ? "#9CA3AF" : color) : undefined;
  const fg = outline ? (isInactive && !loading ? "#9CA3AF" : color) : onBrand;
  return (
    <PressScale
      onPress={onPress}
      disabled={isInactive}
      style={[
        s.btn,
        compact && s.btnCompact,
        outline
          ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: borderCol }
          : {
              backgroundColor: bg,
              shadowColor: isInactive ? "transparent" : color,
              shadowOpacity: isInactive ? 0 : 0.22,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: isInactive ? 0 : 2,
            },
        loading && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={s.btnInner}>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={fg} /> : null}
          <Text
            style={{
              color: fg,
              fontWeight: "800",
              fontSize: compact ? 13 : 15,
              letterSpacing: 0.2,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      )}
    </PressScale>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  colors = C,
  maxLength,
  disabled = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  colors?: ThemeColors;
  maxLength?: number;
  disabled?: boolean;
  multiline?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const isSecret = !!secureTextEntry;
  const labelColor = colors.navy === C.navy ? C.navy : colors.text;
  const inputBg = disabled
    ? colors.bg === C.bg
      ? "#EEF1F4"
      : "#1A1A1A"
    : colors.bg === C.bg
      ? colors.white
      : colors.bg;

  return (
    <View style={{ marginBottom: space.md, opacity: disabled ? 0.72 : 1 }}>
      <Text style={[s.fieldLabel, { color: labelColor }]}>{label}</Text>
      <View>
        <TextInput
          style={[
            s.input,
            {
              borderColor: disabled ? (colors.bg === C.bg ? "#D0D7DE" : "#2A2A2A") : colors.border,
              backgroundColor: inputBg,
              color: disabled ? colors.muted : colors.text,
              paddingRight: isSecret ? 48 : 14,
            },
            multiline ? { minHeight: 88, textAlignVertical: "top" as const } : null,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.grey}
          secureTextEntry={isSecret && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={multiline ? "sentences" : "none"}
          maxLength={maxLength}
          editable={!disabled}
          multiline={multiline}
          accessibilityState={{ disabled }}
        />
        {isSecret ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            hitSlop={8}
            disabled={disabled}
            style={s.eyeBtn}
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Téléphone BJ : +229 verrouillé à gauche, numéro national à droite.
 * Le 01 est injecté dès la frappe si l’utilisateur ne le saisit pas.
 */
export function PhoneField({
  label,
  value,
  onChangeText,
  placeholder = "XX XX XX XX XX",
  colors = C,
  disabled = false,
}: {
  label: string;
  value: string;
  onChangeText: (full: string) => void;
  placeholder?: string;
  colors?: ThemeColors;
  disabled?: boolean;
}) {
  const darkish = colors.bg === "#0A0A0A" || colors.white === "#161616";
  const labelColor = colors.navy === C.navy ? C.navy : colors.text;
  const inputBg = disabled
    ? colors.bg === C.bg
      ? "#EEF1F4"
      : "#1A1A1A"
    : colors.bg === C.bg
      ? colors.white
      : colors.bg;
  const local = formatNational(nationalDigits(value));
  const dialColor = darkish ? "#E5E7EB" : brandNavy;
  const dialBg = darkish ? "#1F1F1F" : colors.lightBlue;

  return (
    <View style={{ marginBottom: space.md, opacity: disabled ? 0.72 : 1 }}>
      <Text style={[s.fieldLabel, { color: labelColor }]}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          borderWidth: 1.5,
          borderRadius: 14,
          borderColor: disabled ? (colors.bg === C.bg ? "#D0D7DE" : "#2A2A2A") : colors.border,
          backgroundColor: inputBg,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            paddingHorizontal: 12,
            justifyContent: "center",
            backgroundColor: dialBg,
            borderRightWidth: 1,
            borderRightColor: colors.border,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={{ fontWeight: "800", color: dialColor, fontSize: 15, letterSpacing: 0.3 }}>
            {BJ_DIAL}
          </Text>
        </View>
        <TextInput
          style={{
            flex: 1,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontSize: 15,
            color: disabled ? colors.muted : colors.text,
            letterSpacing: 0.6,
          }}
          value={local}
          onChangeText={(t) => onChangeText(toE164BjRaw(t))}
          placeholder={placeholder}
          placeholderTextColor={colors.grey}
          keyboardType="phone-pad"
          autoCapitalize="none"
          maxLength={14}
          editable={!disabled}
          accessibilityLabel={`${label}, indicatif ${BJ_DIAL}`}
          accessibilityState={{ disabled }}
        />
      </View>
    </View>
  );
}

/** Header navy : insets top (status bar / edge-to-edge). */
export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  colors?: ThemeColors;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { headerPad } = useScreenInsets();
  return (
    <View
      style={{
        backgroundColor: brandNavy,
        paddingHorizontal: space.md,
        paddingTop: headerPad,
        paddingBottom: space.md,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              marginLeft: -6,
              marginRight: 2,
            }}
          >
            <Ionicons name="chevron-back" size={28} color={onBrand} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ color: onBrand, fontSize: 20, fontWeight: "800", letterSpacing: 0.2 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 3 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={{ marginLeft: 8 }}>{right}</View> : null}
      </View>
    </View>
  );
}

export { IconBadge };

const s = StyleSheet.create({
  pill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 99,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  card: {
    borderRadius: 18,
    padding: space.md,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnCompact: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 14,
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  eyeBtn: {
    position: "absolute",
    right: 4,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 12,
    zIndex: 2,
  },
});
