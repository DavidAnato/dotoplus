/** Modal de consentement patient — demande d'accès pro (overlay global). */
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AccessRequestItem } from "../api";
import {
  useApproveAccessMutation,
  useDenyAccessMutation,
  usePendingAccessRequests,
} from "../queries/hooks";
import { C, brandBlue, brandNavy, darkC, onBrand } from "../theme";
import { CardDecor, SuccessFlash, hapticLight, hapticSuccess } from "../motion";
import { useAppStore } from "../store/appStore";
import { playAccessRequestSound } from "../sounds";
import { Avatar } from "./Avatar";

function formatRemaining(expiresAt: string | null, now: number): string {
  if (!expiresAt) return "Sans échéance courte";
  const ms = new Date(expiresAt).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return "Demande expirée";
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `${mins} min restantes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min restantes` : `${h} h restantes`;
}

type ConsentModalProps = {
  visible: boolean;
  req: AccessRequestItem | null;
  dark?: boolean;
  onClosed?: (result: "approved" | "denied" | null, message?: string) => void;
};

export function ConsentModal({
  visible,
  req,
  dark = false,
  onClosed,
}: ConsentModalProps) {
  const colors = dark ? darkC : C;
  const approve = useApproveAccessMutation();
  const deny = useDenyAccessMutation();
  const [err, setErr] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const busy = approve.isPending || deny.isPending;
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (!visible || !req?.expires_at) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible, req?.expires_at, req?.id]);

  useEffect(() => {
    if (visible && req) {
      setErr("");
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) });
    } else {
      opacity.value = withTiming(0, { duration: 160 });
      scale.value = withTiming(0.96, { duration: 160 });
    }
  }, [visible, req?.id, opacity, scale]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const remaining = useMemo(
    () => formatRemaining(req?.expires_at ?? null, now),
    [req?.expires_at, now]
  );

  if (!req) return null;

  const name = req.requester_name || "Professionnel de santé";
  const role = req.requester_role_label || req.requester_role || "";

  const runApprove = async () => {
    setErr("");
    try {
      await approve.mutateAsync(req.id);
      hapticSuccess();
      onClosed?.("approved", "Accès autorisé");
    } catch (e: any) {
      hapticLight();
      setErr(e?.message || "Impossible d'autoriser");
    }
  };

  const runDeny = async () => {
    setErr("");
    try {
      await deny.mutateAsync(req.id);
      hapticLight();
      onClosed?.("denied", "Demande refusée");
    } catch (e: any) {
      hapticLight();
      setErr(e?.message || "Impossible de refuser");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        onClosed?.(null);
      }}
    >
      <View style={styles.root} pointerEvents="box-none">
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? "rgba(0,0,0,0.72)" : "rgba(15,23,42,0.55)" }]} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.white,
              borderColor: dark ? "rgba(62,130,149,0.35)" : "rgba(30,55,85,0.12)",
            },
            sheetStyle,
          ]}
        >
          <CardDecor variant="navy" dark={dark} />

          <View style={styles.headerRow}>
            <Avatar
              uri={req.requester_photo_url}
              name={name}
              size={48}
              bg={dark ? "rgba(62,130,149,0.28)" : C.lightBlue}
              textColor={brandNavy}
              style={{ borderWidth: 1, borderColor: brandBlue + "44" }}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 }}>
                DEMANDE D&apos;ACCÈS
              </Text>
              <Text style={{ color: dark ? colors.text : brandNavy, fontWeight: "800", fontSize: 18 }}>
                Consentement requis
              </Text>
            </View>
            <View
              style={[
                styles.lockBadge,
                { backgroundColor: dark ? "rgba(62,130,149,0.22)" : "rgba(62,130,149,0.12)" },
              ]}
            >
              <Ionicons name="shield-checkmark" size={20} color={brandBlue} />
            </View>
          </View>

          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4, zIndex: 1 }}>
            Un professionnel demande à consulter votre dossier médical.
          </Text>

          <View
            style={[
              styles.proCard,
              {
                backgroundColor: dark ? "rgba(0,0,0,0.55)" : "rgba(232,242,245,0.85)",
                borderColor: dark ? "rgba(62,130,149,0.28)" : "rgba(62,130,149,0.22)",
              },
            ]}
          >
            <Text style={{ color: dark ? colors.text : brandNavy, fontWeight: "800", fontSize: 16 }}>
              {name}
            </Text>
            {role ? (
              <View style={styles.metaRow}>
                <Ionicons name="medical-outline" size={14} color={brandBlue} />
                <Text style={{ color: colors.muted, fontSize: 13, flex: 1 }}>{role}</Text>
              </View>
            ) : null}
            {req.structure ? (
              <View style={styles.metaRow}>
                <Ionicons name="business-outline" size={14} color={brandBlue} />
                <Text style={{ color: colors.muted, fontSize: 13, flex: 1 }}>{req.structure}</Text>
              </View>
            ) : null}
          </View>

          {req.reason ? (
            <View style={[styles.reasonBox, { borderColor: colors.border }]}>
              <View style={styles.metaRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700" }}>Motif</Text>
              </View>
              <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
                {req.reason}
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={15} color={brandBlue} />
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700", flex: 1 }}>
              {remaining}
            </Text>
          </View>

          {err ? (
            <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)}>
              <Text style={{ color: C.emergency, fontWeight: "700", fontSize: 12 }}>{err}</Text>
            </Animated.View>
          ) : null}

          <View style={{ gap: 10, marginTop: 6, zIndex: 1 }}>
            <Pressable
              onPress={runApprove}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: brandBlue,
                  opacity: busy ? 0.55 : pressed ? 0.9 : 1,
                },
              ]}
            >
              {busy && approve.isPending ? (
                <ActivityIndicator color={onBrand} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={onBrand} />
                  <Text style={styles.primaryLabel}>Autoriser</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={runDeny}
              disabled={busy}
              style={({ pressed }) => [
                styles.outlineBtn,
                {
                  borderColor: dark ? "rgba(148,163,184,0.45)" : "rgba(30,55,85,0.28)",
                  opacity: busy ? 0.55 : pressed ? 0.88 : 1,
                },
              ]}
            >
              {busy && deny.isPending ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color={dark ? colors.text : brandNavy} />
                  <Text style={[styles.outlineLabel, { color: dark ? colors.text : brandNavy }]}>
                    Refuser
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => onClosed?.(null)}
              disabled={busy}
              style={({ pressed }) => [
                {
                  alignItems: "center",
                  paddingVertical: 10,
                  opacity: busy ? 0.5 : pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text style={{ color: colors.muted, fontWeight: "700", fontSize: 13 }}>
                Plus tard
              </Text>
            </Pressable>
          </View>

          <Text
            style={{
              color: colors.grey,
              fontSize: 11,
              textAlign: "center",
              marginTop: 4,
              zIndex: 1,
              lineHeight: 15,
            }}
          >
            Vous gardez le contrôle — révocable à tout moment dans Alertes.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Host global : affiche le modal dès qu'une demande pending existe (tous onglets). */
export function ConsentModalHost() {
  const dark = useAppStore((s) => s.dark);
  const phase = useAppStore((s) => s.phase);
  const setPendingConsentId = useAppStore((s) => s.setPendingConsentId);
  const pending = usePendingAccessRequests(phase === "main");
  const list = pending.data || [];
  const [snoozedIds, setSnoozedIds] = useState<number[]>([]);
  const req = list.find((r) => !snoozedIds.includes(r.id)) ?? null;

  const [flash, setFlash] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  useEffect(() => {
    setPendingConsentId(req?.id ?? null);
  }, [req?.id, setPendingConsentId]);

  useEffect(() => {
    if (!req?.id) return;
    void playAccessRequestSound();
  }, [req?.id]);

  useEffect(() => {
    if (!flash.visible) return;
    const t = setTimeout(() => setFlash((f) => ({ ...f, visible: false })), 2200);
    return () => clearTimeout(t);
  }, [flash.visible, flash.message]);

  // Retirer les snooze si la demande n'est plus pending.
  useEffect(() => {
    const ids = new Set(list.map((r) => r.id));
    setSnoozedIds((prev) => prev.filter((id) => ids.has(id)));
  }, [list]);

  if (phase !== "main") return null;

  return (
    <>
      <ConsentModal
        visible={!!req}
        req={req}
        dark={dark}
        onClosed={(result, message) => {
          if (result === null && req?.id) {
            setSnoozedIds((prev) => (prev.includes(req.id) ? prev : [...prev, req.id]));
          }
          if (message) setFlash({ visible: true, message });
        }}
      />
      {flash.visible ? (
        <View pointerEvents="none" style={styles.flashWrap}>
          <SuccessFlash visible message={flash.message} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  sheet: {
    borderRadius: 24,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: brandNavy,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  lockBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  proCard: {
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    zIndex: 1,
  },
  reasonBox: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    zIndex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 1,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryLabel: {
    color: onBrand,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  outlineBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  outlineLabel: {
    fontWeight: "800",
    fontSize: 15,
  },
  flashWrap: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
});
