import { Profile } from "./theme";

export type ProfileCheckKey = "photo" | "identity" | "birthDate";

export type ProfileCheck = {
  key: ProfileCheckKey;
  label: string;
  hint: string;
  done: boolean;
  icon: "camera-outline" | "person-outline" | "calendar-outline";
};

/** Minimum pour émettre la première DotoCard (groupe sanguin, etc. = optionnels). */
export function getFirstCardChecks(user: Profile): ProfileCheck[] {
  const hasPhoto = !!user.photoUrl && user.photoRequired !== true;
  const hasIdentity = !!(user.firstName?.trim() && user.lastName?.trim());
  const hasBirth = !!user.birthDate?.trim();
  return [
    {
      key: "photo",
      label: "Photo d'identité",
      hint: "Visage centré, type pièce d'identité",
      done: hasPhoto,
      icon: "camera-outline",
    },
    {
      key: "identity",
      label: "Nom et prénom",
      hint: "Identité officielle sur la carte",
      done: hasIdentity,
      icon: "person-outline",
    },
    {
      key: "birthDate",
      label: "Date de naissance",
      hint: "Obligatoire pour valider la carte",
      done: hasBirth,
      icon: "calendar-outline",
    },
  ];
}

export function isReadyForFirstCard(user: Profile): boolean {
  return getFirstCardChecks(user).every((c) => c.done);
}

export function firstCardMissingLabels(user: Profile): string[] {
  return getFirstCardChecks(user)
    .filter((c) => !c.done)
    .map((c) => c.label);
}
