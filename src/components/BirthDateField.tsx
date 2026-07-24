import React, { useEffect, useMemo, useState } from "react";
import {
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

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function isDarkColors(colors: ThemeColors) {
  return colors.bg === darkC.bg || colors.white === darkC.white;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Parse AAAA-MM-JJ ou JJ/MM/AAAA → Date locale. */
export function parseBirthDate(raw?: string): Date | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const fr = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDisplay(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function clampParts(y: number, m: number, d: number) {
  const maxY = new Date().getFullYear() - 1;
  const year = Math.min(maxY, Math.max(1920, y));
  const month = Math.min(11, Math.max(0, m));
  const day = Math.min(daysInMonth(year, month), Math.max(1, d));
  return { year, month, day };
}

function tryCommit(
  dayStr: string,
  month: number | null,
  yearStr: string,
  onChange: (iso: string) => void
) {
  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);
  if (!day || month == null || !year) return false;
  if (year < 1920 || year > new Date().getFullYear() - 1) return false;
  if (day < 1 || day > 31) return false;
  const c = clampParts(year, month, day);
  onChange(toIsoDate(new Date(c.year, c.month, c.day)));
  return true;
}

/** Date de naissance : jour + année saisis, mois via modal simple. */
export function BirthDateField({
  label = "Date de naissance",
  value,
  onChange,
  colors = C,
}: {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  colors?: ThemeColors;
}) {
  const dark = isDarkColors(colors);
  const parsed = parseBirthDate(value);
  const [day, setDay] = useState(parsed ? String(parsed.getDate()) : "");
  const [year, setYear] = useState(parsed ? String(parsed.getFullYear()) : "");
  const [month, setMonth] = useState<number | null>(parsed ? parsed.getMonth() : null);
  const [monthOpen, setMonthOpen] = useState(false);

  useEffect(() => {
    if (!parsed) return;
    setDay(String(parsed.getDate()));
    setYear(String(parsed.getFullYear()));
    setMonth(parsed.getMonth());
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo(() => {
    if (!parsed) return null;
    return formatDisplay(parsed);
  }, [parsed]);

  const commit = (nextDay = day, nextMonth = month, nextYear = year) => {
    tryCommit(nextDay, nextMonth, nextYear, onChange);
  };

  const sheetBg = dark ? darkC.white : "#FAFBFC";
  const chipBg = dark ? "#1A1A1A" : "#fff";
  const chipBorder = dark ? darkC.border : "#E8EEF2";
  const chipText = dark ? darkC.text : "#334155";
  const titleColor = dark ? darkC.text : brandNavy;
  const hintColor = dark ? darkC.grey : "#94A3B8";

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.label, { color: dark ? colors.text : C.navy }]}>{label}</Text>

      <View style={styles.row}>
        <View style={[styles.cell, { flex: 0.9 }]}>
          <Text style={[styles.hint, { color: hintColor }]}>Jour</Text>
          <TextInput
            value={day}
            onChangeText={(t) => {
              const v = t.replace(/\D/g, "").slice(0, 2);
              setDay(v);
            }}
            onBlur={() => commit()}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="JJ"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { borderColor: colors.border, backgroundColor: colors.white, color: colors.text },
            ]}
          />
        </View>

        <View style={[styles.cell, { flex: 1.6 }]}>
          <Text style={[styles.hint, { color: hintColor }]}>Mois</Text>
          <Pressable
            onPress={() => setMonthOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choisir le mois"
            style={[
              styles.input,
              styles.monthBtn,
              { borderColor: colors.border, backgroundColor: colors.white },
            ]}
          >
            <Text
              style={{
                flex: 1,
                color: month != null ? colors.text : colors.muted,
                fontWeight: month != null ? "700" : "500",
                fontSize: 14,
                textTransform: "capitalize",
              }}
              numberOfLines={1}
            >
              {month != null ? MONTHS_FR[month] : "Mois"}
            </Text>
            <Ionicons name="chevron-down" size={16} color={dark ? C.blue : brandNavy} />
          </Pressable>
        </View>

        <View style={[styles.cell, { flex: 1.1 }]}>
          <Text style={[styles.hint, { color: hintColor }]}>Année</Text>
          <TextInput
            value={year}
            onChangeText={(t) => {
              const v = t.replace(/\D/g, "").slice(0, 4);
              setYear(v);
            }}
            onBlur={() => commit()}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="AAAA"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              { borderColor: colors.border, backgroundColor: colors.white, color: colors.text },
            ]}
          />
        </View>
      </View>

      {preview ? (
        <Text style={[styles.preview, { color: C.blue }]}>{preview}</Text>
      ) : (
        <Text style={[styles.preview, { color: colors.muted, fontWeight: "500" }]}>
          Ex. 12 · mars · 1995
        </Text>
      )}

      <SheetModal
        visible={monthOpen}
        onClose={() => setMonthOpen(false)}
        maxHeight="58%"
        sheetStyle={{ backgroundColor: sheetBg, paddingBottom: 20 }}
        handleColor={dark ? "#404040" : "#D1D5DB"}
      >
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { color: titleColor }]}>Mois</Text>
          <Pressable onPress={() => setMonthOpen(false)} hitSlop={12}>
            <Ionicons name="close" size={22} color={dark ? darkC.muted : "#94A3B8"} />
          </Pressable>
        </View>
        <View style={styles.monthGrid}>
          {MONTHS_FR.map((name, i) => {
            const active = month === i;
            return (
              <Pressable
                key={name}
                onPress={() => {
                  setMonth(i);
                  setMonthOpen(false);
                  commit(day, i, year);
                }}
                style={[
                  styles.monthChip,
                  {
                    backgroundColor: active ? (dark ? C.blue : brandNavy) : chipBg,
                    borderColor: active ? (dark ? C.blue : brandNavy) : chipBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    { color: active ? "#fff" : chipText },
                    active && { fontWeight: "800" },
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  cell: { gap: 4 },
  hint: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  monthBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    textAlign: "left",
  },
  preview: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  monthChip: {
    width: "31%",
    flexGrow: 1,
    minWidth: "30%",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
