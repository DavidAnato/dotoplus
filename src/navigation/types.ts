export type ProfilSection =
  | "identity"
  | "medical"
  | "filiation"
  | "address"
  | "urgence"
  | "assurance"
  | "photo";

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Dossier: undefined;
  Carte: undefined;
  Notifications: undefined;
  Parametres: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Urgence: undefined;
  RendezVous: undefined;
  ProfilComplet: { section?: ProfilSection } | undefined;
  Kyc: undefined;
};
