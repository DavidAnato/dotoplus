import React, { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar, Text, View, Image, AppState, Modal } from "react-native";
import { AppDialogHost, appAlert } from "./src/components/AppDialog";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as LocalAuthentication from "expo-local-authentication";
import * as SplashScreen from "expo-splash-screen";
import { C, brandNavy, onBrand } from "./src/theme";
import { api, setSessionExpiredHandler } from "./src/api";
import { storage } from "./src/storage";
import { wipeClientCaches } from "./src/session";
import { persistOptions, queryClient } from "./src/queries/queryClient";
import { pingOnline, useAppStore } from "./src/store/appStore";
import { usePatientSSE, registerPushToken } from "./src/notifications";
import { useUnreadCount } from "./src/queries/hooks";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { PinLockScreen } from "./src/components/PinInput";
import Urgence from "./src/screens/Urgence";
import type { AuthStackParamList } from "./src/navigation/types";

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Verrouillage au retour seulement après cette durée hors app (pas à chaque switch). */
const AWAY_LOCK_MS = 15 * 60 * 1000;

async function hideSplash() {
  try {
    await SplashScreen.hideAsync();
  } catch {
    /* déjà masqué */
  }
}

function BootView() {
  const pulse = useSharedValue(0.97);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.02, { duration: 900 }), withTiming(0.97, { duration: 900 })),
      -1,
      false
    );
  }, [pulse]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <LinearGradient
      colors={[brandNavy, "#243F5C", C.blue]}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View style={style}>
        <Image
          source={require("./assets/splash-icon.png")}
          style={{ width: 112, height: 112 }}
          resizeMode="contain"
        />
      </Animated.View>
      <Text style={{ color: onBrand, marginTop: 16, fontWeight: "800", fontSize: 22, letterSpacing: 1 }}>
        DOTO+
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.65)", marginTop: 6, fontSize: 13 }}>
        Espace patient
      </Text>
    </LinearGradient>
  );
}

function AppInner() {
  const phase = useAppStore((s) => s.phase);
  const dark = useAppStore((s) => s.dark);
  const user = useAppStore((s) => s.user);
  const locked = useAppStore((s) => s.locked);
  const urgenceBypass = useAppStore((s) => s.urgenceBypass);
  const setPhase = useAppStore((s) => s.setPhase);
  const setUser = useAppStore((s) => s.setUser);
  const setLocked = useAppStore((s) => s.setLocked);
  const setUrgenceBypass = useAppStore((s) => s.setUrgenceBypass);
  const enterMain = useAppStore((s) => s.enterMain);
  const hydrateTheme = useAppStore((s) => s.hydrateTheme);
  const setUnread = useAppStore((s) => s.setUnread);
  const pushEnabled = useAppStore((s) => s.pushEnabled);
  const [authInitial, setAuthInitial] = React.useState<keyof AuthStackParamList>("Login");
  const [bootDone, setBootDone] = React.useState(false);
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const pinBusyRef = useRef(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const wasBackground = useRef(false);
  const backgroundAt = useRef<number | null>(null);

  usePatientSSE(phase === "main" && !locked);
  const unreadQ = useUnreadCount(phase === "main" && !locked);
  useEffect(() => {
    if (typeof unreadQ.data === "number") setUnread(unreadQ.data);
  }, [unreadQ.data, setUnread]);

  useEffect(() => {
    if (phase === "main" && pushEnabled) {
      void registerPushToken("dotoplus");
    }
  }, [phase, pushEnabled]);

  const tryBiometricUnlock = useCallback(async (): Promise<boolean> => {
    const enabled = await storage.isBioEnabled();
    if (!enabled) return false;
    const hw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = hw && (await LocalAuthentication.isEnrolledAsync());
    if (!enrolled) return false;
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "Déverrouiller DOTO+",
      cancelLabel: "Utiliser le PIN",
      disableDeviceFallback: true,
    });
    return !!res.success;
  }, []);

  const shouldLock = useCallback(async (profile: { requireUnlock?: boolean; hasPin?: boolean }) => {
    if (!profile.requireUnlock) return false;
    if (profile.hasPin) return true;
    const bio = await storage.isBioEnabled();
    return bio;
  }, []);

  useEffect(() => {
    hydrateTheme();
    LocalAuthentication.hasHardwareAsync()
      .then(async (hw) => {
        const enrolled = hw ? await LocalAuthentication.isEnrolledAsync() : false;
        setBioAvailable(hw && enrolled);
      })
      .catch(() => setBioAvailable(false));
  }, [hydrateTheme]);

  useEffect(() => {
    setSessionExpiredHandler((msg) => {
      void wipeClientCaches().then(() => {
        setPhase("login");
        appAlert("Session", msg);
      });
    });
    return () => setSessionExpiredHandler(null);
  }, [setPhase]);

  useEffect(() => {
    pingOnline();
    const id = setInterval(pingOnline, 15000);
    const sub = AppState.addEventListener("change", async (s) => {
      if (s === "active") {
        pingOnline();
        if (wasBackground.current && phase === "main") {
          const left = backgroundAt.current;
          const awayLongEnough = left != null && Date.now() - left >= AWAY_LOCK_MS;
          if (awayLongEnough) {
            const u = useAppStore.getState().user;
            if (await shouldLock(u)) {
              setLocked(true);
              setPinError("");
            }
          }
        }
        wasBackground.current = false;
        backgroundAt.current = null;
      } else if (s === "background") {
        // Ignorer "inactive" (transitions iOS / multitâche) — trop agressif
        wasBackground.current = true;
        backgroundAt.current = Date.now();
      }
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [phase, setLocked, shouldLock]);

  useEffect(() => {
    (async () => {
      try {
        const token = await storage.getAccess();
        if (token) {
          try {
            const me = await api.me();
            if (me) {
              enterMain(me);
              if (await shouldLock(me)) {
                const bioOk = await tryBiometricUnlock();
                if (!bioOk) setLocked(true);
                else setLocked(false);
              }
              return;
            }
          } catch {
            const snap = await storage.getSnapshot();
            if (snap?.profile) {
              enterMain(snap.profile);
              if (await shouldLock(snap.profile)) setLocked(true);
              return;
            }
          }
        }
        const snap = await storage.getSnapshot();
        setAuthInitial(snap ? "Login" : "Onboarding");
        setPhase(snap ? "login" : "onboarding");
      } finally {
        setBootDone(true);
        await hideSplash();
      }
    })();
  }, [enterMain, setPhase, setLocked, shouldLock, tryBiometricUnlock]);

  useEffect(() => {
    if (bootDone && phase !== "boot") {
      void hideSplash();
    }
  }, [bootDone, phase]);

  const unlockWithPin = async (pin: string) => {
    if (pinBusyRef.current) return;
    pinBusyRef.current = true;
    setPinBusy(true);
    setPinError("");
    try {
      // Local d'abord (SecureStore) — déverrouillage instantané
      if (await storage.matchLocalPin(pin)) {
        setLocked(false);
        void api.verifyPin(pin).catch(() => {});
        return;
      }
      await api.verifyPin(pin);
      setLocked(false);
    } catch (e: any) {
      const online = useAppStore.getState().online;
      if (!online && (await storage.matchLocalPin(pin))) {
        setLocked(false);
        return;
      }
      setPinError(e.message || "PIN incorrect.");
    } finally {
      pinBusyRef.current = false;
      setPinBusy(false);
    }
  };

  const unlockWithBio = async () => {
    if (pinBusyRef.current) return;
    if (await tryBiometricUnlock()) {
      setLocked(false);
      setPinError("");
    }
  };

  if (phase === "boot") {
    return (
      <SafeAreaProvider>
        <BootView />
      </SafeAreaProvider>
    );
  }

  const barBg = brandNavy;
  const showLock = phase === "main" && locked;
  const urgenceOk = user.urgenceWhenLocked !== false;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: barBg }} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={barBg} />
        <View style={{ flex: 1, backgroundColor: dark ? "#0A0A0A" : C.bg }}>
          <RootNavigator authInitial={authInitial} />
          <AppDialogHost dark={dark} />
          <Modal visible={showLock} animationType="fade" presentationStyle="fullScreen">
            <SafeAreaView style={{ flex: 1, backgroundColor: dark ? "#0A0A0A" : "#F0F4F7" }}>
              {urgenceBypass ? (
                <Urgence
                  dark={dark}
                  user={user}
                  onBack={() => setUrgenceBypass(false)}
                />
              ) : (
                <PinLockScreen
                  title="DOTO+ verrouillé"
                  subtitle="Entrez votre code PIN pour continuer"
                  dark={dark}
                  error={pinError}
                  loading={pinBusy}
                  bioAvailable={bioAvailable}
                  onBio={unlockWithBio}
                  onSubmit={unlockWithPin}
                  onUrgence={
                    urgenceOk
                      ? () => setUrgenceBypass(true)
                      : undefined
                  }
                />
              )}
            </SafeAreaView>
          </Modal>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

class BootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[dotoplus] boot crash:", error?.message, error?.stack);
    void hideSplash();
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: brandNavy, padding: 24, justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 8 }}>
            DOTO+ — erreur au démarrage
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 20 }}>
            {this.state.error.message || String(this.state.error)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BootErrorBoundary>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <AppInner />
        </PersistQueryClientProvider>
      </BootErrorBoundary>
    </GestureHandlerRootView>
  );
}
