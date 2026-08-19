import React, { useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, PhoneField } from "../ui";
import { C, DEMO_USER, Profile, brandNavy, darkC } from "../theme";
import { useScreenInsets } from "../safeArea";
import { useLoginMutation, useRegisterMutation } from "../queries/hooks";
import { api } from "../api";
import { CardDecor, PressScale, ScreenEnter, StaggerItem } from "../motion";
import { PinInput } from "../components/PinInput";
import { IdCardScanField, IdCardOcrResult } from "../components/IdCardScanField";
import { displayPhoneBj, isValidBjPhone, toE164Bj, nationalDigits } from "../phone";

type Flow = "welcome" | "login" | "register";
type LoginStep = "phone" | "otp";
type RegisterStep = "card" | "phone" | "otp";

/** Pastilles d’étapes - ancrage mental « où je suis ». */
function StepDots({
  labels,
  current,
  dark,
}: {
  labels: string[];
  current: number;
  dark?: boolean;
}) {
  const colors = dark ? darkC : C;
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 0 }}>
        {labels.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <React.Fragment key={label}>
              {i > 0 ? (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: done || active ? C.blue : colors.border,
                    marginHorizontal: 4,
                  }}
                />
              ) : null}
              <View style={{ alignItems: "center", minWidth: 56 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: done || active ? C.blue : dark ? "#1A1A1A" : "#F3F4F6",
                    borderWidth: done || active ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <Text
                      style={{
                        color: active ? "#fff" : colors.muted,
                        fontWeight: "800",
                        fontSize: 12,
                      }}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
              </View>
            </React.Fragment>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", marginTop: 8 }}>
        {labels.map((label, i) => (
          <Text
            key={label}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11,
              fontWeight: i === current ? "800" : "600",
              color: i === current ? (dark ? colors.text : brandNavy) : colors.muted,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function AuthHeader({
  dark,
  title,
  subtitle,
  onBack,
}: {
  dark?: boolean;
  title: string;
  subtitle: string;
  onBack?: () => void;
}) {
  const colors = dark ? darkC : C;
  return (
    <View style={{ marginBottom: 8 }}>
      {onBack ? (
        <PressScale
          onPress={onBack}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14, alignSelf: "flex-start" }}
        >
          <Ionicons name="chevron-back" size={22} color={dark ? colors.text : brandNavy} />
          <Text style={{ color: dark ? colors.text : brandNavy, fontWeight: "700", fontSize: 14 }}>
            Retour
          </Text>
        </PressScale>
      ) : null}
      <View style={{ alignItems: "center" }}>
        <Image
          source={require("../../assets/logo-mark.png")}
          style={{ width: 52, height: 52, borderRadius: 14 }}
          resizeMode="contain"
        />
        <Image
          source={require("../../assets/logo-doto.png")}
          style={{ width: 132, height: 30, marginTop: 10 }}
          resizeMode="contain"
        />
        <Text
          style={{
            color: dark ? colors.text : brandNavy,
            fontWeight: "800",
            fontSize: 20,
            marginTop: 16,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontSize: 14,
            marginTop: 6,
            textAlign: "center",
            lineHeight: 20,
            paddingHorizontal: 8,
          }}
        >
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function Surface({
  dark,
  children,
}: {
  dark?: boolean;
  children: React.ReactNode;
}) {
  const colors = dark ? darkC : C;
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 22,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#1E3755",
        shadowOpacity: dark ? 0 : 0.06,
        shadowRadius: 14,
        elevation: dark ? 0 : 2,
        overflow: "hidden",
      }}
    >
      <CardDecor variant="calm" dark={!!dark} />
      {children}
    </View>
  );
}

export default function Login({
  onLogin,
  onDemo,
  dark = false,
}: {
  onLogin: (p: Profile) => void;
  onDemo?: () => void;
  dark?: boolean;
}) {
  const colors = dark ? darkC : C;
  const { headerPad, scrollBottom } = useScreenInsets();
  const [flow, setFlow] = useState<Flow>("welcome");
  const [loginStep, setLoginStep] = useState<LoginStep>("phone");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("card");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [idCard, setIdCard] = useState<IdCardOcrResult | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingUi, setVerifyingUi] = useState(false);
  const verifyingRef = useRef(false);
  const loginMut = useLoginMutation();
  const registerMut = useRegisterMutation();
  const verifying = verifyingUi || loginMut.isPending || registerMut.isPending;
  const busy = verifying || sendingOtp || ocrBusy;

  const fullPhone = () => toE164Bj(phone);

  const resetAuthFields = () => {
    setPhone("");
    setOtp("");
    setIdCard(null);
    setHint("");
    setError("");
    setLoginStep("phone");
    setRegisterStep("card");
  };

  const goWelcome = () => {
    resetAuthFields();
    setFlow("welcome");
  };

  const goLogin = () => {
    resetAuthFields();
    setFlow("login");
    setLoginStep("phone");
  };

  const goRegister = () => {
    resetAuthFields();
    setFlow("register");
    setRegisterStep("card");
  };

  const sendOtp = async (purpose: "login" | "register") => {
    if (busy) return;
    if (purpose === "register" && !idCard?.npi) {
      setError("Validez d’abord le scan de votre carte.");
      return;
    }
    if (!isValidBjPhone(phone)) {
      setError("Saisissez un numéro béninois valide.");
      return;
    }
    setError("");
    setSendingOtp(true);
    try {
      const res = await api.requestOtp(fullPhone(), purpose);
      setHint(res.hint || "Code envoyé par SMS.");
      if (String(res.hint || "").includes("00000")) setOtp("00000");
      if (purpose === "login") setLoginStep("otp");
      else setRegisterStep("otp");
    } catch (e: any) {
      setError(e.message || "Envoi du code impossible.");
    } finally {
      setSendingOtp(false);
    }
  };

  const submitLogin = async (code?: string) => {
    if (verifyingRef.current) return;
    const otpCode = (code || otp).trim();
    if (!isValidBjPhone(phone) || !otpCode) {
      setError("Téléphone et code SMS requis.");
      return;
    }
    verifyingRef.current = true;
    setVerifyingUi(true);
    setError("");
    try {
      onLogin(await loginMut.mutateAsync({ phone: fullPhone(), otp: otpCode }));
    } catch (e: any) {
      setError(e.message || "Connexion impossible.");
      setOtp("");
    } finally {
      verifyingRef.current = false;
      setVerifyingUi(false);
    }
  };

  const submitRegister = async (code?: string) => {
    if (verifyingRef.current) return;
    const otpCode = (code || otp).trim();
    if (!idCard?.npi) {
      setError("Scan de carte requis.");
      return;
    }
    if (!isValidBjPhone(phone) || !otpCode) {
      setError("Téléphone et code SMS requis.");
      return;
    }
    verifyingRef.current = true;
    setVerifyingUi(true);
    setError("");
    try {
      onLogin(
        await registerMut.mutateAsync({
          phone: fullPhone(),
          otp: otpCode,
          npi: idCard.npi,
          first_name: (idCard.first_name || "").trim(),
          last_name: (idCard.last_name || "").trim(),
          birth_date: idCard.birth_date || undefined,
          birth_place: idCard.birth_place || undefined,
          father_name: idCard.father_name || undefined,
          mother_name: idCard.mother_name || undefined,
          address_commune: idCard.address_commune || undefined,
          address_quartier: idCard.address_quartier || undefined,
        })
      );
    } catch (e: any) {
      setError(e.message || "Inscription impossible.");
      setOtp("");
    } finally {
      verifyingRef.current = false;
      setVerifyingUi(false);
    }
  };

  const grad = dark
    ? ([colors.bg, "#121212", colors.white] as const)
    : (["#E8F2F5", "#F7FAFB", "#FFFFFF"] as const);

  const startDemo = () => (onDemo ? onDemo() : onLogin(DEMO_USER));

  // --- Écran d’accueil : un choix, pas un formulaire ---
  if (flow === "welcome") {
    return (
      <LinearGradient colors={[...grad]} style={{ flex: 1 }}>
        <ScreenEnter>
          <ScrollView
            contentContainerStyle={{
              padding: 24,
              paddingTop: headerPad + 24,
              paddingBottom: scrollBottom,
              flexGrow: 1,
              justifyContent: "center",
            }}
            keyboardShouldPersistTaps="handled"
          >
            <StaggerItem index={0}>
              <View style={{ alignItems: "center", marginBottom: 28 }}>
                <Image
                  source={require("../../assets/logo-mark.png")}
                  style={{ width: 72, height: 72, borderRadius: 20 }}
                  resizeMode="contain"
                />
                <Image
                  source={require("../../assets/logo-doto.png")}
                  style={{ width: 160, height: 36, marginTop: 14 }}
                  resizeMode="contain"
                />
                <Text
                  style={{
                    color: dark ? colors.text : brandNavy,
                    fontWeight: "800",
                    fontSize: 22,
                    marginTop: 20,
                    textAlign: "center",
                  }}
                >
                  Votre santé, simplifiée
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 15,
                    marginTop: 8,
                    textAlign: "center",
                    lineHeight: 22,
                    paddingHorizontal: 12,
                  }}
                >
                  Dossier médical, DotoCard et urgences - accessibles en un scan.
                </Text>
              </View>
            </StaggerItem>

            <StaggerItem index={1}>
              <Surface dark={dark}>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 12,
                    fontWeight: "700",
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    marginBottom: 14,
                    textAlign: "center",
                  }}
                >
                  Comment souhaitez-vous continuer ?
                </Text>

                <Pressable
                  onPress={goLogin}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: dark ? "#1C2A2E" : "#F0F7FA",
                    borderWidth: 1.5,
                    borderColor: C.blue + "55",
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: C.blue,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="log-in-outline" size={24} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>
                      Se connecter
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                      J’ai déjà un compte DOTO+
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={C.blue} />
                </Pressable>

                <Pressable
                  onPress={goRegister}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: dark ? "#141A1C" : "#FAFBFC",
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: dark ? "#1A1A1A" : "#EEF1F4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="person-add-outline" size={22} color={dark ? C.blue : brandNavy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>
                      Créer un compte
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                      Nouveau · CIP ou carte CEDEAO
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.grey} />
                </Pressable>
              </Surface>
            </StaggerItem>

            <StaggerItem index={2}>
              <PressScale onPress={startDemo} style={{ marginTop: 22, alignItems: "center" }}>
                <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>
                  Explorer en démo (hors ligne)
                </Text>
              </PressScale>
              <Text
                style={{
                  textAlign: "center",
                  color: colors.grey,
                  fontSize: 11,
                  marginTop: 18,
                  lineHeight: 16,
                }}
              >
                Connexion sécurisée par SMS · aucun mot de passe
              </Text>
            </StaggerItem>
          </ScrollView>
        </ScreenEnter>
      </LinearGradient>
    );
  }

  // --- Connexion ---
  if (flow === "login") {
    const stepIndex = loginStep === "phone" ? 0 : 1;
    return (
      <LinearGradient colors={[...grad]} style={{ flex: 1 }}>
        <ScreenEnter>
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingTop: headerPad + 16, paddingBottom: scrollBottom }}
            keyboardShouldPersistTaps="handled"
          >
            <AuthHeader
              dark={dark}
              onBack={loginStep === "phone" ? goWelcome : () => { setLoginStep("phone"); setOtp(""); setError(""); setHint(""); }}
              title={loginStep === "phone" ? "Connexion" : "Code SMS"}
              subtitle={
                loginStep === "phone"
                  ? "Entrez le numéro lié à votre compte. Un code à 5 chiffres vous sera envoyé."
                  : `Code envoyé au ${displayPhoneBj(fullPhone())}. Saisissez-le pour entrer.`
              }
            />

            <Surface dark={dark}>
              <StepDots labels={["Téléphone", "Code SMS"]} current={stepIndex} dark={dark} />

              {loginStep === "phone" ? (
                <>
                  <PhoneField
                    label="Votre numéro"
                    value={phone}
                    onChangeText={(t) => {
                      if (busy) return;
                      setPhone(t);
                      setError("");
                    }}
                    colors={colors}
                    disabled={busy}
                  />
                  {error ? (
                    <Text style={{ color: C.emergency, fontWeight: "600", marginBottom: 12 }}>{error}</Text>
                  ) : null}
                  <Button
                    title="Recevoir le code"
                    icon="chatbubble-outline"
                    onPress={() => void sendOtp("login")}
                    loading={sendingOtp}
                    disabled={busy || !isValidBjPhone(phone)}
                  />
                </>
              ) : (
                <>
                  <PinInput
                    value={otp}
                    onChange={setOtp}
                    onComplete={(code) => void submitLogin(code)}
                    error={!!error && !verifying}
                    dark={dark}
                    secure={false}
                    length={5}
                    label="Code reçu par SMS"
                    disabled={busy}
                    loading={verifying}
                  />
                  <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 8, marginBottom: 14 }}>
                    {verifying ? "Vérification…" : hint || "5 chiffres"}
                  </Text>
                  {error ? (
                    <Text style={{ color: C.emergency, fontWeight: "600", marginBottom: 12 }}>{error}</Text>
                  ) : null}
                  <Button
                    title="Se connecter"
                    icon="log-in-outline"
                    onPress={() => void submitLogin()}
                    loading={verifying}
                    disabled={busy || otp.trim().length < 5}
                  />
                  <PressScale
                    onPress={() => void sendOtp("login")}
                    disabled={busy}
                    style={{ marginTop: 14, alignItems: "center", opacity: busy ? 0.45 : 1 }}
                  >
                    <Text style={{ color: C.blue, fontWeight: "700", fontSize: 13 }}>Renvoyer le code</Text>
                  </PressScale>
                </>
              )}
            </Surface>

            <PressScale onPress={goRegister} style={{ marginTop: 20, alignItems: "center" }}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                Pas encore de compte ?{" "}
                <Text style={{ color: C.blue, fontWeight: "800" }}>S’inscrire</Text>
              </Text>
            </PressScale>
          </ScrollView>
        </ScreenEnter>
      </LinearGradient>
    );
  }

  // --- Inscription (3 étapes) ---
  const regIndex = registerStep === "card" ? 0 : registerStep === "phone" ? 1 : 2;
  const regTitles: Record<RegisterStep, { title: string; subtitle: string }> = {
    card: {
      title: "Votre identité",
      subtitle: "Scannez votre CIP ou carte CEDEAO. Le NPI et vos infos sont lus automatiquement.",
    },
    phone: {
      title: "Votre téléphone",
      subtitle: "Ce numéro servira à vous connecter. Un code SMS confirmera que c’est bien vous.",
    },
    otp: {
      title: "Confirmation",
      subtitle: `Entrez le code reçu au ${displayPhoneBj(fullPhone())} pour activer votre compte.`,
    },
  };

  const onBackRegister = () => {
    setError("");
    setHint("");
    if (registerStep === "card") goWelcome();
    else if (registerStep === "phone") {
      setRegisterStep("card");
      setOtp("");
    } else {
      setRegisterStep("phone");
      setOtp("");
    }
  };

  return (
    <LinearGradient colors={[...grad]} style={{ flex: 1 }}>
      <ScreenEnter>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: headerPad + 16, paddingBottom: scrollBottom }}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader
            dark={dark}
            onBack={onBackRegister}
            title={regTitles[registerStep].title}
            subtitle={regTitles[registerStep].subtitle}
          />

          <Surface dark={dark}>
            <StepDots labels={["Carte", "Tél.", "SMS"]} current={regIndex} dark={dark} />

            {registerStep === "card" ? (
              <>
                <IdCardScanField
                  dark={dark}
                  busy={ocrBusy}
                  result={idCard}
                  onClear={() => {
                    setIdCard(null);
                    setError("");
                  }}
                  onConfirmed={(data) => {
                    setIdCard(data);
                    setError("");
                    if (data.phone && !nationalDigits(phone)) setPhone(toE164Bj(data.phone));
                    // Avance auto : une décision validée → étape suivante
                    setRegisterStep("phone");
                  }}
                  onScan={async (uri, mime, name) => {
                    setOcrBusy(true);
                    setError("");
                    try {
                      return await api.ocrIdCard(uri, mime, name);
                    } finally {
                      setOcrBusy(false);
                    }
                  }}
                />
                {error ? (
                  <Text style={{ color: C.emergency, fontWeight: "600", marginBottom: 8 }}>{error}</Text>
                ) : null}
                {idCard?.npi ? (
                  <Button
                    title="Continuer"
                    icon="arrow-forward"
                    onPress={() => setRegisterStep("phone")}
                    disabled={busy}
                  />
                ) : (
                  <Text
                    style={{
                      color: colors.muted,
                      fontSize: 12,
                      textAlign: "center",
                      lineHeight: 18,
                      marginTop: 4,
                    }}
                  >
                    Cadrez toute la carte · le NPI doit être lisible
                  </Text>
                )}
              </>
            ) : null}

            {registerStep === "phone" ? (
              <>
                {idCard?.npi ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: dark ? "#14201A" : "#F0FDF4",
                      borderWidth: 1,
                      borderColor: dark ? "#1F3D2E" : "#BBF7D0",
                      marginBottom: 14,
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={20} color={dark ? "#4ADE80" : "#16A34A"} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>
                        {[idCard.last_name, idCard.first_name].filter(Boolean).join(" ") || "Identité OK"}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>NPI {idCard.npi}</Text>
                    </View>
                  </View>
                ) : null}
                <PhoneField
                  label="Numéro de téléphone"
                  value={phone}
                  onChangeText={(t) => {
                    if (busy) return;
                    setPhone(t);
                    setError("");
                  }}
                  colors={colors}
                  disabled={busy}
                />
                {error ? (
                  <Text style={{ color: C.emergency, fontWeight: "600", marginBottom: 12 }}>{error}</Text>
                ) : null}
                <Button
                  title="Recevoir le code SMS"
                  icon="chatbubble-outline"
                  onPress={() => void sendOtp("register")}
                  loading={sendingOtp}
                  disabled={busy || !isValidBjPhone(phone) || !idCard?.npi}
                />
              </>
            ) : null}

            {registerStep === "otp" ? (
              <>
                <PinInput
                  value={otp}
                  onChange={setOtp}
                  onComplete={(code) => void submitRegister(code)}
                  error={!!error && !verifying}
                  dark={dark}
                  secure={false}
                  length={5}
                  label="Code reçu par SMS"
                  disabled={busy}
                  loading={verifying}
                />
                <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 8, marginBottom: 14 }}>
                  {verifying ? "Création du compte…" : hint || "5 chiffres"}
                </Text>
                {error ? (
                  <Text style={{ color: C.emergency, fontWeight: "600", marginBottom: 12 }}>{error}</Text>
                ) : null}
                <Button
                  title="Activer mon compte"
                  icon="checkmark-circle-outline"
                  onPress={() => void submitRegister()}
                  loading={verifying}
                  disabled={busy || otp.trim().length < 5}
                />
                <PressScale
                  onPress={() => void sendOtp("register")}
                  disabled={busy}
                  style={{ marginTop: 14, alignItems: "center", opacity: busy ? 0.45 : 1 }}
                >
                  <Text style={{ color: C.blue, fontWeight: "700", fontSize: 13 }}>Renvoyer le code</Text>
                </PressScale>
              </>
            ) : null}
          </Surface>

          <PressScale onPress={goLogin} style={{ marginTop: 20, alignItems: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Déjà inscrit ?{" "}
              <Text style={{ color: C.blue, fontWeight: "800" }}>Se connecter</Text>
            </Text>
          </PressScale>
        </ScrollView>
      </ScreenEnter>
    </LinearGradient>
  );
}
