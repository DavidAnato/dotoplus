import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, brandNavy, darkC } from "../theme";
import { SheetModal } from "./SheetModal";

type ThemeColors = typeof C;

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  colors?: ThemeColors;
  placeholder?: string;
  allowManual?: boolean;
  subtitleFor?: (item: string) => string | undefined;
  icon?: keyof typeof Ionicons.glyphMap;
};

function isDarkColors(colors: ThemeColors) {
  return colors.bg === darkC.bg || colors.white === darkC.white;
}

/**
 * Sélecteur searchable.
 * La barre de recherche sert aussi de saisie libre : si rien ne correspond,
 * une proposition « Utiliser "…" » évite de retaper en mode manuel.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  colors = C,
  placeholder = "Choisir…",
  allowManual = true,
  subtitleFor,
  icon = "chevron-down",
}: Props) {
  const dark = isDarkColors(colors);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const needle = q.trim();
  const needleLower = needle.toLocaleLowerCase("fr");

  const filtered = useMemo(() => {
    if (!needleLower) return options;
    return options.filter((o) => o.toLocaleLowerCase("fr").includes(needleLower));
  }, [options, needleLower]);

  const exactMatch = useMemo(
    () => options.some((o) => o.toLocaleLowerCase("fr") === needleLower),
    [options, needleLower]
  );

  /** Proposer d’enregistrer la recherche telle quelle. */
  const showUseQuery = allowManual && needle.length > 0 && !exactMatch;

  const openModal = () => {
    setQ(value || "");
    setOpen(true);
  };

  const pick = (v: string) => {
    onChange(v.trim());
    setOpen(false);
    setQ("");
  };

  const sheetBg = dark ? darkC.white : "#fff";
  const titleColor = dark ? darkC.text : brandNavy;
  const searchBg = dark ? "#1A1A1A" : "#F8FAFC";
  const searchBorder = dark ? darkC.border : "#E5E7EB";
  const rowBorder = dark ? darkC.border : "#E5E7EB";
  const rowActiveBg = dark ? "#1C2A2E" : "#E8F2F5";
  const proposeBg = dark ? "#14201A" : "#F0FDF4";
  const proposeBorder = dark ? "#1F3D2E" : "#BBF7D0";

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.label, { color: dark ? colors.text : C.navy }]}>{label}</Text>
      <Pressable
        onPress={openModal}
        accessibilityRole="button"
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.white }]}
      >
        <Text
          style={{
            flex: 1,
            color: value ? colors.text : colors.muted,
            fontWeight: value ? "700" : "500",
            fontSize: 14,
          }}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name={icon} size={18} color={dark ? C.blue : brandNavy} />
      </Pressable>

      <SheetModal
        visible={open}
        onClose={() => setOpen(false)}
        maxHeight="78%"
        sheetStyle={{ backgroundColor: sheetBg, minHeight: "55%" }}
        handleColor={dark ? "#404040" : "#D1D5DB"}
      >
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { color: titleColor }]}>{label}</Text>
          <Pressable onPress={() => setOpen(false)} hitSlop={10}>
            <Ionicons name="close" size={22} color={dark ? darkC.muted : brandNavy} />
          </Pressable>
        </View>

        <View style={[styles.searchRow, { backgroundColor: searchBg, borderColor: searchBorder }]}>
          <Ionicons name="search" size={18} color={dark ? darkC.grey : "#94A3B8"} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={allowManual ? "Rechercher ou saisir…" : "Rechercher…"}
            placeholderTextColor={dark ? darkC.grey : "#9CA3AF"}
            style={{ flex: 1, fontSize: 15, color: dark ? darkC.text : "#0F172A", paddingVertical: 8 }}
            autoCorrect={false}
            autoFocus
            returnKeyType={showUseQuery ? "done" : "search"}
            onSubmitEditing={() => {
              if (showUseQuery) pick(needle);
              else if (filtered.length === 1) pick(filtered[0]);
            }}
          />
          {q.length > 0 ? (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={dark ? darkC.grey : "#94A3B8"} />
            </Pressable>
          ) : null}
        </View>

        {showUseQuery ? (
          <Pressable
            onPress={() => pick(needle)}
            style={[
              styles.propose,
              { backgroundColor: proposeBg, borderColor: proposeBorder },
            ]}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: dark ? "#1F3D2E" : "#D1FAE5",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={20} color={dark ? "#4ADE80" : "#16A34A"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: dark ? darkC.text : "#14532D", fontWeight: "800", fontSize: 14 }}>
                Utiliser « {needle} »
              </Text>
              <Text style={{ color: dark ? darkC.muted : "#166534", fontSize: 12, marginTop: 2 }}>
                {filtered.length === 0
                  ? "Aucun résultat - enregistrer cette saisie"
                  : "Pas de correspondance exacte - garder votre texte"}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={dark ? "#4ADE80" : "#16A34A"} />
          </Pressable>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 28 }}
          ListEmptyComponent={
            showUseQuery ? null : (
              <Text style={{ textAlign: "center", color: colors.muted, padding: 24 }}>
                {needle ? "Aucun résultat" : "Aucune option"}
              </Text>
            )
          }
          ListHeaderComponent={
            filtered.length > 0 && needle ? (
              <Text
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 4,
                  paddingBottom: 6,
                  color: colors.muted,
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                Suggestions
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const active = item === value;
            const sub = subtitleFor?.(item);
            return (
              <Pressable
                onPress={() => pick(item)}
                style={[
                  styles.row,
                  { borderBottomColor: rowBorder },
                  active && { backgroundColor: rowActiveBg },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.rowText,
                      { color: dark ? darkC.text : "#0F172A" },
                      active && { color: C.blue },
                    ]}
                  >
                    {item}
                  </Text>
                  {sub ? (
                    <Text style={[styles.rowSub, { color: dark ? darkC.grey : "#94A3B8" }]}>{sub}</Text>
                  ) : null}
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={C.blue} /> : null}
              </Pressable>
            );
          }}
        />
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  trigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sheetTitle: { fontWeight: "800", fontSize: 17 },
  searchRow: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  propose: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: { fontWeight: "700", fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 2 },
});
