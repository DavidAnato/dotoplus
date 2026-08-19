import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../ui";
import { C, brandNavy, darkC } from "../theme";
import { SheetModal } from "./SheetModal";
import { appAlert } from "./AppDialog";

export type IdCardOcrResult = {
  ok?: boolean;
  npi: string;
  first_name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  birth_place?: string | null;
  nationality?: string | null;
  phone?: string | null;
  address_commune?: string | null;
  address_arrondissement?: string | null;
  address_quartier?: string | null;
  address_lieu?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  card_number?: string | null;
  certificate_number?: string | null;
  expiry_date?: string | null;
  card_type?: string;
};

type Props = {
  dark?: boolean;
  busy?: boolean;
  /** Données validées (inscription). */
  result: IdCardOcrResult | null;
  onScan: (uri: string, mime: string, name: string) => Promise<IdCardOcrResult>;
  onConfirmed: (data: IdCardOcrResult) => void;
  onClear?: () => void;
};

function IdentityCardSummary({
  dark,
  data,
  preview,
  onClear,
  pending,
  onConfirm,
  onRescan,
}: {
  dark?: boolean;
  data: IdCardOcrResult;
  preview?: string | null;
  onClear?: () => void;
  /** Affiché juste après OCR, avant validation inscription. */
  pending?: boolean;
  onConfirm?: () => void;
  onRescan?: () => void;
}) {
  const colors = dark ? darkC : C;
  const name = [data.last_name, data.first_name].filter(Boolean).join(" ");
  const cardLabel =
    data.card_type === "cedeao" ? "Carte CEDEAO" : data.card_type === "cip" ? "CIP ANIP" : "Pièce d'identité";

  return (
    <View
      style={[
        styles.doneBox,
        dark
          ? { backgroundColor: "#14201A", borderColor: "#1F3D2E" }
          : { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
      ]}
    >
      <View style={styles.doneHead}>
        <View style={styles.badgeOk}>
          <Ionicons name="shield-checkmark" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.doneTitle, { color: dark ? "#86EFAC" : "#14532D" }]}>
            {pending ? "Carte lue" : "Identité validée"}
          </Text>
          <Text style={[styles.doneSub, { color: dark ? "#4ADE80" : "#166534" }]}>{cardLabel}</Text>
        </View>
        {!pending && onClear ? (
          <Pressable onPress={onClear} hitSlop={10}>
            <Text style={styles.rescan}>Modifier</Text>
          </Pressable>
        ) : null}
      </View>

      {preview ? (
        <Image
          source={{ uri: preview }}
          style={[styles.thumb, { backgroundColor: colors.border }]}
          resizeMode="cover"
        />
      ) : null}

      <Text style={[styles.npiLabel, { color: colors.muted }]}>NPI</Text>
      <Text style={[styles.npiValue, { color: dark ? "#FCA5A5" : "#B91C1C" }]}>{data.npi}</Text>
      {name ? <Text style={[styles.nameLine, { color: colors.text }]}>{name}</Text> : null}
      {data.birth_date || data.birth_place ? (
        <Text style={[styles.metaLine, { color: colors.muted }]}>
          {[data.birth_date, data.birth_place].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
      {data.nationality ? (
        <Text style={[styles.metaLine, { color: colors.muted }]}>{data.nationality}</Text>
      ) : null}
      {data.address_commune || data.address_quartier ? (
        <Text style={[styles.metaLine, { color: colors.muted }]}>
          {[data.address_commune, data.address_quartier].filter(Boolean).join(" · ")}
        </Text>
      ) : null}
      {data.father_name || data.mother_name ? (
        <Text style={[styles.metaLine, { color: colors.muted }]}>
          {[
            data.father_name && `Père : ${data.father_name}`,
            data.mother_name && `Mère : ${data.mother_name}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}
      {data.card_number || data.expiry_date ? (
        <Text style={[styles.metaLine, { color: colors.muted }]}>
          {[data.card_number && `N° ${data.card_number}`, data.expiry_date && `Exp. ${data.expiry_date}`]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}

      {pending ? (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Button title="Valider ces informations" icon="checkmark" onPress={() => onConfirm?.()} />
          <Button
            title="Rescanner"
            outline
            color={dark ? C.blue : brandNavy}
            onPress={() => onRescan?.()}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Capture CIP / CEDEAO → OCR → aperçu stylé → validation. */
export function IdCardScanField({
  dark,
  busy,
  result,
  onScan,
  onConfirmed,
  onClear,
}: Props) {
  const colors = dark ? darkC : C;
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [pending, setPending] = useState<IdCardOcrResult | null>(null);
  const loading = busy || localBusy;

  const run = async (from: "camera" | "library") => {
    setOpen(false);
    if (from === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        appAlert("Caméra", "Autorisez l'accès à la caméra pour scanner la carte.");
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        appAlert("Galerie", "Autorisez l'accès à la galerie.");
        return;
      }
    }

    const launch =
      from === "camera"
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    const res = await launch({
      mediaTypes: ["images"],
      // Un peu plus de détail pour les photos floues
      quality: 0.85,
      exif: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setPreview(asset.uri);
    setPending(null);
    setLocalBusy(true);
    try {
      const mime = asset.mimeType || "image/jpeg";
      const fname = asset.fileName || `carte-id.${mime.includes("png") ? "png" : "jpg"}`;
      const data = await onScan(asset.uri, mime, fname);
      setPending({
        ...data,
        npi: (data.npi || "").replace(/\D/g, "").slice(0, 10),
      });
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (/timed?\s*out|timeout|abort/i.test(msg)) {
        appAlert(
          "Scan carte",
          "Délai dépassé pendant la lecture. Réessayez avec une photo nette et bien cadrée - le serveur doit tourner."
        );
      } else {
        appAlert("Scan carte", msg || "Lecture OCR impossible.");
      }
      setPreview(null);
      setPending(null);
    } finally {
      setLocalBusy(false);
    }
  };

  const confirmPending = () => {
    if (!pending?.npi?.trim()) {
      appAlert("Validation", "Le NPI est obligatoire.");
      return;
    }
    if (!/^\d{10}$/.test(pending.npi.trim())) {
      appAlert("Validation", "Le NPI doit contenir 10 chiffres.");
      return;
    }
    onConfirmed({ ...pending, npi: pending.npi.trim() });
    setPending(null);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingBox,
          {
            backgroundColor: dark ? "#141A1C" : "#F0F7FA",
            borderColor: C.blue + (dark ? "66" : "44"),
          },
        ]}
      >
        {preview ? (
          <View style={styles.previewWrap}>
            <Image
              source={{ uri: preview }}
              style={[styles.thumb, { backgroundColor: colors.border, marginVertical: 0 }]}
              resizeMode="cover"
            />
            <View
              style={[
                styles.previewDim,
                { backgroundColor: dark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)" },
              ]}
            />
          </View>
        ) : null}
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color={C.blue} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.loadingTitle, { color: colors.text }]}>Lecture de la carte…</Text>
            <Text style={[styles.loadingSub, { color: colors.muted }]}>
              Extraction NPI, identité, adresse…
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (pending?.npi && !result) {
    return (
      <IdentityCardSummary
        dark={dark}
        data={pending}
        preview={preview}
        pending
        onConfirm={confirmPending}
        onRescan={() => {
          setPending(null);
          setPreview(null);
          setOpen(true);
        }}
      />
    );
  }

  if (result?.npi) {
    return (
      <IdentityCardSummary
        dark={dark}
        data={result}
        onClear={() => {
          setPending(null);
          setPreview(null);
          onClear?.();
        }}
      />
    );
  }

  return (
    <View style={{ marginBottom: 14 }}>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={loading}
        style={[
          styles.trigger,
          {
            borderColor: C.blue + (dark ? "66" : "55"),
            backgroundColor: dark ? "#141A1C" : "#F0F7FA",
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Ionicons name="scan-outline" size={22} color={C.blue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.triggerTitle, { color: colors.text }]}>
            Scanner CIP ou carte biométrique
          </Text>
          <Text style={[styles.triggerSub, { color: colors.muted }]}>
            Photo de la CIP ou carte CEDEAO
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={dark ? colors.muted : brandNavy} />
      </Pressable>

      <SheetModal
        visible={open}
        onClose={() => setOpen(false)}
        maxHeight="42%"
        sheetStyle={{ backgroundColor: dark ? darkC.white : "#FAFBFC" }}
        handleColor={dark ? "#404040" : "#D1D5DB"}
      >
        <Text style={[styles.sheetTitle, { color: colors.text }]}>Pièce d'identité</Text>
        <Text style={[styles.sheetHint, { color: colors.muted }]}>
          Cadrez toute la CIP ou la carte CEDEAO. Le NPI doit être lisible.
        </Text>
        <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 24 }}>
          <Button
            title="Photographier la carte"
            icon="camera-outline"
            onPress={() => void run("camera")}
            loading={loading}
          />
          <Button
            title="Choisir depuis la galerie"
            icon="images-outline"
            outline
            color={dark ? C.blue : brandNavy}
            onPress={() => void run("library")}
            disabled={loading}
          />
        </View>
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  triggerTitle: { fontWeight: "800", fontSize: 14 },
  triggerSub: { fontSize: 12, marginTop: 2 },
  loadingBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  previewWrap: { borderRadius: 10, overflow: "hidden", position: "relative" },
  previewDim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  loadingTitle: { fontWeight: "800", fontSize: 15 },
  loadingSub: { fontSize: 12, marginTop: 3 },
  sheetTitle: {
    fontWeight: "800",
    fontSize: 17,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  sheetHint: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 14,
    lineHeight: 18,
  },
  doneBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    gap: 4,
  },
  doneHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  badgeOk: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { fontWeight: "800", fontSize: 14 },
  doneSub: { fontSize: 11, marginTop: 1 },
  rescan: { color: C.blue, fontWeight: "700", fontSize: 12 },
  thumb: {
    width: "100%",
    height: 88,
    borderRadius: 10,
    marginVertical: 8,
  },
  npiLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 4,
  },
  npiValue: {
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },
  nameLine: { fontWeight: "800", fontSize: 15, marginTop: 4 },
  metaLine: { fontSize: 12, marginTop: 2 },
});
