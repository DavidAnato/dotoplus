import * as FileSystem from "expo-file-system/legacy";
import { DEMO_USER, Profile, normalizeProfile } from "./theme";
import { OfflineSnapshot, storage } from "./storage";

// Local : EXPO_PUBLIC_API_URL. Preview/prod EAS : tunnel local (localtunnel).
const DEFAULT_HOST = "127.0.0.1";
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.EAS_BUILD === "true"
    ? "https://itchy-owl-100.loca.lt"
    : `http://${DEFAULT_HOST}:8001`);

/** URI locale utilisable par uploadAsync (file://). */
async function ensureLocalFileUri(uri: string, filename: string): Promise<string> {
  if (uri.startsWith("file://")) return uri;
  const dest = `${FileSystem.cacheDirectory ?? ""}upload_${Date.now()}_${filename.replace(/[^\w.-]/g, "_")}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

function mapPatient(p: any): Profile {
  const dossier = p.dossier || {};
  const assurance = p.assurance || null;
  return normalizeProfile({
    firstName: p.prenom,
    lastName: p.nom,
    phone: p.telephone || "",
    npi: p.npi,
    birthDate: p.date_naissance || "",
    birthPlace: p.lieu_naissance || "",
    bloodType: p.groupe_sanguin || "",
    electrophoresis: p.electrophorese || "",
    allergies: dossier.allergies || [],
    chronic: (dossier.maladies_chroniques || []).map((c: any) =>
      typeof c === "string" ? { nom: c } : { nom: c?.nom || "", depuis: c?.depuis || "" }
    ).filter((c: { nom: string }) => c.nom),
    antecedents: dossier.antecedents || "",
    emergencyName: p.contact_urgence_nom
      ? `${p.contact_urgence_nom}${p.contact_urgence_lien ? ` (${p.contact_urgence_lien})` : ""}`
      : "",
    emergencyPhone: p.tel_urgence || "",
    fatherName: p.nom_pere || "",
    motherName: p.nom_mere || "",
    addressCommune: p.adresse_commune || "",
    addressQuartier: p.adresse_quartier || "",
    hasInsurance: !!(assurance?.assureur && assurance.droits_valides !== false),
    insurer: assurance?.assureur || "",
    policyNumber: assurance?.num_police || "",
    hasPin: !!p.has_pin,
    requireUnlock: !!p.require_unlock,
    urgenceWhenLocked: p.urgence_when_locked !== false,
    photoUrl: p.photo_url || null,
    photoRequired: p.photo_required !== false && !p.photo_url,
    profileComplete: !!p.profile_complete,
  });
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await storage.getAccess();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

const SESSION_EXPIRED_MSG = "Session expirée, reconnectez-vous";

type SessionExpiredHandler = (message: string) => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;
let sessionExpiredLock = false;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  sessionExpiredHandler = handler;
}

async function notifySessionExpired() {
  if (sessionExpiredLock) return;
  sessionExpiredLock = true;
  try {
    await storage.clearSession();
    sessionExpiredHandler?.(SESSION_EXPIRED_MSG);
  } finally {
    setTimeout(() => {
      sessionExpiredLock = false;
    }, 800);
  }
}

async function tryRefresh(): Promise<boolean> {
  const refresh = await storage.getRefresh();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    await storage.saveTokens(data.access, data.refresh || refresh);
    return true;
  } catch {
    return false;
  }
}

async function request(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const method = String(options.method || "GET").toUpperCase();
  const navOffline =
    typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean" &&
    !navigator.onLine;
  if (
    navOffline &&
    (method === "POST" || method === "PATCH" || method === "PUT") &&
    path.startsWith("/api/") &&
    !path.includes("/auth/")
  ) {
    const { enqueueOffline } = await import("./offlineQueue");
    let body: unknown;
    try {
      body = options.body ? JSON.parse(String(options.body)) : undefined;
    } catch {
      body = undefined;
    }
    await enqueueOffline({ method: method as "POST" | "PATCH" | "PUT", path, body });
    return new Response(JSON.stringify({ queued: true, offline: true }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  }
  const headers = {
    ...(await authHeaders()),
    ...(options.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401 && retry) {
    const hadAuth = !!(await storage.getAccess()) || !!(await storage.getRefresh());
    if (await tryRefresh()) return request(path, options, false);
    if (hadAuth) await notifySessionExpired();
  }
  return res;
}

async function persistPatient(profile: Profile) {
  let cardToken: string | null = null;
  let cardId: number | null = null;
  try {
    const card = await api.myCard();
    cardToken = card.token_chiffre;
    cardId = card.id;
  } catch {
    /* hors ligne / pas de carte */
  }
  const snap: OfflineSnapshot = {
    profile,
    cardToken,
    cardId,
    syncedAt: new Date().toISOString(),
  };
  await storage.saveSnapshot(snap);
  return snap;
}

export const api = {
  url: API_URL,

  async login(phone: string, otp: string): Promise<Profile> {
    const res = await fetch(`${API_URL}/api/auth/patient/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Identifiants invalides.");
    }
    const data = await res.json();
    await storage.saveTokens(data.access, data.refresh);
    const patientRaw = data.patient
      ? {
          ...data.patient,
          photo_url: data.patient.photo_url || data.user?.photo_url,
          photo_required: data.patient.photo_required ?? data.user?.photo_required,
        }
      : null;
    const profile = patientRaw ? mapPatient(patientRaw) : DEMO_USER;
    await storage.setPinConfigured(!!profile.hasPin);
    await persistPatient(profile);
    return profile;
  },

  async requestOtp(
    phone: string,
    purpose: "login" | "register" | "password_change" | "password_reset" = "login"
  ) {
    const res = await fetch(`${API_URL}/api/auth/otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, purpose }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Envoi OTP impossible.");
    }
    return res.json();
  },

  async register(payload: {
    phone: string;
    otp: string;
    first_name?: string;
    last_name?: string;
    npi?: string;
    birth_date?: string;
    birth_place?: string;
    father_name?: string;
    mother_name?: string;
    address_commune?: string;
    address_quartier?: string;
  }): Promise<Profile> {
    const res = await fetch(`${API_URL}/api/auth/patient/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Inscription impossible.");
    }
    const data = await res.json();
    await storage.saveTokens(data.access, data.refresh);
    const profile = data.patient ? mapPatient(data.patient) : DEMO_USER;
    await persistPatient(profile);
    return profile;
  },

  /** OCR CIP / carte CEDEAO (inscription, sans auth). */
  async ocrIdCard(uri: string, mime = "image/jpeg", filename = "carte-id.jpg") {
    const safeName = filename.includes(".") ? filename : `${filename}.jpg`;
    const fileUri = await ensureLocalFileUri(uri, safeName);
    let result: FileSystem.FileSystemUploadResult;
    try {
      result = await FileSystem.uploadAsync(`${API_URL}/api/auth/patient/ocr-id/`, fileUri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "image",
        mimeType: mime || "image/jpeg",
        // iOS : évite un kill trop tôt pendant l'OCR serveur
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
      });
    } catch (e: any) {
      const raw = String(e?.message || e || "");
      if (/timed?\s*out|timeout|abort/i.test(raw)) {
        throw new Error(
          "Le serveur met trop de temps à lire la carte. Vérifiez que le backend tourne, puis réessayez avec une photo bien cadrée."
        );
      }
      throw new Error(raw || "Lecture de la carte impossible.");
    }
    let data: any = {};
    try {
      data = JSON.parse(result.body || "{}");
    } catch {
      data = {};
    }
    if (result.status < 200 || result.status >= 300) {
      const detail =
        typeof data.detail === "string" ? data.detail : "Lecture de la carte impossible.";
      if (/timed?\s*out|timeout/i.test(detail)) {
        throw new Error(
          "Délai dépassé pendant la lecture OCR. Réessayez - la première lecture peut être plus longue."
        );
      }
      throw new Error(detail);
    }
    if (!data?.npi) {
      throw new Error("NPI introuvable sur cette image.");
    }
    return data as {
      ok: boolean;
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
  },

  async changePassword(phone: string, otp: string, newPassword: string) {
    const res = await fetch(`${API_URL}/api/auth/patient/password-change/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp, new_password: newPassword }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Changement de mot de passe impossible.");
    }
    return res.json();
  },

  async loginPin(npi: string, pin: string): Promise<Profile> {
    const res = await fetch(`${API_URL}/api/auth/patient/pin/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ npi, pin }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "PIN invalide.");
    }
    const data = await res.json();
    await storage.saveTokens(data.access, data.refresh);
    const profile = data.patient ? mapPatient(data.patient) : DEMO_USER;
    await storage.setPinConfigured(true);
    await storage.saveLocalPin(pin);
    await persistPatient(profile);
    return profile;
  },

  async setPin(pin: string, oldPin?: string) {
    const res = await request("/api/auth/patient/set-pin/", {
      method: "POST",
      body: JSON.stringify({ pin, old_pin: oldPin || "" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Impossible d'enregistrer le PIN.");
    }
    await storage.setPinConfigured(true);
    await storage.saveLocalPin(pin);
    return res.json();
  },

  async verifyPin(pin: string) {
    // Accès rapide : vérif locale d'abord
    if (await storage.matchLocalPin(pin)) {
      void request("/api/auth/verify-pin/", {
        method: "POST",
        body: JSON.stringify({ pin }),
      }).catch(() => {});
      return { detail: "ok", local: true };
    }
    const res = await request("/api/auth/verify-pin/", {
      method: "POST",
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "PIN incorrect.");
    }
    await storage.saveLocalPin(pin);
    return res.json();
  },

  async updateSecurity(flags: { require_unlock?: boolean; urgence_when_locked?: boolean }) {
    const res = await request("/api/auth/me/", {
      method: "PATCH",
      body: JSON.stringify(flags),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Impossible de mettre à jour.");
    }
    const data = await res.json();
    if (data.patient) {
      const profile = mapPatient(data.patient);
      await persistPatient(profile);
      return profile;
    }
    return null;
  },
  async me(): Promise<Profile | null> {
    const token = await storage.getAccess();
    if (!token) return null;
    const res = await request("/api/patients/me/");
    if (res.status === 401) return null;
    if (!res.ok) {
      const snap = await storage.getSnapshot();
      return snap?.profile || null;
    }
    const profile = mapPatient(await res.json());
    await persistPatient(profile);
    return profile;
  },

  async myCard(): Promise<{
    id: number;
    token_chiffre: string;
    date_expiration: string;
    statut?: string;
    statut_label?: string;
    is_active?: boolean;
    groupe_sanguin?: string;
    patient_nom?: string;
    lost_at?: string | null;
    motif?: string;
    date_creation?: string;
  }> {
    const res = await request("/api/dodocards/mine/");
    if (!res.ok) throw new Error("DotoCard introuvable.");
    return res.json();
  },

  async downloadMyCardPdf(): Promise<string> {
    const FileSystem = await import("expo-file-system/legacy");
    const token = await storage.getAccess();
    if (!token) throw new Error("Session requise.");
    const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!dir) throw new Error("Stockage local indisponible.");
    const path = `${dir}DotoCard_${Date.now()}.pdf`;
    const result = await FileSystem.downloadAsync(`${API_URL}/api/dodocards/mine/pdf/`, path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (result.status !== 200) {
      throw new Error("Téléchargement PDF impossible.");
    }
    return result.uri;
  },

  async reportCardLoss(motif = "perte") {
    const res = await request("/api/dodocards/mine/report-loss/", {
      method: "POST",
      body: JSON.stringify({ motif }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Signalement impossible.");
    }
    return res.json();
  },

  async reissueMyCard(motif = "demande_remplacement") {
    const res = await request("/api/dodocards/mine/reissue/", {
      method: "POST",
      body: JSON.stringify({ motif }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Réémission impossible.");
    }
    return res.json();
  },

  async notifications(): Promise<AppNotification[]> {
    try {
      const res = await request("/api/notifications/");
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.results || [];
      await storage.cacheNotifications(list);
      return list;
    } catch {
      return (await storage.getNotifications()) as AppNotification[];
    }
  },

  async unreadCount(): Promise<number> {
    const res = await request("/api/notifications/unread_count/");
    if (!res.ok) return 0;
    const data = await res.json();
    return data.unread || 0;
  },

  async markNotificationRead(id: number) {
    const res = await request(`/api/notifications/${id}/read/`, { method: "POST" });
    if (!res.ok) throw new Error("Impossible de marquer comme lu.");
    return res.json();
  },

  async markAllNotificationsRead() {
    const res = await request("/api/notifications/read_all/", { method: "POST" });
    if (!res.ok) throw new Error("Impossible de tout marquer.");
    return res.json();
  },

  async accessRequests(pending = false, active = false): Promise<AccessRequestItem[]> {
    const q = pending ? "?pending=1" : active ? "?active=1" : "";
    const res = await request(`/api/access-requests/${q}`);
    if (!res.ok) throw new Error("Demandes d'accès indisponibles.");
    return res.json();
  },

  async approveAccess(id: number) {
    const res = await request(`/api/access-requests/${id}/approve/`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Approbation impossible.");
    }
    return res.json();
  },

  async denyAccess(id: number) {
    const res = await request(`/api/access-requests/${id}/deny/`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Refus impossible.");
    }
    return res.json();
  },

  async revokeAccess(id: number) {
    const res = await request(`/api/access-requests/${id}/revoke/`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Révocation impossible.");
    }
    return res.json();
  },

  async updateProfile(payload: Record<string, any>): Promise<Profile> {
    const res = await request("/api/patients/me/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Mise à jour impossible.");
    }
    const profile = mapPatient(await res.json());
    await persistPatient(profile);
    return profile;
  },

  async uploadPhoto(uri: string, mime = "image/jpeg", filename = "identite.jpg"): Promise<Profile> {
    const token = await storage.getAccess();
    if (!token) throw new Error("Session requise.");

    // RN 0.86 / FormData+fetch → "Unsupported FormDataPart implementation".
    // Upload natif multipart via expo-file-system.
    const safeName = filename.includes(".") ? filename : `${filename}.jpg`;
    const fileUri = await ensureLocalFileUri(uri, safeName);
    const result = await FileSystem.uploadAsync(`${API_URL}/api/auth/me/photo/`, fileUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "photo",
      mimeType: mime || "image/jpeg",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (result.status < 200 || result.status >= 300) {
      let detail = "Upload photo impossible.";
      try {
        const data = JSON.parse(result.body || "{}");
        if (typeof data.detail === "string") detail = data.detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }

    let user: any = {};
    try {
      user = JSON.parse(result.body || "{}");
    } catch {
      user = {};
    }

    // Rafraîchir le dossier patient (photo sync)
    const profile =
      (await this.me()) ||
      mapPatient({
        prenom: user.first_name,
        nom: user.last_name,
        telephone: user.telephone,
        photo_url: user.photo_url,
        photo_required: user.photo_required,
        has_pin: false,
        dossier: {},
      });
    if (user.photo_url) {
      profile.photoUrl = user.photo_url;
      profile.photoRequired = false;
    }
    await persistPatient(profile);
    return profile;
  },

  async historique(): Promise<{
    consultations: any[];
    ordonnances: any[];
    examens: any[];
    bons_examen: any[];
  }> {
    const res = await request("/api/patients/me/historique/");
    if (!res.ok) throw new Error("Historique indisponible.");
    return res.json();
  },

  async kycMe() {
    const res = await request("/api/auth/kyc/me/");
    if (!res.ok) throw new Error("KYC indisponible.");
    return res.json();
  },

  async patchKyc(payload: Record<string, unknown>) {
    const res = await request("/api/auth/kyc/me/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Enregistrement KYC impossible.");
    }
    return res.json();
  },

  async submitKyc() {
    const res = await request("/api/auth/kyc/me/submit/", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Envoi KYC impossible.");
    }
    return res.json();
  },

  async uploadKyc(kind: "recto" | "verso" | "selfie", uri: string, mime = "image/jpeg", filename = "kyc.jpg") {
    const token = await storage.getAccess();
    const safeName = filename.includes(".") ? filename : `${filename}.jpg`;
    const fileUri = await ensureLocalFileUri(uri, safeName);
    const result = await FileSystem.uploadAsync(`${API_URL}/api/auth/kyc/me/upload/${kind}/`, fileUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file",
      mimeType: mime || "image/jpeg",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    let data: any = {};
    try {
      data = JSON.parse(result.body || "{}");
    } catch {
      data = {};
    }
    if (result.status < 200 || result.status >= 300) {
      throw new Error(data.detail || "Upload KYC impossible.");
    }
    return data;
  },

  async myAssurance(): Promise<any | null> {
    const res = await request("/api/patients/me/assurance/");
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Assurance indisponible.");
    return res.json();
  },

  async updateAssurance(payload: Record<string, any>) {
    const res = await request("/api/patients/me/assurance/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Mise à jour assurance impossible.");
    }
    return res.json();
  },

  async deleteMyAssurance() {
    const res = await request("/api/patients/me/assurance/", { method: "DELETE" });
    if (res.status === 404) return null;
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Retrait assurance impossible.");
    }
    return null;
  },

  async appointments(): Promise<any[]> {
    const res = await request("/api/appointments/");
    if (!res.ok) throw new Error("Rendez-vous indisponibles.");
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  },

  async createAppointment(payload: {
    debut: string;
    fin?: string;
    motif?: string;
    structure?: number;
    professionnel?: number;
    notes?: string;
  }) {
    const res = await request("/api/appointments/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Réservation impossible.");
    }
    return res.json();
  },

  async cancelAppointment(id: number) {
    const res = await request(`/api/appointments/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ statut: "annule" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Annulation impossible.");
    }
    return res.json();
  },

  async accessBlocks(active = true): Promise<AccessBlockItem[]> {
    const q = active ? "?active=1" : "";
    const res = await request(`/api/access-blocks/${q}`);
    if (!res.ok) throw new Error("Blocages indisponibles.");
    return res.json();
  },

  async createAccessBlock(payload: {
    blocked_user_id?: number;
    blocked_structure_id?: number;
    reason?: string;
  }) {
    const res = await request("/api/access-blocks/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Blocage impossible.");
    }
    return res.json();
  },

  async liftAccessBlock(id: number) {
    const res = await request(`/api/access-blocks/${id}/lift/`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Levée du blocage impossible.");
    }
    return res.json();
  },

  async structures(): Promise<any[]> {
    const res = await request("/api/auth/structures/");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  },

  async registerDeviceToken(token: string, platform: string, app = "dotoplus") {
    const res = await request("/api/device-tokens/", {
      method: "POST",
      body: JSON.stringify({ token, platform, app }),
    });
    if (!res.ok) return null;
    return res.json();
  },

  async disableDeviceToken(token?: string) {
    const res = await request("/api/device-tokens/disable/", {
      method: "POST",
      body: JSON.stringify({ token: token || "" }),
    });
    if (!res.ok) return null;
    return res.json();
  },

  patientEventsUrl(access: string) {
    return `${API_URL}/api/patient/events/?access=${encodeURIComponent(access)}`;
  },

  async examens(): Promise<any[]> {
    try {
      const hist = await this.historique();
      return hist.examens || [];
    } catch {
      return [];
    }
  },

  async logout() {
    try {
      await request("/api/auth/logout/", { method: "POST" });
    } catch {
      /* ignore */
    }
    await storage.clearSession();
  },
};

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  type: string;
  payload: Record<string, any>;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
};

export type AccessRequestItem = {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_npi: string;
  patient_photo_url?: string | null;
  requester_id: number;
  requester_name: string;
  requester_role: string;
  requester_role_label: string;
  requester_photo_url?: string | null;
  structure: string;
  status: string;
  mode: string;
  reason: string;
  expires_at: string | null;
  grant_expires_at?: string | null;
  has_active_grant: boolean;
};

export type AccessBlockItem = {
  id: number;
  patient: number;
  blocked_user: number | null;
  blocked_user_name: string;
  blocked_user_role: string;
  blocked_structure: number | null;
  blocked_structure_nom: string;
  reason: string;
  active: boolean;
  created_at: string;
  lifted_at: string | null;
};
