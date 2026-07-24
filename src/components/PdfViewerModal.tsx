import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import * as FileSystem from "expo-file-system/legacy";
import { Button } from "../ui";
import { brandNavy, C } from "../theme";
import { SheetModal } from "./SheetModal";

type Props = {
  visible: boolean;
  uri: string | null;
  loading?: boolean;
  onClose: () => void;
  onShare: () => void;
  title?: string;
};

/**
 * Ouverture PDF sans WebView / base64 (évite les crashes mémoire).
 * Android : Intent VIEW ; iOS : partage / aperçu système.
 */
export function PdfViewerModal({
  visible,
  uri,
  loading = false,
  onClose,
  onShare,
  title = "DodoCard PDF",
}: Props) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openNative = useCallback(async () => {
    if (!uri) return;
    setOpening(true);
    setError(null);
    try {
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
          type: "application/pdf",
        });
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
          dialogTitle: title,
        });
      } else {
        setError("Aucune application PDF disponible sur cet appareil.");
      }
    } catch (e) {
      setError((e as Error).message || "Ouverture impossible.");
    } finally {
      setOpening(false);
    }
  }, [uri, title]);

  // Ouvre automatiquement le lecteur natif dès que le fichier est prêt
  useEffect(() => {
    if (visible && uri && !loading) {
      void openNative();
    }
    if (!visible) setError(null);
  }, [visible, uri, loading, openNative]);

  const busy = loading || opening;

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      maxHeight="55%"
      sheetStyle={{ backgroundColor: "#fff" }}
      handleColor="#94A3B8"
    >
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fermer">
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={onShare} hitSlop={10} accessibilityLabel="Partager">
          <Ionicons name="share-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.body}>
        {busy ? (
          <>
            <ActivityIndicator size="large" color={brandNavy} />
            <Text style={styles.muted}>
              {loading ? "Téléchargement du PDF…" : "Ouverture…"}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="document-text-outline" size={52} color={brandNavy} />
            <Text style={styles.title}>PDF prêt</Text>
            <Text style={styles.muted}>
              {error
                ? error
                : "Le lecteur PDF du téléphone s'ouvre. Vous pouvez aussi le rouvrir ou le partager."}
            </Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title="Ouvrir le PDF"
          icon="open-outline"
          onPress={() => void openNative()}
          color={brandNavy}
          disabled={!uri || busy}
        />
        <Button
          title="Partager le PDF"
          icon="share-social-outline"
          outline
          onPress={onShare}
          color={brandNavy}
          disabled={!uri || busy}
        />
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: brandNavy,
  },
  headerTitle: { flex: 1, color: "#fff", fontWeight: "800", fontSize: 16 },
  body: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
    minHeight: 160,
  },
  title: { color: C.text, fontWeight: "800", fontSize: 16, textAlign: "center" },
  muted: { color: C.muted, textAlign: "center", fontSize: 13, lineHeight: 18 },
  footer: {
    padding: 16,
    paddingBottom: 28,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },
});
