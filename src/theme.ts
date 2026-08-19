// DotoPlus - tokens de design (marque DOTO+).
export const C = {
  navy: "#1E3755",
  blue: "#3E8295",
  green: "#085041",
  emerald: "#3E8295",
  accent: "#2BB3BC",
  lightGreen: "#E1F5EE",
  lightBlue: "#E8F2F5",
  red: "#791F1F",
  redSoft: "#FEE2E2",
  amber: "#633806",
  amberSoft: "#FEF3C7",
  emergency: "#A32D2D",
  bg: "#F3F4F6",
  white: "#FFFFFF",
  border: "#E5E7EB",
  text: "#1F2937",
  muted: "#6B7280",
  grey: "#9CA3AF",
};

/** Variante sombre - fond noir mat, surfaces élevées, teal en accent uniquement */
export const darkC = {
  ...C,
  bg: "#0A0A0A",
  white: "#161616",
  border: "#2A2A2A",
  text: "#F5F5F5",
  muted: "#A3A3A3",
  grey: "#737373",
  lightBlue: "#1C1C1C",
  lightGreen: "#1A2220",
  amber: "#FCD34D",
  amberSoft: "#422006",
  red: "#FCA5A5",
  redSoft: "#450A0A",
  green: "#6EE7B7",
  emergency: "#F87171",
  /** Titres / accents texte (pas fond page) */
  navy: "#F5F5F5",
};

/** Navy marque (headers / boutons) - ne change jamais en dark mode */
export const brandNavy = "#1E3755";
export const brandBlue = "#2BB3BC";
export const accent = "#2BB3BC";
export const onBrand = "#FFFFFF";

/** Valeur partagée quand le statut médical n'est pas connu */
export const UNKNOWN_LABEL = "Non identifié";

export const BLOOD_OPTIONS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  UNKNOWN_LABEL,
] as const;

/** Phénotypes Hb courants + Non identifié (texte libre aussi accepté côté API) */
export const ELECTRO_OPTIONS = [
  "AA",
  "AS",
  "SS",
  "AC",
  "SC",
  "CC",
  UNKNOWN_LABEL,
] as const;

export function displayMedicalValue(value?: string | null): string {
  const v = (value || "").trim();
  return v || UNKNOWN_LABEL;
}

export function displayAllergies(list?: string[] | null): string[] {
  if (!list || list.length === 0) return [UNKNOWN_LABEL];
  return list;
}

export function allergiesLabel(list?: string[] | null): string {
  return displayAllergies(list).join(" · ");
}

export interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  npi: string;
  birthDate: string;
  birthPlace: string;
  bloodType: string;
  electrophoresis: string;
  allergies: string[];
  chronic: { nom: string; depuis?: string }[];
  antecedents: string;
  emergencyName: string;
  emergencyPhone: string;
  fatherName: string;
  motherName: string;
  addressCommune: string;
  addressQuartier: string;
  hasInsurance: boolean;
  insurer: string;
  policyNumber: string;
  hasPin?: boolean;
  requireUnlock?: boolean;
  urgenceWhenLocked?: boolean;
  photoUrl?: string | null;
  photoRequired?: boolean;
  profileComplete?: boolean;
}

export function normalizeProfile(p: Partial<Profile> & Pick<Profile, "firstName" | "lastName" | "npi">): Profile {
  return {
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    phone: p.phone || "",
    npi: p.npi || "",
    birthDate: p.birthDate || "",
    birthPlace: p.birthPlace || "",
    bloodType: p.bloodType || "",
    electrophoresis: p.electrophoresis || "",
    allergies: p.allergies || [],
    chronic: p.chronic || [],
    antecedents: p.antecedents || "",
    emergencyName: p.emergencyName || "",
    emergencyPhone: p.emergencyPhone || "",
    fatherName: p.fatherName || "",
    motherName: p.motherName || "",
    addressCommune: p.addressCommune || "",
    addressQuartier: p.addressQuartier || "",
    hasInsurance: !!p.hasInsurance,
    insurer: p.insurer || "",
    policyNumber: p.policyNumber || "",
    hasPin: p.hasPin,
    requireUnlock: p.requireUnlock,
    urgenceWhenLocked: p.urgenceWhenLocked,
    photoUrl: p.photoUrl,
    photoRequired: p.photoRequired,
    profileComplete: p.profileComplete,
  };
}

// Profil de démonstration (mode hors ligne / fallback) - cohérent avec le seed backend.
export const DEMO_USER: Profile = {
  firstName: "Kofi Emmanuel",
  lastName: "ADJOVI",
  phone: "+229 01 97 45 12 88",
  npi: "1200478821",
  birthDate: "12/12/1999",
  birthPlace: "Cotonou",
  bloodType: "A+",
  electrophoresis: "AS",
  allergies: ["Pénicilline", "Aspirine"],
  chronic: [
    { nom: "Hypertension", depuis: "2019" },
    { nom: "Diabète T2", depuis: "2021" },
  ],
  antecedents: "Appendicectomie 2025.",
  emergencyName: "Marie Adjovi (Épouse)",
  emergencyPhone: "+229 97 45 12 88",
  fatherName: "ADJOVI Jean",
  motherName: "HOUNSOU Affissatou",
  addressCommune: "Cotonou",
  addressQuartier: "Akpakpa",
  hasInsurance: true,
  insurer: "NSIA Bénin",
  policyNumber: "NSIA-2024-BJ-0048872",
  hasPin: true,
  requireUnlock: false,
  urgenceWhenLocked: true,
};
