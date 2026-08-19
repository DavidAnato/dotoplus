import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";
import { Header, Button, Field } from "../ui";
import { allergiesLabel, C, Profile, darkC } from "../theme";
import { api } from "../api";
import { storage } from "../storage";
import {
  BrandBackground,
  PressScale,
  ScreenEnter,
  StaggerItem,
  SuccessFlash,
  hapticSuccess,
  IconBadge,
} from "../motion";
import { SectionArt, StoryArt } from "../components/StoryArt";
import { SheetModal } from "../components/SheetModal";
import { appAlert } from "../components/AppDialog";
import { useAppStore } from "../store/appStore";
import { useActiveAccessGrants, useRevokeAccessMutation } from "../queries/hooks";
import { qk } from "../queries/keys";
import { useNavigation } from "@react-navigation/native";
import { Avatar } from "../components/Avatar";
import { PhotoIdentityPicker } from "../components/PhotoIdentityPicker";
import { PinInput } from "../components/PinInput";
import { usePullRefresh } from "../hooks/usePullRefresh";

type Panel =
  | "photo"
  | "pin"
  | "securite"
  | "apparence"
  | "notifications"
  | "acces"
  | "blocages"
  | "a-propos"
  | null;

function SettingsRow({
  icon,
  label,
  subtitle,
  colors,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  colors: typeof C;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <PressScale
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: colors.white,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: danger ? C.emergency + "44" : colors.border,
        minHeight: 64,
      }}
    >
      <IconBadge
        name={icon}
        color={danger ? C.emergency : C.blue}
        bg={danger ? C.redSoft : colors.lightBlue}
        size={40}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: danger ? C.emergency : colors.text,
            fontWeight: "700",
            fontSize: 15,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </PressScale>
  );
}

function SettingsModal({
  visible,
  title,
  icon,
  colors,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: typeof C;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      sheetStyle={{
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        paddingBottom: 28,
      }}
      handleColor={colors.border}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <IconBadge name={icon} color={C.blue} bg={colors.lightBlue} size={40} />
        <Text style={{ flex: 1, color: colors.text, fontWeight: "800", fontSize: 17 }}>
          {title}
        </Text>
        <PressScale onPress={onClose} style={{ padding: 6 }}>
          <Ionicons name="close" size={22} color={colors.muted} />
        </PressScale>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SheetModal>
  );
}

export default function Parametres({
  user,
  onLogout,
  onUserUpdate,
  dark,
  onToggleDark,
}: {
  user: Profile;
  onLogout: () => void;
  onUserUpdate?: (u: Profile) => void;
  dark?: boolean;
  onToggleDark?: () => void;
}) {
  const colors = dark ? darkC : C;
  const navigation = useNavigation<any>();
  const [panel, setPanel] = useState<Panel>(null);
  const [biometric, setBiometric] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pinStep, setPinStep] = useState<"pin" | "confirm">("pin");
  const [pinBusy, setPinBusy] = useState(false);
  const pinBusyRef = useRef(false);
  const [msg, setMsg] = useState("");
  const [okFlash, setOkFlash] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [requireUnlock, setRequireUnlock] = useState(!!user.requireUnlock);
  const [urgenceWhenLocked, setUrgenceWhenLocked] = useState(
    user.urgenceWhenLocked !== false
  );
  const pushEnabled = useAppStore((s) => s.pushEnabled);
  const setPushEnabled = useAppStore((s) => s.setPushEnabled);
  const online = useAppStore((s) => s.online);
  const activeGrants = useActiveAccessGrants(online);
  const revoke = useRevokeAccessMutation();
  const activeList = activeGrants.data || [];

  const reloadBlocks = async () => {
    if (!online) return;
    try {
      setBlocks(await api.accessBlocks(true));
    } catch {
      setBlocks([]);
    }
  };

  useEffect(() => {
    setRequireUnlock(!!user.requireUnlock);
    setUrgenceWhenLocked(user.urgenceWhenLocked !== false);
  }, [user.requireUnlock, user.urgenceWhenLocked]);

  useEffect(() => {
    storage.isBioEnabled().then(setBiometric);
    LocalAuthentication.hasHardwareAsync()
      .then(async (hw) => {
        const enrolled = hw ? await LocalAuthentication.isEnrolledAsync() : false;
        setBioAvailable(hw && enrolled);
      })
      .catch(() => setBioAvailable(false));
    void reloadBlocks();
  }, [online]);

  const { refreshControl } = usePullRefresh({
    keys: [qk.accessActive, qk.accessPending, qk.me],
    refetch: [
      reloadBlocks,
      async () => {
        const profile = await api.me();
        if (profile) onUserUpdate?.(profile);
      },
    ],
  });

  const toggleBio = async (v: boolean) => {
    if (v) {
      if (!bioAvailable) {
        appAlert(
          "Biométrie indisponible",
          "Aucun capteur ou empreinte / Face ID non configuré sur cet appareil."
        );
        return;
      }
      if (!user.hasPin) {
        appAlert(
          "PIN requis",
          "Configurez d'abord un code PIN - la biométrie s'en sert comme secours."
        );
        setPanel("pin");
        return;
      }
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Activer le déverrouillage biométrique",
        cancelLabel: "Annuler",
        disableDeviceFallback: false,
      });
      if (!res.success) return;
    }
    await storage.setBioEnabled(v);
    setBiometric(v);
  };

  const patchSecurity = async (flags: {
    require_unlock?: boolean;
    urgence_when_locked?: boolean;
  }) => {
    try {
      const profile = await api.updateSecurity(flags);
      if (profile) onUserUpdate?.(profile);
    } catch (e: any) {
      appAlert("Sécurité", e.message || "Mise à jour impossible.");
    }
  };

  const toggleRequireUnlock = async (v: boolean) => {
    if (v && !user.hasPin && !biometric) {
      appAlert(
        "Configurer un verrouillage",
        "Définissez un PIN ou activez la biométrie avant d'exiger le déverrouillage."
      );
      setPanel("pin");
      return;
    }
    setRequireUnlock(v);
    await patchSecurity({ require_unlock: v });
    onUserUpdate?.({ ...user, requireUnlock: v });
  };

  const savePinFromBoxes = async (code: string) => {
    if (pinBusyRef.current) return;
    if (pinStep === "pin") {
      setPin(code);
      setPinStep("confirm");
      setConfirm("");
      setMsg("");
      return;
    }
    if (code !== pin) {
      setMsg("Les codes ne correspondent pas.");
      setPin("");
      setConfirm("");
      setPinStep("pin");
      return;
    }
    pinBusyRef.current = true;
    setPinBusy(true);
    setMsg("");
    try {
      await api.setPin(code);
      setMsg("PIN enregistré.");
      setPin("");
      setConfirm("");
      setPinStep("pin");
      setOkFlash(true);
      hapticSuccess();
      setTimeout(() => setOkFlash(false), 1800);
      onUserUpdate?.({ ...user, hasPin: true });
    } catch (e: any) {
      setMsg(e.message || "Erreur");
      setConfirm("");
      setPinStep("pin");
      setPin("");
    } finally {
      pinBusyRef.current = false;
      setPinBusy(false);
    }
  };

  const allergiesSummary = allergiesLabel(user.allergies);

  return (
    <BrandBackground dark={!!dark}>
      <ScreenEnter>
        <Header title="Paramètres" />
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
          refreshControl={refreshControl}
        >
          <StaggerItem index={0}>
            <StoryArt
              preset="settings"
              compact
              dark={!!dark}
              title="Votre espace patient"
              subtitle="Profil, sécurité et confidentialité - en toute confiance."
            />
          </StaggerItem>

          <StaggerItem index={1}>
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Avatar
                uri={user.photoUrl}
                firstName={user.firstName}
                lastName={user.lastName}
                size={72}
              />
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 18, marginTop: 6 }}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, fontFamily: "monospace" }}>
                NPI : {user.npi}
              </Text>
              {!user.photoUrl ? (
                <View
                  style={{
                    marginTop: 6,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: colors.lightBlue,
                  }}
                >
                  <Text style={{ color: C.blue, fontSize: 11, fontWeight: "700" }}>
                    Photo à ajouter
                  </Text>
                </View>
              ) : null}
            </View>
          </StaggerItem>

          <SectionArt icon="person" label="PROFIL" dark={!!dark} />

          <StaggerItem index={2}>
            <SettingsRow
              icon="person-outline"
              label="Identité & contacts"
              subtitle="Nom, prénom, naissance, urgence"
              colors={colors}
              onPress={() =>
                navigation.getParent()?.navigate("ProfilComplet", { section: "identity" })
              }
            />
          </StaggerItem>
          <StaggerItem index={2}>
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Vérification d'identité"
              subtitle="Pièce, selfie, puis envoi du dossier"
              colors={colors}
              onPress={() => navigation.getParent()?.navigate("Kyc")}
            />
          </StaggerItem>
          <StaggerItem index={2}>
            <SettingsRow
              icon="home-outline"
              label="Filiation & adresse"
              subtitle={
                user.fatherName || user.addressCommune
                  ? `${user.fatherName || "Père -"} · ${user.addressCommune || "Commune -"}`
                  : "Père, mère, commune, quartier"
              }
              colors={colors}
              onPress={() =>
                navigation.getParent()?.navigate("ProfilComplet", { section: "filiation" })
              }
            />
          </StaggerItem>
          <StaggerItem index={2}>
            <SettingsRow
              icon="camera-outline"
              label="Photo d'identité"
              subtitle={user.photoUrl ? "Photo enregistrée" : "Visage centré"}
              colors={colors}
              onPress={() => setPanel("photo")}
            />
          </StaggerItem>
          <StaggerItem index={3}>
            <SettingsRow
              icon="medical-outline"
              label="Allergies"
              subtitle={allergiesSummary}
              colors={colors}
              onPress={() =>
                navigation.getParent()?.navigate("ProfilComplet", { section: "medical" })
              }
            />
          </StaggerItem>
          <StaggerItem index={4}>
            <SettingsRow
              icon="calendar-outline"
              label="Mes rendez-vous"
              subtitle="Agenda patient"
              colors={colors}
              onPress={() => navigation.getParent()?.navigate("RendezVous")}
            />
          </StaggerItem>

          <SectionArt icon="lock-closed" label="SÉCURITÉ" dark={!!dark} tone="navy" />

          <StaggerItem index={5}>
            <SettingsRow
              icon="key-outline"
              label="PIN de déverrouillage"
              subtitle={user.hasPin ? "PIN configuré · 4 chiffres" : "Optionnel · 4 chiffres"}
              colors={colors}
              onPress={() => {
                setMsg("");
                setPin("");
                setConfirm("");
                setPinStep("pin");
                setPanel("pin");
              }}
            />
          </StaggerItem>
          <StaggerItem index={6}>
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Verrouillage à l'ouverture"
              subtitle={
                requireUnlock
                  ? "PIN ou biométrie à chaque ouverture"
                  : "Désactivé · optionnel"
              }
              colors={colors}
              onPress={() => setPanel("securite")}
            />
          </StaggerItem>

          <SectionArt icon="people" label="ACCÈS & CONFIDENTIALITÉ" dark={!!dark} />

          <StaggerItem index={7}>
            <SettingsRow
              icon="people-outline"
              label="Accès professionnels"
              subtitle={
                online
                  ? `${activeList.length} accès actif${activeList.length === 1 ? "" : "s"}`
                  : "Connexion requise"
              }
              colors={colors}
              onPress={() => setPanel("acces")}
            />
          </StaggerItem>
          <StaggerItem index={8}>
            <SettingsRow
              icon="ban-outline"
              label="Blocages"
              subtitle={
                blocks.length
                  ? `${blocks.length} blocage${blocks.length === 1 ? "" : "s"}`
                  : "Aucun blocage"
              }
              colors={colors}
              onPress={() => {
                void reloadBlocks();
                setPanel("blocages");
              }}
            />
          </StaggerItem>

          <SectionArt icon="options" label="PRÉFÉRENCES" dark={!!dark} tone="amber" />

          <StaggerItem index={9}>
            <SettingsRow
              icon={dark ? "moon" : "sunny-outline"}
              label="Apparence"
              subtitle={dark ? "Mode sombre" : "Mode clair"}
              colors={colors}
              onPress={() => setPanel("apparence")}
            />
          </StaggerItem>
          <StaggerItem index={10}>
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              subtitle={pushEnabled ? "Push activées" : "Push désactivées"}
              colors={colors}
              onPress={() => setPanel("notifications")}
            />
          </StaggerItem>
          <StaggerItem index={11}>
            <SettingsRow
              icon="information-circle-outline"
              label="À propos"
              subtitle="Doto+ · hors ligne & confidentialité"
              colors={colors}
              onPress={() => setPanel("a-propos")}
            />
          </StaggerItem>

          <StaggerItem index={12}>
            <View style={{ marginTop: 12 }}>
              <SettingsRow
                icon="log-out-outline"
                label="Déconnexion"
                colors={colors}
                danger
                onPress={onLogout}
              />
            </View>
          </StaggerItem>
        </ScrollView>

        <SettingsModal
          visible={panel === "photo"}
          title="Photo d'identité"
          icon="camera-outline"
          colors={colors}
          onClose={() => setPanel(null)}
        >
          <PhotoIdentityPicker
            photoUrl={user.photoUrl}
            firstName={user.firstName}
            lastName={user.lastName}
            dark={dark}
            upload={async (uri, mime, name) => {
              const p = await api.uploadPhoto(uri, mime, name);
              onUserUpdate?.(p);
              return { photo_url: p.photoUrl || undefined };
            }}
            onUploaded={(url) => onUserUpdate?.({ ...user, photoUrl: url, photoRequired: false })}
          />
        </SettingsModal>

        <SettingsModal
          visible={panel === "pin"}
          title="PIN de déverrouillage"
          icon="key-outline"
          colors={colors}
          onClose={() => setPanel(null)}
        >
          <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
            Code optionnel pour verrouiller l&apos;application. La connexion reste par SMS.
          </Text>
          <PinInput
            value={pinStep === "confirm" ? confirm : pin}
            onChange={pinStep === "confirm" ? setConfirm : setPin}
            onComplete={savePinFromBoxes}
            error={!!msg && !msg.includes("enregistré") && !pinBusy}
            dark={!!dark}
            disabled={pinBusy}
            loading={pinBusy}
            label={pinStep === "confirm" ? "Confirmez le PIN" : "Nouveau PIN (4 chiffres)"}
          />
          {msg ? (
            <Text
              style={{
                color: msg.includes("enregistré") ? C.green : C.emergency,
                fontWeight: "600",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              {msg}
            </Text>
          ) : null}
          {okFlash ? <SuccessFlash visible message="PIN enregistré" /> : null}
        </SettingsModal>

        <SettingsModal
          visible={panel === "securite"}
          title="Verrouillage"
          icon="shield-checkmark-outline"
          colors={colors}
          onClose={() => setPanel(null)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Exiger un déverrouillage
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                À chaque ouverture de l&apos;app : PIN ou biométrie.
              </Text>
            </View>
            <Switch
              value={requireUnlock}
              onValueChange={toggleRequireUnlock}
              trackColor={{ true: C.emerald }}
            />
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 12,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {bioAvailable
                  ? "Authentification biométrique"
                  : "Biométrie indisponible"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                Face ID / empreinte - le PIN reste le secours.
              </Text>
            </View>
            <Switch
              value={biometric}
              onValueChange={toggleBio}
              disabled={!bioAvailable && !biometric}
              trackColor={{ true: C.emerald }}
            />
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 12,
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Urgence si verrouillé
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                Ouvrir le mode Urgence sans déverrouiller entièrement.
              </Text>
            </View>
            <Switch
              value={urgenceWhenLocked}
              onValueChange={async (v) => {
                setUrgenceWhenLocked(v);
                await patchSecurity({ urgence_when_locked: v });
                onUserUpdate?.({ ...user, urgenceWhenLocked: v });
              }}
              trackColor={{ true: C.emerald }}
            />
          </View>
        </SettingsModal>

        <SettingsModal
          visible={panel === "apparence"}
          title="Apparence"
          icon="color-palette-outline"
          colors={colors}
          onClose={() => setPanel(null)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <IconBadge name={dark ? "moon" : "sunny-outline"} color={C.blue} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Mode sombre</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Réduit la luminosité</Text>
            </View>
            <Switch
              value={!!dark}
              onValueChange={() => onToggleDark?.()}
              trackColor={{ true: C.emerald }}
            />
          </View>
        </SettingsModal>

        <SettingsModal
          visible={panel === "notifications"}
          title="Notifications"
          icon="notifications-outline"
          colors={colors}
          onClose={() => setPanel(null)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Notifications push</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                Alertes pour les demandes d&apos;accès. Les notifications in-app restent actives.
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={async (v) => {
                setPushEnabled(v);
                if (v) {
                  const { registerPushToken } = await import("../notifications");
                  await registerPushToken("dotoplus");
                } else {
                  await api.disableDeviceToken();
                }
              }}
              trackColor={{ true: C.emerald }}
            />
          </View>
        </SettingsModal>

        <SettingsModal
          visible={panel === "acces"}
          title="Accès professionnels"
          icon="people-outline"
          colors={colors}
          onClose={() => setPanel(null)}
        >
          {!online ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Connexion requise pour gérer les accès.
            </Text>
          ) : activeList.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Aucun professionnel n&apos;a d&apos;accès actif à votre dossier.
            </Text>
          ) : (
            activeList.map((req) => (
              <View
                key={req.id}
                style={{
                  gap: 8,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                  {req.requester_name || "Professionnel"}
                  {req.requester_role_label ? ` · ${req.requester_role_label}` : ""}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {req.status === "emergency_bypass" ? "Ouvert en urgence · " : ""}
                  Expire{" "}
                  {req.grant_expires_at
                    ? new Date(req.grant_expires_at).toLocaleString("fr-FR")
                    : "-"}
                </Text>
                <Button
                  title="Révoquer"
                  icon="ban-outline"
                  color={C.emergency}
                  outline
                  loading={revoke.isPending}
                  onPress={() => {
                    appAlert(
                      "Révoquer l'accès",
                      `Retirer l'accès de ${req.requester_name || "ce professionnel"} ?`,
                      [
                        { text: "Annuler", style: "cancel" },
                        {
                          text: "Révoquer",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              await revoke.mutateAsync(req.id);
                              hapticSuccess();
                            } catch (e: any) {
                              appAlert("Erreur", e.message || "Révocation impossible");
                            }
                          },
                        },
                      ]
                    );
                  }}
                />
                <Button
                  title="Bloquer définitivement"
                  color={C.emergency}
                  onPress={() => {
                    appAlert(
                      "Bloquer complètement",
                      `${req.requester_name} ne pourra plus jamais demander l'accès à votre dossier.`,
                      [
                        { text: "Annuler", style: "cancel" },
                        {
                          text: "Bloquer",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              await api.createAccessBlock({
                                blocked_user_id: req.requester_id,
                                reason: "Blocage patient depuis Doto+",
                              });
                              await revoke.mutateAsync(req.id).catch(() => {});
                              await reloadBlocks();
                              hapticSuccess();
                            } catch (e: any) {
                              appAlert("Erreur", e.message || "Blocage impossible");
                            }
                          },
                        },
                      ]
                    );
                  }}
                />
              </View>
            ))
          )}
        </SettingsModal>

        <SettingsModal
          visible={panel === "blocages"}
          title="Blocages"
          icon="ban-outline"
          colors={colors}
          onClose={() => setPanel(null)}
        >
          {blocks.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>Aucun blocage permanent.</Text>
          ) : (
            blocks.map((b) => (
              <View
                key={b.id}
                style={{
                  gap: 8,
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>
                  {b.blocked_user_name || b.blocked_structure_nom || "Cible"}
                  {b.blocked_user_role ? ` · ${b.blocked_user_role}` : ""}
                </Text>
                {b.reason ? (
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{b.reason}</Text>
                ) : null}
                <Button
                  title="Lever le blocage"
                  outline
                  color={C.blue}
                  onPress={async () => {
                    try {
                      await api.liftAccessBlock(b.id);
                      await reloadBlocks();
                      hapticSuccess();
                    } catch (e: any) {
                      appAlert("Erreur", e.message || "Impossible");
                    }
                  }}
                />
              </View>
            ))
          )}
        </SettingsModal>

        <SettingsModal
          visible={panel === "a-propos"}
          title="À propos"
          icon="information-circle-outline"
          colors={colors}
          onClose={() => setPanel(null)}
        >
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>Doto+</Text>
          <Text style={{ color: colors.muted, lineHeight: 20, marginTop: 8 }}>
            Application patient de la plateforme DOTO+. Votre dossier, votre DotoCard et vos
            consentements d&apos;accès.
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 0.5,
              marginTop: 18,
              marginBottom: 6,
            }}
          >
            HORS LIGNE
          </Text>
          <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
            Le mode urgence et la DotoCard utilisent le dernier snapshot synchronisé (profil,
            allergies, contact, token QR). Les consentements d&apos;accès nécessitent une connexion.
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 14 }}>Version 1.0</Text>
        </SettingsModal>
      </ScreenEnter>
    </BrandBackground>
  );
}
