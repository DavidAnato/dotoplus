import React, { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../ui";
import { C, darkC, accent, brandNavy } from "../theme";
import { IconCluster } from "../components/StoryArt";
import type { StoryIcon } from "../components/StoryArt";
import { useScreenInsets } from "../safeArea";

const SLIDES: {
  title: string;
  subtitle: string;
  desc: string;
  accent: string;
  bg: string;
  bgDark: string;
  logo: number;
  icons: { name: StoryIcon; size?: number; color?: string }[];
}[] = [
  {
    title: "DOTO+",
    subtitle: "Votre santé, toujours avec vous",
    desc: "Accédez à votre dossier médical complet depuis votre smartphone, partout au Bénin.",
    accent: accent,
    bg: C.lightBlue,
    bgDark: "#1C1C1C",
    logo: require("../../assets/logo-mark.png") as number,
    icons: [
      { name: "medical", size: 32 },
      { name: "heart", size: 16, color: C.navy },
      { name: "shield-checkmark", size: 15 },
    ],
  },
  {
    title: "Un seul compte pour tout",
    subtitle: "Connectez-vous avec votre téléphone",
    desc: "Votre numéro et un code SMS donnent accès à l'ensemble de votre historique médical.",
    accent: accent,
    bg: C.lightBlue,
    bgDark: "#1C1C1C",
    logo: require("../../assets/logo-doto.png") as number,
    icons: [
      { name: "phone-portrait", size: 30 },
      { name: "chatbubble-ellipses", size: 15, color: C.navy },
      { name: "key", size: 14 },
    ],
  },
  {
    title: "Données disponibles partout",
    subtitle: "Même sans connexion internet",
    desc: "En mode urgence, vos données médicales critiques restent accessibles hors ligne.",
    accent: C.emergency,
    bg: "#FEF2F2",
    bgDark: "#450A0A",
    logo: require("../../assets/logo-dodocard.png") as number,
    icons: [
      { name: "medkit", size: 30, color: C.emergency },
      { name: "car", size: 15, color: C.emergency },
      { name: "call", size: 14, color: C.emergency },
    ],
  },
];

export default function Onboarding({
  onDone,
  dark = false,
}: {
  onDone: () => void;
  dark?: boolean;
}) {
  const colors = dark ? darkC : C;
  const { headerPad, scrollBottom } = useScreenInsets();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {i < 2 ? (
        <TouchableOpacity
          onPress={onDone}
          hitSlop={12}
          style={{ position: "absolute", right: 16, top: headerPad, zIndex: 10, padding: 10 }}
        >
          <Text style={{ color: accent, fontWeight: "600" }}>Passer</Text>
        </TouchableOpacity>
      ) : null}
      <View
        style={{
          height: "50%",
          backgroundColor: dark ? slide.bgDark : "#E8F7F8",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          paddingTop: headerPad,
        }}
      >
        {/* Formes décoratives */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -30,
            left: -20,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: dark ? "rgba(62,130,149,0.15)" : "rgba(62,130,149,0.12)",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 20,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: dark ? "rgba(255,255,255,0.04)" : "rgba(30,55,85,0.06)",
          }}
        />
        <IconCluster
          icons={slide.icons}
          dark={dark}
          size="lg"
          accent={slide.accent}
          soft={dark ? "rgba(0,0,0,0.35)" : colors.white}
        />
        <View
          style={{
            marginTop: 18,
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: colors.white,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 3,
            padding: 12,
          }}
        >
          <Image source={slide.logo} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
        </View>
      </View>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28, gap: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", letterSpacing: -0.5, color: dark ? colors.text : brandNavy }}>
          {slide.title}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "600", color: slide.accent }}>
          {slide.subtitle}
        </Text>
        <Text style={{ fontSize: 15, color: colors.muted, lineHeight: 22 }}>
          {slide.desc}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: Math.max(scrollBottom, 24), gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={{
                width: idx === i ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: idx === i ? accent : colors.border,
              }}
            />
          ))}
        </View>
        <Button
          title={i < 2 ? "Suivant" : "Commencer"}
          color={dark ? accent : brandNavy}
          onPress={() => (i < 2 ? setI(i + 1) : onDone())}
        />
      </View>
    </View>
  );
}
