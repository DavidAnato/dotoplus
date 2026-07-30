import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../ui";
import { C, Profile, brandNavy, darkC } from "../theme";
import { getFirstCardChecks, isReadyForFirstCard } from "../profileReady";

/** Checklist UX avant la première émission de DotoCard. */
export function FirstCardGate({
  user,
  dark,
  busy,
  offline,
  onCompleteProfile,
  onIssue,
}: {
  user: Profile;
  dark?: boolean;
  busy?: boolean;
  offline?: boolean;
  onCompleteProfile: () => void;
  onIssue: () => void;
}) {
  const colors = dark ? darkC : C;
  const checks = getFirstCardChecks(user);
  const ready = isReadyForFirstCard(user);
  const doneCount = checks.filter((c) => c.done).length;
  const progress = doneCount / checks.length;

  const accent = dark ? C.blue : brandNavy;
  const heroIconBg = dark ? "#1C2A2E" : "#E8F2F5";
  const rowDoneBg = dark ? "#14201A" : "#ECFDF5";
  const rowDoneBorder = dark ? "#1F3D2E" : "#A7F3D0";
  const rowTodoBg = dark ? "#1A1A1A" : "#F8FAFC";
  const iconDoneBg = dark ? "#1F3D2E" : "#D1FAE5";
  const iconTodoBg = dark ? "#1C2A2E" : "#E8F2F5";
  const checkColor = dark ? "#4ADE80" : C.green;

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: colors.white,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: heroIconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="card-outline" size={26} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>
            Première DotoCard
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2, lineHeight: 18 }}>
            Quelques infos essentielles suffisent. Le reste (sang, allergies…) reste optionnel.
          </Text>
        </View>
      </View>

      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>
            Progression
          </Text>
          <Text style={{ color: accent, fontSize: 12, fontWeight: "800" }}>
            {doneCount}/{checks.length}
          </Text>
        </View>
        <View
          style={{
            height: 8,
            borderRadius: 99,
            backgroundColor: dark ? "#2A2A2A" : colors.border,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: "100%",
              backgroundColor: ready ? (dark ? "#4ADE80" : C.green) : C.blue,
              borderRadius: 99,
            }}
          />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {checks.map((c) => (
          <Pressable
            key={c.key}
            onPress={c.done ? undefined : onCompleteProfile}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 14,
              backgroundColor: c.done ? rowDoneBg : rowTodoBg,
              borderWidth: 1,
              borderColor: c.done ? rowDoneBorder : colors.border,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: c.done ? iconDoneBg : iconTodoBg,
              }}
            >
              <Ionicons
                name={c.done ? "checkmark" : c.icon}
                size={18}
                color={c.done ? checkColor : accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 14 }}>{c.label}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{c.hint}</Text>
            </View>
            {!c.done ? (
              <Ionicons name="chevron-forward" size={18} color={colors.grey} />
            ) : null}
          </Pressable>
        ))}
      </View>

      {ready ? (
        <Button
          title="Générer ma DotoCard"
          icon="sparkles-outline"
          color={dark ? C.blue : brandNavy}
          onPress={onIssue}
          loading={busy}
          disabled={offline || busy}
        />
      ) : (
        <Button
          title="Compléter les infos manquantes"
          icon="create-outline"
          color={C.blue}
          onPress={onCompleteProfile}
        />
      )}

      <Text style={{ color: colors.muted, fontSize: 11, textAlign: "center", lineHeight: 16 }}>
        Groupe sanguin, électrophorèse, filiation et adresse peuvent être ajoutés plus tard.
      </Text>
    </View>
  );
}
