/**
 * Fin de session client : stockage + React Query + Zustand.
 * À appeler après logout ou expiration JWT pour éviter le mélange entre comptes.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
import { queryClient } from "./queries/queryClient";
import { useAppStore } from "./store/appStore";

const RQ_PERSIST_KEY = "dotoplus-react-query";

/** Vide caches mémoire / disque (hors thème). Le stockage auth doit déjà être clear ou le sera via logout. */
export async function wipeClientCaches() {
  queryClient.clear();
  try {
    await AsyncStorage.removeItem(RQ_PERSIST_KEY);
  } catch {
    /* ignore */
  }
  useAppStore.getState().resetSessionState();
}

/** Déconnexion volontaire : push + API + clear complet. */
export async function logoutFully() {
  try {
    await api.disableDeviceToken();
  } catch {
    /* ignore */
  }
  await api.logout();
  await wipeClientCaches();
}
