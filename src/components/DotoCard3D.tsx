import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
import { Profile, brandNavy } from "../theme";
import { displayPhoneBj } from "../phone";

const ARMOIRIES = require("../../assets/armoiries-benin.png") as number;

const NAVY = "#003462";
const TEAL = "#3d8ba8";
const RED = "#c01818";
const ORANGE = "#d03a00";
const BORDER = "#1f3a6e";
const LABEL = "#8b95a1";
const FRONT_BG = "#e3e3e9";
const BACK_BG = "#f7f7f7";
const BAND = "#f6d4d0";
const INS_BG = "#fde6dc";

type Props = {
  user: Profile;
  token: string | null;
  cardId?: number | string;
  expiry?: string;
};

type Box = {
  w: number;
  h: number;
  px: (n: number) => number;
  headerH: number;
  pad: number;
  photo: number;
  qr: number;
  radius: number;
  border: number;
};

function useCardBox(): Box {
  const { width } = useWindowDimensions();
  const w = Math.min(Math.max(width - 48, 260), 520);
  const h = w / 1.6;
  const s = w / 340;
  const px = (n: number) => Math.round(n * s * 10) / 10;
  const headerH = Math.round(h * 0.132);
  const pad = px(8);
  const photo = Math.round(h * 0.36);
  const qr = Math.round(Math.min(h * 0.3, photo * 0.92));
  return {
    w,
    h,
    px,
    headerH,
    pad,
    photo,
    qr,
    radius: w * (45 / 960),
    border: Math.max(2, w * (7 / 960)),
  };
}

function fmtBirth(raw?: string) {
  if (!raw) return "-";
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return raw;
}

function dash(value?: string | null) {
  const text = (value || "").trim();
  return text || "-";
}

function formatNpi(raw?: string) {
  const value = (raw || "").trim();
  if (!value) return "-";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return value;
}

function allergiesText(list?: string[] | null) {
  const items = (list || []).map((item) => String(item || "").trim()).filter(Boolean);
  return items.length ? items.join(", ") : "-";
}

function cardNumber(id?: number | string) {
  if (id === undefined || id === null || id === "") return "-";
  return String(id);
}

function Watermark({ width, height }: { width: number; height: number }) {
  const cross = width * 0.34;
  const thick = Math.max(8, width * 0.062);
  const disc = width * 0.58;
  const top = height * 0.3;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={{
          position: "absolute",
          width: disc,
          height: disc,
          borderRadius: disc / 2,
          borderWidth: Math.max(8, width * 0.04),
          borderColor: "rgba(168, 192, 214, 0.38)",
          left: (width - disc) / 2,
          top: height * 0.2,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: thick,
          height: cross,
          borderRadius: thick / 2,
          backgroundColor: "rgba(176, 198, 218, 0.42)",
          left: (width - thick) / 2,
          top,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: cross,
          height: thick,
          borderRadius: thick / 2,
          backgroundColor: "rgba(176, 198, 218, 0.42)",
          left: (width - cross) / 2,
          top: top + (cross - thick) / 2,
        }}
      />
    </View>
  );
}

function CardHeader({
  box,
  title,
  republic,
}: {
  box: Box;
  title: string;
  republic?: boolean;
}) {
  const arms = box.headerH * 0.78;
  return (
    <View
      style={{
        height: box.headerH,
        backgroundColor: NAVY,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: box.pad,
        gap: box.px(4),
      }}
    >
      <Text
        style={{ flex: 1, color: "#fff", fontWeight: "800", fontSize: box.px(12) }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {title}
      </Text>
      {republic ? (
        <Text
          style={{ color: "#fff", fontWeight: "600", fontSize: box.px(8.5), flexShrink: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          République du Bénin
        </Text>
      ) : null}
      {republic ? (
        <Image
          source={ARMOIRIES}
          style={{ width: arms * 1.15, height: arms }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

function IdentityField({
  label,
  value,
  box,
}: {
  label: string;
  value: string;
  box: Box;
}) {
  return (
    <View style={{ flexShrink: 1 }}>
      <Text style={{ color: LABEL, fontSize: box.px(7.5), fontWeight: "500" }} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={{ color: NAVY, fontSize: box.px(11.5), fontWeight: "800" }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {value}
      </Text>
    </View>
  );
}

function CardFront({ user, token, cardId, box }: Props & { box: Box }) {
  const [photoBroken, setPhotoBroken] = useState(false);
  useEffect(() => {
    setPhotoBroken(false);
  }, [user.photoUrl]);

  const lastName = (user.lastName || "").trim();

  return (
    <View style={[s.face, { borderRadius: box.radius, borderWidth: box.border, backgroundColor: FRONT_BG }]}>
      <Watermark width={box.w} height={box.h} />
      <CardHeader box={box} title="Carte d'accès santé" republic />
      <View style={{ flex: 1, paddingHorizontal: box.pad, paddingTop: box.px(4), paddingBottom: box.px(3) }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: box.px(6) }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "900", fontSize: box.px(18), letterSpacing: -0.3 }} numberOfLines={1}>
              <Text style={{ color: NAVY }}>Doto</Text>
              <Text style={{ color: TEAL }}>Card</Text>
            </Text>
            <Text
              style={{ color: NAVY, fontWeight: "800", fontSize: box.px(10), marginTop: 1 }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Carte N°: {cardNumber(cardId)}
            </Text>
          </View>
          <Text
            style={{
              color: NAVY,
              fontWeight: "800",
              fontSize: box.px(10),
              textDecorationLine: "underline",
              flexShrink: 1,
              textAlign: "right",
              maxWidth: "48%",
              marginTop: box.px(2),
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            NPI: {formatNpi(user.npi)}
          </Text>
        </View>

        <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", marginTop: box.px(4), gap: box.px(6) }}>
          <View
            style={{
              width: box.photo,
              height: box.photo,
              borderRadius: box.px(3),
              overflow: "hidden",
              backgroundColor: "#e7e9ee",
              borderWidth: 1,
              borderColor: "#c5cad3",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {user.photoUrl && !photoBroken ? (
              <Image
                source={{ uri: user.photoUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
                onError={() => setPhotoBroken(true)}
              />
            ) : (
              <Ionicons name="person" size={box.px(26)} color="#9CA3AF" />
            )}
          </View>

          <View style={{ flex: 1, justifyContent: "space-between", minHeight: box.photo, paddingVertical: 1 }}>
            <IdentityField label="Nom" value={lastName ? lastName.toUpperCase() : "-"} box={box} />
            <IdentityField label="Prénoms" value={dash(user.firstName)} box={box} />
            <IdentityField label="Date de naissance" value={fmtBirth(user.birthDate)} box={box} />
            <IdentityField label="Lieu de naissance" value={dash(user.birthPlace)} box={box} />
          </View>

          <View style={{ width: Math.max(box.qr + box.px(4), box.px(104)), alignItems: "flex-end" }}>
            {token ? (
              <View style={{ backgroundColor: "#fff", padding: 2 }}>
                <QRCode value={token} size={box.qr} ecl="M" backgroundColor="#ffffff" color={NAVY} />
              </View>
            ) : (
              <View
                style={{
                  width: box.qr,
                  height: box.qr,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#fff",
                }}
              >
                <Ionicons name="qr-code-outline" size={box.px(28)} color="#9CA3AF" />
              </View>
            )}
            <Text
              style={{
                color: NAVY,
                fontWeight: "800",
                fontSize: box.px(8),
                marginTop: box.px(3),
                textAlign: "right",
                width: "100%",
              }}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              Num. tél: {displayPhoneBj(user.phone, "-")}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          backgroundColor: BAND,
          flexDirection: "row",
          paddingHorizontal: box.pad,
          paddingVertical: box.px(6),
          gap: box.px(6),
        }}
      >
        <FooterCol box={box} label="Groupe sanguin:" value={dash(user.bloodType)} />
        <FooterCol box={box} label="Allergies connues" value={allergiesText(user.allergies)} wide />
        <FooterCol box={box} label="Numéro en cas d'urgence" value={displayPhoneBj(user.emergencyPhone, "-")} />
      </View>
    </View>
  );
}

function FooterCol({
  box,
  label,
  value,
  wide = false,
}: {
  box: Box;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={{ flex: wide ? 1.35 : 1 }}>
      <Text
        style={{ color: RED, fontSize: box.px(7.2), fontWeight: "700" }}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
      <Text
        style={{ color: RED, fontSize: box.px(10), fontWeight: "800", marginTop: 1 }}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </View>
  );
}

function MetaLine({ label, value, size }: { label: string; value: string; size: number }) {
  return (
    <Text style={{ color: NAVY, fontSize: size, marginTop: 3 }} numberOfLines={2}>
      <Text style={{ fontWeight: "500" }}>{label} </Text>
      <Text style={{ fontWeight: "800" }}>{value}</Text>
    </Text>
  );
}

function CardBack({ user, expiry, box }: Props & { box: Box }) {
  const insured = !!user.hasInsurance && !!user.insurer;
  const section = box.px(11);
  const meta = box.px(10);

  return (
    <View style={[s.face, { borderRadius: box.radius, borderWidth: box.border, backgroundColor: BACK_BG }]}>
      <Watermark width={box.w} height={box.h} />
      <CardHeader box={box} title="Informations complémentaires" />
      <View style={{ flex: 1, paddingHorizontal: box.pad, paddingTop: box.px(8) }}>
        <View style={{ flexDirection: "row", gap: box.px(12) }}>
          <View style={{ flex: 1 }}>
            <View style={{ alignSelf: "flex-start", borderBottomWidth: 1, borderBottomColor: NAVY, paddingRight: box.px(10), marginBottom: box.px(3) }}>
              <Text style={{ color: NAVY, fontWeight: "800", fontSize: section }}>Filiation</Text>
            </View>
            <MetaLine label="Père:" value={dash(user.fatherName)} size={meta} />
            <MetaLine label="Mère:" value={dash(user.motherName)} size={meta} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ alignSelf: "stretch", borderBottomWidth: 1, borderBottomColor: NAVY, marginBottom: box.px(3) }}>
              <Text style={{ color: NAVY, fontWeight: "800", fontSize: section }} numberOfLines={1}>
                Adresse de résidence
              </Text>
            </View>
            <MetaLine label="Com." value={dash(user.addressCommune)} size={meta} />
            <MetaLine label="Qtr:" value={dash(user.addressQuartier)} size={meta} />
          </View>
        </View>

        <View
          style={{
            marginTop: box.px(8),
            backgroundColor: INS_BG,
            borderRadius: box.px(12),
            paddingHorizontal: box.px(10),
            paddingVertical: box.px(8),
          }}
        >
          <Text
            style={{ color: ORANGE, fontWeight: "800", fontSize: box.px(10), letterSpacing: 0.2 }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            COUVERTURE ASSURANTIELLE
          </Text>
          <View
            style={{
              alignSelf: "flex-start",
              marginTop: box.px(5),
              backgroundColor: "#fff",
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#f0c2b0",
              paddingHorizontal: box.px(10),
              paddingVertical: box.px(3),
              maxWidth: "100%",
            }}
          >
            <Text
              style={{ color: ORANGE, fontWeight: "800", fontSize: box.px(11) }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {insured ? user.insurer : "Non Assuré"}
            </Text>
          </View>
          {insured ? (
            <Text
              style={{ color: ORANGE, fontSize: box.px(9.5), fontWeight: "600", marginTop: box.px(6) }}
              numberOfLines={2}
            >
              Police: {dash(user.policyNumber)}
            </Text>
          ) : (
            <>
              <Text style={{ color: ORANGE, fontSize: box.px(9), fontWeight: "600", marginTop: box.px(6) }} numberOfLines={2}>
                Soins à paiement direct auprès des structures partenaires
              </Text>
              <Text style={{ color: ORANGE, fontSize: box.px(9), fontWeight: "600", marginTop: box.px(2) }} numberOfLines={2}>
                Urgence vitale : dispositif national de paiement différé
              </Text>
            </>
          )}
        </View>
      </View>

      <Text
        style={{
          color: RED,
          fontSize: box.px(7.4),
          textAlign: "center",
          lineHeight: box.px(10),
          paddingHorizontal: box.pad,
        }}
      >
        Cette carte est strictement personnelle, non-transférable et demeure la propriété de l'émetteur.*
      </Text>
      <Text
        style={{
          color: NAVY,
          fontWeight: "800",
          fontSize: box.px(11),
          textAlign: "center",
          marginTop: box.px(3),
          marginBottom: box.px(7),
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        Valable jusqu'au : {fmtBirth(expiry)}
      </Text>
    </View>
  );
}

/**
 * Retournement recto / verso. Le QR reste le token opaque déjà émis.
 */
export function DotoCard3D(props: Props) {
  const box = useCardBox();
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
    <View style={{ width: box.w, alignItems: "center" }}>
      <Pressable onPress={toggle} style={{ width: box.w, height: box.h }}>
        <Animated.View style={[s.cardAbs, { width: box.w, height: box.h }, frontStyle]} pointerEvents={showBack ? "none" : "auto"}>
          <CardFront {...props} box={box} />
        </Animated.View>
        <Animated.View style={[s.cardAbs, { width: box.w, height: box.h }, backStyle]} pointerEvents={showBack ? "auto" : "none"}>
          <CardBack {...props} box={box} />
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
    left: 0,
    top: 0,
    backfaceVisibility: "hidden",
  },
  face: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    borderColor: BORDER,
  },
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
