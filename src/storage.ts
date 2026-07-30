/**
 * Persistance hors ligne DotoPlus (patient uniquement).
 *
 * - SecureStore : token JWT, préférences bio
 * - AsyncStorage : snapshot urgence / profil / token DotoCard (mode dégradé)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { Profile } from "./theme";

const KEYS = {
  access: "doto_access",
  refresh: "doto_refresh",
  snapshot: "doto_offline_snapshot",
  bioEnabled: "doto_bio_enabled",
  pinSet: "doto_pin_set",
  localPin: "doto_local_pin",
  lastNpi: "doto_last_npi",
  theme: "doto_theme",
};

export interface OfflineSnapshot {
  profile: Profile;
  cardToken: string | null;
  cardId: number | null;
  syncedAt: string;
}

async function secureSet(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureGet(key: string) {
  if (Platform.OS === "web") return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function secureDel(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const storage = {
  async saveTokens(access: string, refresh: string) {
    await secureSet(KEYS.access, access);
    await secureSet(KEYS.refresh, refresh);
  },
  async getAccess() {
    return (await secureGet(KEYS.access)) || null;
  },
  async getRefresh() {
    return (await secureGet(KEYS.refresh)) || null;
  },
  async clearTokens() {
    await secureDel(KEYS.access);
    await secureDel(KEYS.refresh);
  },

  async saveSnapshot(snapshot: OfflineSnapshot) {
    await AsyncStorage.setItem(KEYS.snapshot, JSON.stringify(snapshot));
    await AsyncStorage.setItem(KEYS.lastNpi, snapshot.profile.npi);
  },
  async getSnapshot(): Promise<OfflineSnapshot | null> {
    const raw = await AsyncStorage.getItem(KEYS.snapshot);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  async getLastNpi() {
    return AsyncStorage.getItem(KEYS.lastNpi);
  },

  async setTheme(theme: "light" | "dark") {
    await AsyncStorage.setItem(KEYS.theme, theme);
  },
  async getTheme(): Promise<"light" | "dark"> {
    const t = await AsyncStorage.getItem(KEYS.theme);
    return t === "dark" ? "dark" : "light";
  },

  async setBioEnabled(v: boolean) {
    await secureSet(KEYS.bioEnabled, v ? "1" : "0");
  },
  async isBioEnabled() {
    return (await secureGet(KEYS.bioEnabled)) === "1";
  },

  async setPinConfigured(v: boolean) {
    await secureSet(KEYS.pinSet, v ? "1" : "0");
  },
  async isPinConfigured() {
    return (await secureGet(KEYS.pinSet)) === "1";
  },

  async saveLocalPin(pin: string) {
    if (!/^\d{5}$/.test(pin)) return;
    await secureSet(KEYS.localPin, pin);
  },
  async getLocalPin() {
    return (await secureGet(KEYS.localPin)) || null;
  },
  async matchLocalPin(pin: string) {
    const stored = await this.getLocalPin();
    return !!stored && stored === pin;
  },
  async clearLocalPin() {
    await secureDel(KEYS.localPin);
  },

  async cacheNotifications(list: any[]) {
    await AsyncStorage.setItem("doto_notif_cache", JSON.stringify(list));
  },
  async getNotifications(): Promise<any[]> {
    const raw = await AsyncStorage.getItem("doto_notif_cache");
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async clearSession() {
    await this.clearTokens();
    await this.clearLocalPin();
    await secureDel(KEYS.bioEnabled);
    await secureDel(KEYS.pinSet);
    await AsyncStorage.multiRemove([KEYS.snapshot, KEYS.lastNpi, "doto_notif_cache"]);
  },
};
