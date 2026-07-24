/** Indicatif Bénin — préfixe verrouillé côté UI. */
export const BJ_DIAL = "+229";
export const BJ_CC_DIGITS = "229";
/** Préfixe national actuel (tous les numéros BJ commencent par 01). */
export const BJ_MOBILE_PREFIX = "01";

/** Digits only. */
export function digitsOnly(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

/**
 * Extrait le numéro national (sans 229).
 * Accepte +229…, 229…, 01…, 97…
 */
export function nationalDigits(raw: string): string {
  let d = digitsOnly(raw);
  if (d.startsWith(BJ_CC_DIGITS)) d = d.slice(BJ_CC_DIGITS.length);
  return d.slice(0, 10);
}

/**
 * Ajoute le préfixe 01 si absent (après saisie / API).
 * Ex. « 97586174 » → « 0197586174 ». Vide → vide.
 */
export function ensureBj01(raw: string): string {
  let d = nationalDigits(raw);
  if (!d) return "";
  if (d.startsWith(BJ_MOBILE_PREFIX)) return d.slice(0, 10);
  d = d.replace(/^0+/, "");
  if (!d.startsWith(BJ_MOBILE_PREFIX)) d = BJ_MOBILE_PREFIX + d;
  return d.slice(0, 10);
}

/**
 * Pendant la frappe : préfixe 01 dès que l’utilisateur n’est pas en train
 * de saisir « 01… » (ex. premier chiffre 2–9 → 01 collé tout de suite).
 * Seul « 0 » est laissé en attente (peut devenir 01).
 */
export function normalizeBjWhileTyping(raw: string): string {
  let d = nationalDigits(raw);
  if (!d) return "";
  if (d.startsWith(BJ_MOBILE_PREFIX)) return d.slice(0, 10);
  // « 0 » seul : attendre le chiffre suivant
  if (d === "0") return d;
  // « 0X… » sans 01 → corriger
  if (d.startsWith("0")) {
    d = d.replace(/^0+/, "");
    if (!d) return "0";
  }
  // Commence par 1–9 (ou suite après strip) → 01 immédiat
  if (!d.startsWith(BJ_MOBILE_PREFIX)) d = BJ_MOBILE_PREFIX + d;
  return d.slice(0, 10);
}

/** Formate le national pour affichage : 01 92 34 57 89 */
export function formatNational(raw: string): string {
  const d = nationalDigits(raw);
  if (!d) return "";
  if (d.length <= 2) return d;
  const parts: string[] = [];
  let i = 0;
  while (i < d.length) {
    parts.push(d.slice(i, i + 2));
    i += 2;
  }
  return parts.join(" ");
}

/** Pendant la saisie : +229 + normalisation 01 en direct. */
export function toE164BjRaw(raw: string): string {
  const nat = normalizeBjWhileTyping(raw);
  if (!nat) return "";
  return `${BJ_DIAL} ${formatNational(nat)}`.trim();
}

/** Pour API : +229 avec 01 garanti. */
export function toE164Bj(raw: string): string {
  const nat = ensureBj01(raw);
  if (!nat) return "";
  return `${BJ_DIAL} ${formatNational(nat)}`.trim();
}

/** Affichage carte / profil : toujours avec +229. */
export function displayPhoneBj(raw: string, fallback = "—"): string {
  const nat = ensureBj01(raw) || nationalDigits(raw);
  if (!nat) return fallback;
  return `${BJ_DIAL} ${formatNational(nat)}`;
}

/** Valide un numéro BJ (10 chiffres avec 01, éventuellement ajouté). */
export function isValidBjPhone(raw: string): boolean {
  const n = ensureBj01(raw);
  return n.length === 10 && n.startsWith(BJ_MOBILE_PREFIX);
}
