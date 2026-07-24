import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Profile, brandNavy, allergiesLabel } from "../theme";
import { displayPhoneBj } from "../phone";

const CARD_W = Math.min(Dimensions.get("window").width - 48, 360);
const CARD_H = Math.round(CARD_W * 0.7);

type Props = {
  user: Profile;
  token: string | null;
  cardId?: number | string;
  expiry?: string;
};

function fmtBirth(raw?: string) {
  if (!raw) return "—";
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return raw;
}

function Field({ label, value, bold = true }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ marginBottom: 5 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={[s.fieldValue, bold && { fontWeight: "800" }]} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

/** Disposition alignée sur le modèle PDF Assuré (photo | identité | QR). */
function CardFront({ user, token, cardId }: Props) {
  return (
    <View style={s.face}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Carte d'accès santé</Text>
        <Text style={s.headerRight}>République du Bénin</Text>
      </View>

      <View style={s.body}>
        <View style={s.bodyTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.brand}>
              Doto<Text style={{ color: "#5BA3B5" }}>Card</Text>
            </Text>
            <Text style={s.cardNo}>Carte N°: {cardId ?? "—"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.fieldLabel}>NPI</Text>
            <Text style={[s.fieldValue, { fontSize: 10, fontFamily: "monospace" }]}>
              {user.npi || "—"}
            </Text>
          </View>
        </View>

        <View style={s.idRow}>
          <View style={s.photoBox}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={s.photo} />
            ) : (
              <Ionicons name="person" size={28} color="#9CA3AF" />
            )}
          </View>

          <View style={{ flex: 1, paddingHorizontal: 8 }}>
            <Field label="Nom" value={(user.lastName || "").toUpperCase()} />
            <Field label="Prénoms" value={user.firstName || "—"} />
            <Field label="Date de naissance" value={fmtBirth(user.birthDate)} />
            <Field label="Lieu de naissance" value={user.birthPlace || "—"} bold={false} />
          </View>

          <View style={{ alignItems: "center", width: 100 }}>
            {token ? (
              <View style={s.qrWrap}>
                <QRCode value={token} size={88} ecl="M" backgroundColor="#fff" color="#101110" />
              </View>
            ) : (
              <View style={[s.qrWrap, { width: 94, height: 94, alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="qr-code-outline" size={36} color="#9CA3AF" />
              </View>
            )}
            <Text style={[s.fieldLabel, { marginTop: 4 }]}>Num. tél</Text>
            <Text style={[s.fieldValue, { fontSize: 8 }]} numberOfLines={2}>
              {displayPhoneBj(user.phone, "—")}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.emergency}>
        <View style={s.emCol}>
          <Text style={s.emLabel}>Groupe sanguin</Text>
          <Text style={s.emValue}>{user.bloodType || "—"}</Text>
        </View>
        <View style={[s.emCol, { flex: 1.4 }]}>
          <Text style={s.emLabel}>Allergies connues</Text>
          <Text style={[s.emValue, { fontSize: 9 }]} numberOfLines={2}>
            {allergiesLabel(user.allergies)}
          </Text>
        </View>
        <View style={s.emCol}>
          <Text style={s.emLabel}>Urgence</Text>
          <Text style={[s.emValue, { fontSize: 9 }]} numberOfLines={2}>
            {displayPhoneBj(user.emergencyPhone, "—")}
          </Text>
        </View>
      </View>
    </View>
  );
}

function CardBack({ user, expiry }: Props) {
  const insured = !!user.hasInsurance && !!user.insurer;
  return (
    <View style={s.face}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Informations complémentaires</Text>
      </View>
      <View style={[s.body, { paddingTop: 10 }]}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Filiation</Text>
            <Text style={s.metaLine}>Père: {user.fatherName || "—"}</Text>
            <Text style={s.metaLine}>Mère: {user.motherName || "—"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Adresse de résidence</Text>
            <Text style={s.metaLine}>Com. {user.addressCommune || "—"}</Text>
            <Text style={s.metaLine}>Qtr: {user.addressQuartier || "—"}</Text>
          </View>
        </View>
      </View>
      {insured ? (
        <View style={s.insurance}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={s.insTitle}>COUVERTURE ASSURANTIELLE</Text>
            <Text style={s.insTel}>Tél: +229 21 30 31 30</Text>
          </View>
          <Text style={s.insProvider} numberOfLines={1}>
            {user.insurer}
          </Text>
          <Text style={s.insMeta} numberOfLines={1}>
            Police: {user.policyNumber || "—"}
          </Text>
          <View style={s.pills}>
            {["Consult. —", "Soins. —", "Pharma. —"].map((t) => (
              <View key={t} style={s.pill}>
                <Text style={s.pillText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={s.uninsured}>
          <Text style={s.insTitle}>COUVERTURE ASSURANTIELLE</Text>
          <Text style={s.uninsuredTitle}>Non Assuré</Text>
          <Text style={s.uninsuredHint}>Soins à paiement direct auprès des structures partenaires</Text>
          <Text style={s.uninsuredHint}>Urgence vitale : dispositif national de paiement différé</Text>
        </View>
      )}
      <View style={s.footer}>
        <Text style={s.disclaimer} numberOfLines={2}>
          Cette carte est strictement personnelle, non-transférable et demeure la propriété de
          l'émetteur.*
        </Text>
        <Text style={s.validUntil}>Valable jusqu'au : {expiry || "—"}</Text>
      </View>
    </View>
  );
}

/**
 * Flip 3D simple v1 : gauche / droite uniquement, sans épaisseur.
 */
export function DodoCard3D(props: Props) {
  const flip = useSharedValue(0);
  const [showBack, setShowBack] = useState(false);

  const toggle = () => {
    const next = !showBack;
    setShowBack(next);
    flip.value = withTiming(next ? 1 : 0, { duration: 380 });
  };

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [0, 180], Extrapolation.CLAMP);
    const opacity = interpolate(flip.value, [0, 0.45, 0.55, 1], [1, 1, 0, 0], Extrapolation.CLAMP);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity,
      zIndex: flip.value < 0.5 ? 2 : 0,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flip.value, [0, 1], [180, 360], Extrapolation.CLAMP);
    const opacity = interpolate(flip.value, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolation.CLAMP);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${rotateY}deg` }],
      opacity,
      zIndex: flip.value >= 0.5 ? 2 : 0,
    };
  });

  return (
    <View style={{ width: CARD_W, alignItems: "center" }}>
      <Pressable onPress={toggle} style={{ width: CARD_W, height: CARD_H }}>
        <Animated.View style={[s.cardAbs, frontStyle]} pointerEvents={showBack ? "none" : "auto"}>
          <CardFront {...props} />
        </Animated.View>
        <Animated.View style={[s.cardAbs, backStyle]} pointerEvents={showBack ? "auto" : "none"}>
          <CardBack {...props} />
        </Animated.View>
      </Pressable>

      <Pressable onPress={toggle} style={s.flipBtn} accessibilityRole="button">
        <Ionicons name="sync-outline" size={16} color={brandNavy} />
        <Text style={s.flipBtnText}>{showBack ? "Voir le recto" : "Voir le verso"}</Text>
      </Pressable>
      <Text style={s.hint}>Touchez la carte pour la retourner</Text>
    </View>
  );
}

const s = StyleSheet.create({
  cardAbs: {
    position: "absolute",
    width: CARD_W,
    height: CARD_H,
    backfaceVisibility: "hidden",
  },
  face: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#1E3755",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  header: {
    backgroundColor: brandNavy,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 11 },
  headerRight: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "600" },
  body: { flex: 1, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 },
  bodyTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  brand: { color: brandNavy, fontWeight: "900", fontSize: 15, letterSpacing: 0.2 },
  cardNo: { color: "#6B7280", fontSize: 9, marginTop: 1 },
  idRow: { flexDirection: "row", alignItems: "flex-start", flex: 1 },
  photoBox: {
    width: 52,
    height: 64,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  fieldLabel: { color: "#9CA3AF", fontSize: 8, fontWeight: "700", textTransform: "uppercase" },
  fieldValue: { color: "#1F2937", fontSize: 11, fontWeight: "700" },
  qrWrap: {
    backgroundColor: "#fff",
    padding: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emergency: {
    backgroundColor: "#FCE8E8",
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F0C4C4",
  },
  emCol: { flex: 1 },
  emLabel: { color: "#8B1E1E", fontSize: 7, fontWeight: "700", textTransform: "uppercase" },
  emValue: { color: "#8B1E1E", fontSize: 11, fontWeight: "800", marginTop: 1 },
  sectionTitle: {
    color: "#6B7280",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  metaLine: { color: "#1F2937", fontSize: 10, marginBottom: 2, fontWeight: "600" },
  insurance: { backgroundColor: "#E8F5EE", paddingHorizontal: 10, paddingVertical: 8 },
  uninsured: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 8 },
  insTitle: { color: "#0F5C45", fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },
  insTel: { color: "#0F5C45", fontSize: 8, fontWeight: "600" },
  insProvider: { color: "#1F2937", fontSize: 12, fontWeight: "800", marginTop: 2 },
  insMeta: { color: "#6B7280", fontSize: 9, marginTop: 2 },
  pills: { flexDirection: "row", gap: 6, marginTop: 6 },
  pill: { backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { color: "#0F5C45", fontSize: 8, fontWeight: "800" },
  uninsuredTitle: { color: "#1F2937", fontSize: 13, fontWeight: "800", marginTop: 4 },
  uninsuredHint: { color: "#6B7280", fontSize: 9, marginTop: 2 },
  footer: { paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  disclaimer: { color: "#8B1E1E", fontSize: 7, textAlign: "center", lineHeight: 9 },
  validUntil: { color: "#1F2937", fontSize: 10, fontWeight: "800", marginTop: 3 },
  flipBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F2F5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  flipBtnText: { color: brandNavy, fontWeight: "800", fontSize: 13 },
  hint: { color: "#9CA3AF", fontSize: 11, marginTop: 6 },
});
