import React, { useCallback, useEffect, useRef } from "react";
import { BackHandler, Platform, Text, View } from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { C, DEMO_USER, brandNavy, darkC } from "../theme";
import { api } from "../api";
import { storage } from "../storage";
import { logoutFully } from "../session";
import { queryClient } from "../queries/queryClient";
import { hapticLight } from "../motion";
import { useAppStore } from "../store/appStore";
import { usePendingAccessRequests, useUnreadCount } from "../queries/hooks";
import { ConsentModalHost } from "../components/ConsentModal";
import { appAlert } from "../components/AppDialog";
import Onboarding from "../screens/Onboarding";
import Login from "../screens/Login";
import Home from "../screens/Home";
import Dossier from "../screens/Dossier";
import Carte from "../screens/Carte";
import Parametres from "../screens/Parametres";
import Urgence from "../screens/Urgence";
import NotificationsScreen from "../screens/Notifications";
import RendezVous from "../screens/RendezVous";
import ProfilComplet from "../screens/ProfilComplet";
import KycScreen from "../screens/Kyc";
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from "./types";
import { takePendingPush } from "../notifications";
import { notificationTarget } from "../notifRoutes";
import { useScreenInsets } from "../safeArea";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

/** Sur l'onglet racine : confirmer avant de quitter (Android). */
function useAndroidExitConfirm(appName: string) {
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return undefined;
      const onBack = () => {
        const parent = navigation.getParent();
        if (parent?.canGoBack()) return false;
        appAlert(`Quitter ${appName}`, "Fermer l'application ?", [
          { text: "Annuler", style: "cancel" },
          { text: "Quitter", style: "destructive", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [navigation, appName])
  );
}

function OfflineBanner() {
  const online = useAppStore((s) => s.online);
  const dark = useAppStore((s) => s.dark);
  const colors = dark ? darkC : C;
  if (online) return null;
  return (
    <View
      style={{
        backgroundColor: colors.amberSoft,
        paddingVertical: 8,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.amber} />
      <Text style={{ color: colors.amber, fontWeight: "700", fontSize: 12, flex: 1 }}>
        Hors ligne - cache local, file d'actions rejouée à la reconnexion
      </Text>
    </View>
  );
}

function AuthNavigator({ initialRoute }: { initialRoute: keyof AuthStackParamList }) {
  const dark = useAppStore((s) => s.dark);
  const enterMain = useAppStore((s) => s.enterMain);

  return (
    <AuthStack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: dark ? darkC.bg : C.bg },
      }}
    >
      <AuthStack.Screen name="Onboarding">
        {({ navigation }) => (
          <Onboarding dark={dark} onDone={() => navigation.replace("Login")} />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="Login">
        {() => (
          <Login
            dark={dark}
            onLogin={enterMain}
            onDemo={async () => {
              try {
                queryClient.clear();
                await api.requestOtp(DEMO_USER.phone, "login");
                const profile = await api.login(DEMO_USER.phone, "00000");
                enterMain(profile);
              } catch (e: any) {
                console.warn("[dotoplus] demo login failed:", e?.message || e);
                await storage.saveSnapshot({
                  profile: DEMO_USER,
                  cardToken: "DEMO-DOTOCARD-TOKEN-OFFLINE",
                  cardId: null,
                  syncedAt: new Date().toISOString(),
                });
                enterMain(DEMO_USER);
              }
            }}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function HomeTabScreen() {
  useAndroidExitConfirm("DOTO+");
  const dark = useAppStore((s) => s.dark);
  const user = useAppStore((s) => s.user);
  const navigation = useNavigation<any>();

  return (
    <Home
      user={user}
      dark={dark}
      onUrgence={() => navigation.getParent()?.navigate("Urgence")}
      onNavigate={(key) => {
        hapticLight();
        if (key === "carte") navigation.navigate("Carte");
        else if (key === "rdv") navigation.getParent()?.navigate("RendezVous");
        else if (key === "dossier" || key === "ordo") navigation.navigate("Dossier");
        else if (key === "notifications") navigation.navigate("Notifications");
      }}
    />
  );
}

function MainTabs() {
  const dark = useAppStore((s) => s.dark);
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const setPhase = useAppStore((s) => s.setPhase);
  const toggleDark = useAppStore((s) => s.toggleDark);
  const storeUnread = useAppStore((s) => s.unread);
  const colors = dark ? darkC : C;
  const { tabBarPad } = useScreenInsets();

  const unreadQ = useUnreadCount(true);
  const pendingQ = usePendingAccessRequests(true);
  const dossierBadges = useAppStore((s) => s.dossierBadges);
  const alertBadge = (unreadQ.data ?? storeUnread) + (pendingQ.data?.length || 0);
  const dossierBadgeTotal =
    (dossierBadges.dossier || 0) +
    (dossierBadges.ordonnances || 0) +
    (dossierBadges.examens || 0) +
    (dossierBadges.assurance || 0);

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: colors.grey,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: tabBarPad,
          paddingTop: 6,
          height: 52 + tabBarPad,
          elevation: 8,
          shadowColor: brandNavy,
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
        tabBarIcon: ({ color, focused, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? "home" : "home-outline",
            Dossier: focused ? "folder" : "folder-outline",
            Carte: focused ? "card" : "card-outline",
            Notifications: focused ? "notifications" : "notifications-outline",
            Parametres: focused ? "settings" : "settings-outline",
          };
          return <Ionicons name={map[route.name]} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeTabScreen} options={{ title: "Accueil" }} />
      <Tab.Screen
        name="Dossier"
        options={{
          title: "Dossier",
          tabBarBadge:
            dossierBadgeTotal > 0
              ? dossierBadgeTotal > 9
                ? "9+"
                : dossierBadgeTotal
              : undefined,
        }}
      >
        {() => <Dossier user={user} dark={dark} />}
      </Tab.Screen>
      <Tab.Screen name="Carte" options={{ title: "Ma carte" }}>
        {() => <Carte user={user} dark={dark} />}
      </Tab.Screen>
      <Tab.Screen
        name="Notifications"
        options={{
          title: "Alertes",
          tabBarBadge: alertBadge > 0 ? (alertBadge > 9 ? "9+" : alertBadge) : undefined,
        }}
      >
        {() => <NotificationsScreen dark={dark} />}
      </Tab.Screen>
      <Tab.Screen name="Parametres" options={{ title: "Paramètres" }}>
        {() => (
          <Parametres
            user={user}
            dark={dark}
            onToggleDark={toggleDark}
            onUserUpdate={setUser}
            onLogout={async () => {
              await logoutFully();
              setPhase("login");
            }}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function MainNavigator() {
  const dark = useAppStore((s) => s.dark);
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const colors = dark ? darkC : C;

  const openUrgencePrep = useCallback(async () => {
    const snap = await storage.getSnapshot();
    if (snap?.profile) setUser(snap.profile);
  }, [setUser]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <RootStack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen name="RendezVous">
          {({ navigation }) => (
            <RendezVous
              dark={dark}
            />
          )}
        </RootStack.Screen>
        <RootStack.Screen name="ProfilComplet">
          {({ navigation, route }) => (
            <ProfilComplet
              user={user}
              dark={dark}
              onUserUpdate={setUser}
              initialSection={route.params?.section}
              onDone={() => {
                if (navigation.canGoBack()) navigation.goBack();
              }}
            />
          )}
        </RootStack.Screen>
        <RootStack.Screen name="Kyc">
          {({ navigation }) => (
            <KycScreen
              dark={dark}
              onDone={() => {
                if (navigation.canGoBack()) navigation.goBack();
              }}
            />
          )}
        </RootStack.Screen>
        <RootStack.Screen
          name="Urgence"
          options={{
            animation: "slide_from_bottom",
            presentation: "fullScreenModal",
            gestureEnabled: true,
          }}
          listeners={{
            focus: () => {
              void openUrgencePrep();
            },
          }}
        >
          {({ navigation }) => (
            <Urgence
              dark={dark}
              user={user}
              onBack={() => {
                if (navigation.canGoBack()) navigation.goBack();
              }}
            />
          )}
        </RootStack.Screen>
      </RootStack.Navigator>
      <ConsentModalHost />
    </View>
  );
}

export function RootNavigator({ authInitial }: { authInitial?: keyof AuthStackParamList }) {
  const phase = useAppStore((s) => s.phase);
  const dark = useAppStore((s) => s.dark);
  const navRef = useRef<any>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const data = takePendingPush();
      if (!data || !navRef.current) return;
      try {
        const t = notificationTarget({ ...data, payload: data });
        navRef.current.navigate(t.screen, "params" in t ? t.params : undefined);
      } catch {
        /* nav not ready */
      }
    }, 700);
    return () => clearInterval(id);
  }, []);

  const navTheme = dark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: darkC.bg,
          card: darkC.white,
          text: darkC.text,
          border: darkC.border,
          primary: C.blue,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: C.bg,
          card: C.white,
          text: C.text,
          border: C.border,
          primary: C.blue,
        },
      };

  if (phase === "onboarding" || phase === "login") {
    return (
      <NavigationContainer theme={navTheme} ref={navRef}>
        <AuthNavigator
          initialRoute={authInitial || (phase === "onboarding" ? "Onboarding" : "Login")}
        />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme} ref={navRef}>
      <MainNavigator />
    </NavigationContainer>
  );
}
