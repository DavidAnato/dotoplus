/** Deep-link notifications Doto+ - aligné sur `core/contracts.py`. */

export type NotifLike = {
  type?: string;
  notif_type?: string;
  payload?: Record<string, unknown> | null;
};

const KIND_TO_TYPE: Record<string, string> = {
  consultation: "dossier_updated",
  consultation_annulee: "dossier_updated",
  ordonnance: "ordonnance",
  ordonnance_dispensee: "ordonnance",
  ordonnance_payee: "ordonnance",
  kyc_updated: "kyc",
  affiliation_updated: "notifications",
  examen: "examen",
  examen_fichier: "examen",
  bon_examen: "bon_examen",
  bon_resultat: "examen",
  rdv_created: "appointment",
  rdv_pending: "appointment",
  rdv_confirmed: "appointment",
  rdv_updated: "appointment",
  rdv_annule: "appointment",
  insurance_updated: "dossier_updated",
  insurance_removed: "dossier_updated",
  access_request: "access_request",
};

export type PatientNavTarget =
  | { screen: "RendezVous" }
  | { screen: "Urgence" }
  | { screen: "Kyc" }
  | { screen: "MainTabs"; params: { screen: "Dossier" | "Notifications" | "Home" } };

export function notificationTarget(n: NotifLike): PatientNavTarget {
  const payload = (n.payload || n) as Record<string, unknown>;
  const kind = String(payload.kind || "");
  const type = KIND_TO_TYPE[kind] || n.type || n.notif_type || String(payload.type || "system");

  if (type === "access_request") {
    return { screen: "MainTabs", params: { screen: "Notifications" } };
  }
  if (type === "kyc") return { screen: "Kyc" };
  if (type === "appointment") return { screen: "RendezVous" };
  if (type === "ordonnance" || type === "examen" || type === "bon_examen" || type === "dossier_updated") {
    return { screen: "MainTabs", params: { screen: "Dossier" } };
  }
  if (type === "emergency") return { screen: "Urgence" };
  return { screen: "MainTabs", params: { screen: "Notifications" } };
}
