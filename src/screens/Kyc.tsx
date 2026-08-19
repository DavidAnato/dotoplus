import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button, Field, Header, PhoneField } from "../ui";
import { C, darkC, accent, brandNavy } from "../theme";
import { BrandBackground, ScreenEnter } from "../motion";
import { IdCardScanField, IdCardOcrResult } from "../components/IdCardScanField";
import { api } from "../api";
import { appAlert } from "../components/AppDialog";
import { useScreenInsets } from "../safeArea";

type Kyc = {
  statut?: string;
  statut_label?: string;
  motif_refus?: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string | null;
  lieu_naissance?: string;
  npi?: string;
  telephone?: string;
  piece_recto_url?: string | null;
  piece_verso_url?: string | null;
  selfie_url?: string | null;
};

const STATUS_COPY: Record<string, { color: string; bg: string; text: string }> = {
  brouillon: { color: "#6B3A05", bg: "#FEF0D6", text: "Brouillon" },
  en_attente: { color: "#1E3755", bg: "#E4EEF4", text: "En attente de validation" },
  valide: { color: "#0A4F3F", bg: "#D8F0E8", text: "Validé" },
  refuse: { color: "#8B1E1E", bg: "#FCE8E8", text: "Refusé" },
};

async function pickImage(): Promise<{ uri: string; mime: string; name: string } | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted && !lib.granted) {
    appAlert("Photos", "Autorisez la caméra ou la galerie pour continuer.");
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, mime: a.mimeType || "image/jpeg", name: a.fileName || "photo.jpg" };
}

export default function KycScreen({
  dark = false,
  onDone,
}: {
  dark?: boolean;
  onDone?: () => void;
}) {
  const colors = dark ? darkC : C;
  const { scrollBottom } = useScreenInsets();
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [busy, setBusy] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [npi, setNpi] = useState("");
  const [naissance, setNaissance] = useState("");
  const [lieu, setLieu] = useState("");
  const [tel, setTel] = useState("");
  const locked = kyc?.statut === "valide" || kyc?.statut === "en_attente";

  const load = async () => {
    try {
      const data = await api.kycMe();
      setKyc(data);
      setNom(data.nom || "");
      setPrenom(data.prenom || "");
      setNpi(data.npi || "");
      setNaissance((data.date_naissance || "").slice(0, 10));
      setLieu(data.lieu_naissance || "");
      setTel(data.telephone || "");
    } catch (e: any) {
      appAlert("KYC", e.message || "Impossible de charger le dossier.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveInfos = async (ocr?: IdCardOcrResult) => {
    setBusy(true);
    try {
      const data = await api.patchKyc({
        nom: ocr?.last_name || nom,
        prenom: ocr?.first_name || prenom,
        npi: ocr?.npi || npi,
        date_naissance: ocr?.birth_date || naissance || null,
        lieu_naissance: ocr?.birth_place || lieu,
        telephone: ocr?.phone || tel,
        ocr_payload: ocr || undefined,
      });
      setKyc(data);
    } catch (e: any) {
      appAlert("KYC", e.message || "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (kind: "recto" | "verso" | "selfie") => {
    const file = await pickImage();
    if (!file) return;
    setBusy(true);
    try {
      const data = await api.uploadKyc(kind, file.uri, file.mime, file.name);
      setKyc(data);
    } catch (e: any) {
      appAlert("KYC", e.message || "Upload impossible.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await saveInfos();
      const data = await api.submitKyc();
      setKyc(data);
      appAlert("KYC", "Dossier envoyé. Statut : en attente de validation.");
      onDone?.();
    } catch (e: any) {
      appAlert("KYC", e.message || "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  };

  const st = STATUS_COPY[kyc?.statut || "brouillon"] || STATUS_COPY.brouillon;

  return (
    <BrandBackground dark={dark}>
      <ScreenEnter>
        <Header title="Vérification d'identité" subtitle="KYC patient" onBack={onDone} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: scrollBottom }}>
          <View style={{ backgroundColor: st.bg, borderRadius: 16, padding: 16 }}>
            <Text style={{ color: st.color, fontWeight: "800", fontSize: 15 }}>{st.text}</Text>
            {kyc?.statut === "refuse" && kyc.motif_refus ? (
              <Text style={{ color: st.color, marginTop: 6, fontSize: 13 }}>{kyc.motif_refus}</Text>
            ) : (
              <Text style={{ color: colors.muted, marginTop: 6, fontSize: 14, lineHeight: 20 }}>
                Pièce d'identité recto/verso, selfie et informations personnelles.
              </Text>
            )}
          </View>

          {!locked ? (
            <IdCardScanField
              dark={dark}
              busy={busy}
              result={npi ? ({ npi, first_name: prenom, last_name: nom, birth_date: naissance, birth_place: lieu } as IdCardOcrResult) : null}
              onScan={async (uri, mime, name) => {
                const ocr = await api.ocrIdCard(uri, mime, name);
                await api.uploadKyc("recto", uri, mime, name).catch(() => {});
                return ocr;
              }}
              onConfirmed={(data) => {
                setNom(data.last_name || nom);
                setPrenom(data.first_name || prenom);
                setNpi(data.npi || npi);
                setNaissance((data.birth_date || naissance || "").slice(0, 10));
                setLieu(data.birth_place || lieu);
                if (data.phone) setTel(data.phone);
                void saveInfos(data);
              }}
              onClear={() => setNpi("")}
            />
          ) : null}

          <Field label="Nom" value={nom} onChangeText={setNom} colors={colors} disabled={locked} />
          <Field label="Prénom" value={prenom} onChangeText={setPrenom} colors={colors} disabled={locked} />
          <Field label="NPI" value={npi} onChangeText={setNpi} colors={colors} disabled={locked} />
          <Field label="Date de naissance (AAAA-MM-JJ)" value={naissance} onChangeText={setNaissance} colors={colors} disabled={locked} />
          <Field label="Lieu de naissance" value={lieu} onChangeText={setLieu} colors={colors} disabled={locked} />
          <PhoneField label="Téléphone" value={tel} onChangeText={setTel} colors={colors} disabled={locked} />

          {(["verso", "selfie"] as const).map((kind) => {
            const url = kind === "verso" ? kyc?.piece_verso_url : kyc?.selfie_url;
            const label = kind === "verso" ? "Pièce d'identité (verso)" : "Selfie / preuve de vie";
            return (
              <Pressable
                key={kind}
                onPress={() => !locked && void upload(kind)}
                style={{
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: colors.border,
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: colors.white,
                }}
              >
                <Text style={{ fontWeight: "800", color: colors.text, marginBottom: 8 }}>{label}</Text>
                {url ? (
                  <Image source={{ uri: url }} style={{ width: "100%", height: 140, borderRadius: 10 }} />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="camera-outline" size={22} color={C.green} />
                    <Text style={{ color: colors.muted }}>Ajouter une photo</Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {!locked ? (
            <Button title="Envoyer pour validation" loading={busy} color={dark ? accent : brandNavy} onPress={() => void submit()} />
          ) : kyc?.statut === "en_attente" ? (
            <Text style={{ color: colors.muted, textAlign: "center" }}>
              Votre dossier est en attente de validation par un administrateur.
            </Text>
          ) : null}
        </ScrollView>
      </ScreenEnter>
    </BrandBackground>
  );
}
