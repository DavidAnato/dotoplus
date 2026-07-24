import React, { useState } from "react";
import { Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../ui";
import { C, darkC } from "../theme";
import { Avatar } from "./Avatar";
import { appAlert } from "./AppDialog";

/** Sélecteur photo d'identité avec cadre & aperçu premium. */
export function PhotoIdentityPicker({
  photoUrl,
  name,
  firstName,
  lastName,
  dark,
  onUploaded,
  upload,
}: {
  photoUrl?: string | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  dark?: boolean;
  onUploaded: (photoUrl: string) => void;
  upload: (uri: string, mime: string, name: string) => Promise<{ photo_url?: string }>;
}) {
  const colors = dark ? darkC : C;
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appAlert("Permission", "Autorisez l'accès à la galerie pour ajouter votre photo d'identité.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setPreview(asset.uri);
    setBusy(true);
    try {
      const mime = asset.mimeType || "image/jpeg";
      const fname = asset.fileName || `identite.${mime.includes("png") ? "png" : "jpg"}`;
      const data = await upload(asset.uri, mime, fname);
      if (data.photo_url) onUploaded(data.photo_url);
      else onUploaded(asset.uri);
    } catch (e: any) {
      appAlert("Photo", e.message || "Upload impossible.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const shown = preview || photoUrl;

  return (
    <View style={{ alignItems: "center", gap: 14, marginBottom: 8 }}>
      <View
        style={{
          padding: 5,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: C.blue,
          borderStyle: "dashed",
        }}
      >
        <Avatar
          uri={shown}
          firstName={firstName}
          lastName={lastName}
          name={name}
          size={112}
        />
      </View>
      <Text
        style={{
          color: colors.muted,
          fontSize: 13,
          textAlign: "center",
          lineHeight: 19,
          paddingHorizontal: 8,
        }}
      >
        Cadrez votre visage au centre. JPEG, PNG ou WebP — type photo d&apos;identité.
      </Text>
      <Button
        title={photoUrl || preview ? "Changer la photo" : "Ajouter une photo d'identité"}
        icon="camera-outline"
        outline
        color={C.blue}
        loading={busy}
        onPress={pick}
      />
    </View>
  );
}
