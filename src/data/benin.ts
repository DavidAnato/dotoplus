import communesData from "../data/benin-communes.json";
import lieuxData from "../data/benin-lieux-naissance.json";

export type BeninCommune = {
  commune: string;
  departement: string;
  quartiers: string[];
};

const communes = (communesData as { communes: BeninCommune[] }).communes;

export const BENIN_LIEUX_NAISSANCE: string[] = (lieuxData as { lieux: string[] }).lieux;

export const BENIN_COMMUNES: BeninCommune[] = communes;

export const BENIN_COMMUNE_NAMES: string[] = communes
  .map((c) => c.commune)
  .sort((a, b) => a.localeCompare(b, "fr"));

export function departementOf(commune: string): string | undefined {
  return communes.find((c) => c.commune === commune)?.departement;
}

export function quartiersOf(commune: string): string[] {
  return communes.find((c) => c.commune === commune)?.quartiers ?? [];
}

export const URGENCE_LIENS = [
  "Époux / Épouse",
  "Père",
  "Mère",
  "Fils / Fille",
  "Frère / Sœur",
  "Oncle / Tante",
  "Cousin / Cousine",
  "Ami(e)",
  "Voisin(e)",
  "Tuteur / Tutrice",
  "Autre proche",
] as const;
