import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { appAlert } from "../components/AppDialog";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { Button, Card, Header, Pill } from "../ui";
import { C, Profile, brandNavy, darkC, onBrand } from "../theme";
import { api } from "../api";
import {
  useMyCard,
  useReportCardLossMutation,
  useReissueMyCardMutation,
} from "../queries/hooks";
import { qk } from "../queries/keys";
import {
  BrandBackground,
  ScreenEnter,
  Skeleton,
  StaggerItem,
} from "../motion";
import { StoryArt } from "../components/StoryArt";
import { DotoCard3D } from "../components/DotoCard3D";
import { PdfViewerModal } from "../components/PdfViewerModal";
import { SheetModal } from "../components/SheetModal";
import { FirstCardGate } from "../components/FirstCardGate";
import { isReadyForFirstCard } from "../profileReady";
import { usePullRefresh } from "../hooks/usePullRefresh";
import { useNavigation } from "@react-navigation/native";

function statusTone(statut?: string, colors = C) {
  switch (statut) {
    case "active":
      return { color: colors.green, bg: colors.lightGreen, label: "Active" };
    case "revoquee":
      return { color: colors.red, bg: colors.redSoft, label: "Révoquée / perdue" };
    case "reemise":
      return { color: colors.amber, bg: colors.amberSoft, label: "Réémise" };
    case "expiree":
      return { color: colors.muted, bg: colors.bg, label: "Expirée" };
    default:
      return { color: colors.blue, bg: colors.lightBlue, label: "-" };
  }
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
  colors,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
  colors: typeof C;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: pressed ? colors.lightBlue : colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: danger ? colors.redSoft : colors.lightBlue,
        }}
      >
        <Ionicons name={icon} size={20} color={danger ? colors.red : brandNavy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800", color: danger ? colors.red : colors.text, fontSize: 15 }}>
          {title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.grey} />
    </Pressable>
  );
}

export default function Carte({ user, dark = false }: { user: Profile; dark?: boolean }) {
  const colors = dark ? darkC : C;
  const navigation = useNavigation<any>();
  const { data, isLoading, isError, error, refetch, isFetching } = useMyCard(true);
  const reportLoss = useReportCardLossMutation();
  const reissue = useReissueMyCardMutation();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const { refreshControl } = usePullRefresh({
    keys: [qk.myCard],
    refetch: [() => refetch()],
  });

  const card = data?.card;
  const token = card?.token_chiffre || null;
  const expiry = card?.date_expiration || "";
  const offline = !!data?.offline;
  const showSkeleton = isLoading && !data;
  const tone = statusTone(card?.statut || (token ? "active" : undefined), colors);
  const busy = reportLoss.isPending || reissue.isPending || pdfBusy;

  const confirmLoss = () => {
    appAlert(
      "Signaler la perte",
      "L'ancienne carte sera invalidée immédiatement et une nouvelle DotoCard sera émise. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Signaler",
          style: "destructive",
          onPress: () => {
            reportLoss.mutate("perte", {
              onSuccess: () => {
                appAlert(
                  "Carte renouvelée",
                  "Perte enregistrée. Votre nouvelle DotoCard est active."
                );
              },
              onError: (e) => appAlert("Erreur", (e as Error).message),
            });
          },
        },
      ]
    );
  };

  const confirmReissue = () => {
    if (!token && !isReadyForFirstCard(user)) {
      appAlert(
        "Infos manquantes",
        "Pour générer votre première carte : photo, nom/prénom et date de naissance. Le groupe sanguin n'est pas obligatoire.",
        [
          { text: "Plus tard", style: "cancel" },
          {
            text: "Compléter",
            onPress: () => navigation.getParent()?.navigate("ProfilComplet"),
          },
        ]
      );
      return;
    }
    const isFirst = !token;
    appAlert(
      isFirst ? "Générer ma DotoCard" : "Demander une nouvelle carte",
      isFirst
        ? "Votre QR personnel sera créé. Vous pourrez compléter sang, allergies et adresse plus tard."
        : "Le QR actuel sera invalidé et remplacé. Les scans précédents ne fonctionneront plus.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: isFirst ? "Générer" : "Réémettre",
          onPress: () => {
            reissue.mutate("demande_remplacement", {
              onSuccess: () => {
                appAlert(
                  isFirst ? "DotoCard prête" : "Nouvelle carte",
                  isFirst
                    ? "Votre DotoCard est active. Présentez le QR au professionnel."
                    : "Votre DotoCard a été réémise avec succès."
                );
              },
              onError: (e) => appAlert("Erreur", (e as Error).message),
            });
          },
        },
      ]
    );
  };

  const ensurePdf = async (): Promise<string> => {
    if (pdfUri) return pdfUri;
    const uri = await api.downloadMyCardPdf();
    setPdfUri(uri);
    return uri;
  };

  const openPdfReader = async () => {
    if (!token || offline) {
      appAlert("Hors ligne", "Connectez-vous pour consulter le PDF.");
      return;
    }
    setPdfBusy(true);
    setPdfViewerOpen(true);
    try {
      await ensurePdf();
    } catch (e) {
      setPdfViewerOpen(false);
      appAlert("PDF", (e as Error).message || "Téléchargement impossible.");
    } finally {
      setPdfBusy(false);
    }
  };

  const sharePdf = async (uriOverride?: string) => {
    if (!token || offline) {
      appAlert("Hors ligne", "Connectez-vous pour partager le PDF.");
      return;
    }
    setPdfBusy(true);
    try {
      const uri = uriOverride || (await ensurePdf());
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Partager DotoCard PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        await Share.share({ url: uri, message: "DotoCard DOTO+" });
      }
    } catch (e) {
      appAlert("Partage", (e as Error).message || "Partage impossible.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <BrandBackground dark={dark}>
      <ScreenEnter>
        <Header title="Ma carte" subtitle="Présentez ce code au professionnel de santé" />
        <ScrollView
          contentContainerStyle={{ padding: 16, alignItems: "center", gap: 14, paddingBottom: 32 }}
          refreshControl={refreshControl}
        >
          <StaggerItem index={0} style={{ width: "100%" }}>
            <StoryArt
              preset="carte"
              compact
              dark={dark}
              title="Ma DotoCard"
              subtitle="Présentez le QR au professionnel - identité et NPI vérifiés en un scan."
            />
          </StaggerItem>

          <StaggerItem index={1} style={{ width: "100%" }}>
            <Card
              colors={colors}
              decor="navy"
              style={{
                width: "100%",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.white,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  width: "100%",
                  marginBottom: 12,
                  alignItems: "flex-start",
                }}
              >
                <View>
                  <Image
                    source={require("../../assets/logo-dodocard.png")}
                    style={{ width: 120, height: 18 }}
                    resizeMode="contain"
                  />
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
                    DOTO+ · République du Bénin
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Pill color={tone.color} bg={tone.bg}>
                    {card?.statut_label || tone.label}
                  </Pill>
                  <Text style={{ fontWeight: "800", color: colors.text, fontSize: 11 }}>NPI</Text>
                  <Text style={{ color: colors.muted, fontSize: 11, fontFamily: "monospace" }}>
                    {user.npi}
                  </Text>
                </View>
              </View>

              {showSkeleton ? (
                <View style={{ alignItems: "center", marginVertical: 28, gap: 12 }}>
                  <Skeleton width={200} height={200} radius={16} dark={dark} />
                  <Skeleton width={140} height={14} dark={dark} />
                </View>
              ) : null}
              {!showSkeleton && token ? (
                <Pressable
                  onPress={() => setPreviewOpen(true)}
                  style={{
                    padding: 14,
                    backgroundColor: onBrand,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <QRCode value={token} size={240} ecl="M" backgroundColor="#ffffff" color="#101110" />
                </Pressable>
              ) : null}
              {!showSkeleton && !token ? (
                <FirstCardGate
                  user={user}
                  dark={dark}
                  busy={reissue.isPending}
                  offline={offline}
                  onCompleteProfile={() => navigation.getParent()?.navigate("ProfilComplet")}
                  onIssue={confirmReissue}
                />
              ) : null}

              <Text style={{ fontWeight: "800", color: colors.text, marginTop: 14, fontSize: 17 }}>
                {user.lastName} {user.firstName}
              </Text>
              {user.bloodType ? (
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                  Groupe {user.bloodType}
                  {user.electrophoresis ? ` · Électro ${user.electrophoresis}` : ""}
                </Text>
              ) : null}
              {expiry ? (
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                  Expire le {expiry}
                </Text>
              ) : null}
              {offline ? (
                <Text style={{ color: colors.amber, fontWeight: "700", fontSize: 12, marginTop: 8 }}>
                  Affichage hors ligne (cache)
                </Text>
              ) : null}
              {isError && !token ? null : (
                <View style={{ marginTop: 14, width: "100%" }}>
                  <Button
                    title={isFetching ? "Actualisation…" : "Actualiser"}
                    icon="refresh-outline"
                    onPress={() => refetch()}
                    outline
                    disabled={busy}
                  />
                </View>
              )}
            </Card>
          </StaggerItem>

          <StaggerItem index={2} style={{ width: "100%", gap: 10 }}>
            <Text style={{ fontWeight: "800", color: colors.text, fontSize: 14, marginBottom: 2 }}>
              Actions
            </Text>
            <ActionRow
              icon="eye-outline"
              title="Aperçu 3D"
              subtitle="Recto / verso - glissez depuis n'importe quel côté"
              onPress={() => setPreviewOpen(true)}
              colors={colors}
              disabled={!token}
            />
            <ActionRow
              icon="document-text-outline"
              title="Lire le PDF"
              subtitle="Aperçu imprimable Assuré / Non assuré"
              onPress={() => void openPdfReader()}
              colors={colors}
              disabled={!token || offline || pdfBusy}
            />
            <ActionRow
              icon="share-social-outline"
              title="Partager le PDF"
              subtitle="Partage natif (WhatsApp, Drive…)"
              onPress={() => void sharePdf()}
              colors={colors}
              disabled={!token || offline || pdfBusy}
            />
            <ActionRow
              icon="alert-circle-outline"
              title="Signaler perte"
              subtitle="Invalidation immédiate + nouvelle carte"
              onPress={confirmLoss}
              colors={colors}
              danger
              disabled={busy || offline}
            />
            <ActionRow
              icon="refresh-outline"
              title="Demander nouvelle carte"
              subtitle="Réémettre un nouveau token QR"
              onPress={confirmReissue}
              colors={colors}
              disabled={busy || offline}
            />
          </StaggerItem>

          {!token && !showSkeleton && isReadyForFirstCard(user) ? (
            <StaggerItem index={2} style={{ width: "100%" }}>
              <Button
                title="Émettre ma DotoCard"
                icon="card-outline"
                onPress={confirmReissue}
                color={brandNavy}
                loading={reissue.isPending}
                disabled={offline}
              />
            </StaggerItem>
          ) : null}
        </ScrollView>
      </ScreenEnter>

      <SheetModal
        visible={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxHeight="94%"
        sheetStyle={{
          backgroundColor: colors.white,
          paddingHorizontal: 20,
          paddingBottom: 32,
        }}
        handleColor={colors.border}
      >
        <Text style={{ fontWeight: "800", fontSize: 18, color: colors.text, marginBottom: 4 }}>
          Aperçu DotoCard
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 16 }}>
          Aperçu 3D simple - glissez depuis n'importe quel côté pour retourner.
        </Text>

        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 8 }}>
          <DotoCard3D user={user} token={token} cardId={card?.id ?? undefined} expiry={expiry} />
        </ScrollView>

        <View style={{ gap: 10, marginTop: 8 }}>
          <Button
            title="Lire / partager PDF"
            icon="document-text-outline"
            onPress={() => {
              setPreviewOpen(false);
              void openPdfReader();
            }}
            color={brandNavy}
            disabled={!token || offline}
          />
          <Button
            title="Fermer"
            icon="close-outline"
            onPress={() => setPreviewOpen(false)}
            outline
            color={brandNavy}
          />
        </View>
      </SheetModal>

      <PdfViewerModal
        visible={pdfViewerOpen}
        uri={pdfUri}
        loading={pdfBusy && !pdfUri}
        onClose={() => setPdfViewerOpen(false)}
        onShare={() => void sharePdf(pdfUri || undefined)}
      />
    </BrandBackground>
  );
}
