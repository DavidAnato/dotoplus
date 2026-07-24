import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, ScrollView, Text, View } from "react-native";
import { Button, Card, Field, Header, PhoneField, SectionLabel } from "../ui";
import {
  BLOOD_OPTIONS,
  C,
  ELECTRO_OPTIONS,
  Profile,
  UNKNOWN_LABEL,
  darkC,
} from "../theme";
import { api } from "../api";
import { BrandBackground, ScreenEnter, StaggerItem, hapticSuccess } from "../motion";
import { StoryArt } from "../components/StoryArt";
import { PhotoIdentityPicker } from "../components/PhotoIdentityPicker";
import { BirthDateField, toIsoDate, parseBirthDate } from "../components/BirthDateField";
import { SelectField } from "../components/SelectField";
import { usePullRefresh } from "../hooks/usePullRefresh";
import { qk } from "../queries/keys";
import { isValidBjPhone, toE164Bj } from "../phone";
import {
  BENIN_COMMUNE_NAMES,
  BENIN_LIEUX_NAISSANCE,
  URGENCE_LIENS,
  departementOf,
  quartiersOf,
} from "../data/benin";
import type { ProfilSection } from "../navigation/types";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

function normalizeBirth(raw: string): string {
  const d = parseBirthDate(raw);
  return d ? toIsoDate(d) : raw.trim();
}

export default function ProfilComplet({
  user,
  dark,
  onDone,
  onUserUpdate,
  initialSection,
}: {
  user: Profile;
  dark?: boolean;
  onDone: () => void;
  onUserUpdate?: (u: Profile) => void;
  initialSection?: ProfilSection;
}) {
  const colors = dark ? darkC : C;
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<ProfilSection, number>>>({});

  const markSection =
    (key: ProfilSection) =>
    (e: LayoutChangeEvent) => {
      sectionY.current[key] = e.nativeEvent.layout.y;
    };

  const scrollToSection = useCallback((section?: ProfilSection) => {
    if (!section) return;
    const y = sectionY.current[section];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }, []);

  useEffect(() => {
    if (!initialSection) return;
    const tries = [150, 350, 700];
    const timers = tries.map((ms) =>
      setTimeout(() => {
        if (sectionY.current[initialSection] != null) {
          scrollToSection(initialSection);
        }
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [initialSection, scrollToSection]);

  const { refreshControl } = usePullRefresh({
    keys: [qk.me],
    refetch: [
      async () => {
        const profile = await api.me();
        if (profile) onUserUpdate?.(profile);
      },
    ],
    progressBackgroundColor: colors.white,
  });

  const [nom, setNom] = useState(user.lastName || "");
  const [prenom, setPrenom] = useState(user.firstName || "");
  const [birth, setBirth] = useState(() => normalizeBirth(user.birthDate || ""));
  const [birthPlace, setBirthPlace] = useState(user.birthPlace || "");
  const [sexe, setSexe] = useState("M");
  const [blood, setBlood] = useState(user.bloodType || "");
  const [electro, setElectro] = useState(user.electrophoresis || "");
  const [electroCustom, setElectroCustom] = useState("");
  const [allergies, setAllergies] = useState((user.allergies || []).join(", "));
  const [fatherName, setFatherName] = useState(user.fatherName || "");
  const [motherName, setMotherName] = useState(user.motherName || "");
  const [commune, setCommune] = useState(user.addressCommune || "");
  const [quartier, setQuartier] = useState(user.addressQuartier || "");
  const [urgenceNom, setUrgenceNom] = useState("");
  const [urgenceLien, setUrgenceLien] = useState("Proche");
  const [urgenceTel, setUrgenceTel] = useState(user.emergencyPhone || user.phone || "");
  const [assureur, setAssureur] = useState(user.insurer || "");
  const [police, setPolice] = useState(user.policyNumber || "");
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || null);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const lastSavedRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const primedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    setBirth(normalizeBirth(user.birthDate || ""));
    setBirthPlace(user.birthPlace || "");
    setFatherName(user.fatherName || "");
    setMotherName(user.motherName || "");
    setCommune(user.addressCommune || "");
    setQuartier(user.addressQuartier || "");
    setPhotoUrl(user.photoUrl || null);
  }, [
    user.birthDate,
    user.birthPlace,
    user.fatherName,
    user.motherName,
    user.addressCommune,
    user.addressQuartier,
    user.photoUrl,
  ]);

  useEffect(() => {
    const m = (user.emergencyName || "").match(/^(.+?)(?:\s*\((.+)\))?$/);
    if (m) {
      setUrgenceNom(m[1].trim());
      if (m[2]) setUrgenceLien(m[2].trim());
    }
  }, [user.emergencyName]);

  useEffect(() => {
    const known = (ELECTRO_OPTIONS as readonly string[]).includes(user.electrophoresis);
    if (user.electrophoresis && !known) {
      setElectro("Autre");
      setElectroCustom(user.electrophoresis);
    }
  }, [user.electrophoresis]);

  const quartierOptions = useMemo(() => {
    const list = quartiersOf(commune);
    if (quartier && !list.includes(quartier)) return [quartier, ...list];
    return list;
  }, [commune, quartier]);

  const buildPayload = useCallback(() => {
    const allergyList = allergies
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const electroValue =
      electro === "Autre"
        ? electroCustom.trim()
        : electro === UNKNOWN_LABEL
          ? ""
          : electro.trim();
    const payload: Record<string, any> = {
      nom: nom.trim() || user.lastName,
      prenom: prenom.trim() || user.firstName,
      date_naissance: birth || null,
      lieu_naissance: birthPlace.trim(),
      sexe,
      nom_pere: fatherName.trim(),
      nom_mere: motherName.trim(),
      adresse_commune: commune.trim(),
      adresse_quartier: quartier.trim(),
      groupe_sanguin: blood === UNKNOWN_LABEL ? "" : blood.trim(),
      electrophorese: electroValue,
      allergies: allergyList,
      contact_urgence_nom: urgenceNom.trim(),
      contact_urgence_lien: urgenceLien.trim(),
      tel_urgence: urgenceTel ? toE164Bj(urgenceTel) : "",
    };
    if (assureur.trim() && police.trim()) {
      payload.assurance = {
        assureur: assureur.trim(),
        num_police: police.trim(),
        type_couverture: "Individuel",
        droits_valides: true,
      };
    }
    return payload;
  }, [
    allergies,
    assureur,
    birth,
    birthPlace,
    blood,
    commune,
    electro,
    electroCustom,
    fatherName,
    motherName,
    nom,
    police,
    prenom,
    quartier,
    sexe,
    urgenceLien,
    urgenceNom,
    urgenceTel,
    user.firstName,
    user.lastName,
  ]);

  // Empreinte initiale : pas de requête au simple ouverture de l'écran
  useEffect(() => {
    if (primedRef.current) return;
    lastSavedRef.current = JSON.stringify(buildPayload());
    primedRef.current = true;
  }, [buildPayload]);

  const persist = useCallback(async () => {
    // Aucun champ médical n'est bloquant — on sauvegarde ce qui est renseigné.
    if (urgenceTel && !isValidBjPhone(urgenceTel)) {
      setError("Téléphone d'urgence invalide.");
      setSaveStatus("error");
      return;
    }
    const payload = buildPayload();
    const fingerprint = JSON.stringify(payload);
    if (fingerprint === lastSavedRef.current) {
      setSaveStatus("saved");
      return;
    }
    setSaveStatus("saving");
    setError("");
    try {
      const profile = await api.updateProfile(payload);
      if (photoUrl) {
        profile.photoUrl = photoUrl;
        profile.photoRequired = false;
      }
      lastSavedRef.current = fingerprint;
      onUserUpdate?.(profile);
      if (mountedRef.current) {
        setSaveStatus("saved");
        hapticSuccess();
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setSaveStatus("error");
        setError(e.message || "Enregistrement impossible.");
      }
    }
  }, [buildPayload, onUserUpdate, photoUrl, urgenceTel]);

  // Auto-save différé (évite 1 requête par frappe)
  useEffect(() => {
    if (!primedRef.current) return;
    setSaveStatus("pending");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist();
    }, 1100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    allergies,
    assureur,
    birth,
    birthPlace,
    blood,
    commune,
    electro,
    electroCustom,
    fatherName,
    motherName,
    nom,
    persist,
    police,
    prenom,
    quartier,
    sexe,
    urgenceLien,
    urgenceNom,
    urgenceTel,
  ]);

  const statusLabel =
    saveStatus === "saving"
      ? "Enregistrement…"
      : saveStatus === "pending"
        ? "Modifications en attente…"
        : saveStatus === "saved"
          ? "Enregistré automatiquement"
          : saveStatus === "error"
            ? "Erreur d'enregistrement"
            : "Les changements sont sauvegardés automatiquement";

  const chipBtn = (label: string, active: boolean, onPress: () => void, color = C.blue) => (
    <Button key={label} title={label} outline={!active} color={color} onPress={onPress} />
  );

  const leave = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void persist().finally(() => onDone());
  };

  return (
    <BrandBackground dark={!!dark}>
      <ScreenEnter>
        <Header title="Mon profil" subtitle={statusLabel} onBack={leave} />
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
        >
          <StaggerItem index={0}>
            <StoryArt
              preset="welcome"
              compact
              dark={!!dark}
              title="Votre dossier santé"
              subtitle="Seuls photo, identité et date de naissance sont requis pour la première carte. Le reste est optionnel."
            />
          </StaggerItem>

          <View onLayout={markSection("identity")}>
            <StaggerItem index={1}>
              <Card colors={colors}>
                <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
                  Sauvegarde automatique. Les champs médicaux (sang, allergies…) peuvent rester vides.
                </Text>
                <PhotoIdentityPicker
                  photoUrl={photoUrl}
                  firstName={prenom}
                  lastName={nom}
                  dark={dark}
                  upload={async (uri, mime, name) => {
                    const p = await api.uploadPhoto(uri, mime, name);
                    setPhotoUrl(p.photoUrl || null);
                    onUserUpdate?.(p);
                    return { photo_url: p.photoUrl || undefined };
                  }}
                  onUploaded={(url) => setPhotoUrl(url)}
                />
                <Field label="Nom" value={nom} onChangeText={setNom} colors={colors} />
                <Field label="Prénom" value={prenom} onChangeText={setPrenom} colors={colors} />
                <BirthDateField value={birth} onChange={setBirth} colors={colors} />
                <SelectField
                  label="Lieu de naissance"
                  value={birthPlace}
                  onChange={setBirthPlace}
                  options={BENIN_LIEUX_NAISSANCE}
                  colors={colors}
                  placeholder="Commune / ville"
                  subtitleFor={(c) => departementOf(c)}
                  icon="location-outline"
                />
                <SectionLabel color={colors.navy}>Sexe</SectionLabel>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                  {(["M", "F"] as const).map((s) =>
                    chipBtn(s === "M" ? "Masculin" : "Féminin", sexe === s, () => setSexe(s), C.blue)
                  )}
                </View>
              </Card>
            </StaggerItem>
          </View>

          <View onLayout={markSection("medical")}>
            <StaggerItem index={2}>
              <SectionLabel color={colors.navy}>Infos médicales (optionnel)</SectionLabel>
              <Card colors={colors}>
                <SectionLabel color={colors.navy}>Groupe sanguin</SectionLabel>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {BLOOD_OPTIONS.map((b) => chipBtn(b, blood === b, () => setBlood(b), C.emergency))}
                  {chipBtn("Effacer", !blood, () => setBlood(""), colors.grey)}
                </View>
                <SectionLabel color={colors.navy}>Électrophorèse Hb</SectionLabel>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {[...ELECTRO_OPTIONS, "Autre"].map((e) =>
                    chipBtn(e, electro === e, () => setElectro(e), C.blue)
                  )}
                  {chipBtn(
                    "Effacer",
                    !electro,
                    () => {
                      setElectro("");
                      setElectroCustom("");
                    },
                    colors.grey
                  )}
                </View>
                {electro === "Autre" ? (
                  <Field
                    label="Préciser le phénotype"
                    value={electroCustom}
                    onChangeText={setElectroCustom}
                    placeholder="Ex. AD, AE…"
                    colors={colors}
                  />
                ) : null}
                <Field
                  label="Allergies (séparées par des virgules)"
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="Ex. Pénicilline, Aspirine…"
                  colors={colors}
                />
              </Card>
            </StaggerItem>
          </View>

          <View onLayout={markSection("filiation")}>
            <StaggerItem index={3}>
              <SectionLabel color={colors.navy}>Filiation (optionnel)</SectionLabel>
              <Card colors={colors}>
                <Field label="Nom du père" value={fatherName} onChangeText={setFatherName} colors={colors} />
                <Field label="Nom de la mère" value={motherName} onChangeText={setMotherName} colors={colors} />
              </Card>
            </StaggerItem>
          </View>

          <View onLayout={markSection("address")}>
            <StaggerItem index={4}>
              <SectionLabel color={colors.navy}>Adresse de résidence (optionnel)</SectionLabel>
              <Card colors={colors}>
                <SelectField
                  label="Commune"
                  value={commune}
                  onChange={(v) => {
                    setCommune(v);
                    setQuartier("");
                  }}
                  options={BENIN_COMMUNE_NAMES}
                  colors={colors}
                  placeholder="Choisir une commune"
                  subtitleFor={(c) => departementOf(c)}
                  icon="home-outline"
                />
                <SelectField
                  label="Quartier"
                  value={quartier}
                  onChange={setQuartier}
                  options={quartierOptions}
                  colors={colors}
                  placeholder={commune ? "Choisir un quartier" : "D’abord choisir la commune"}
                  icon="map-outline"
                />
              </Card>
            </StaggerItem>
          </View>

          <View onLayout={markSection("urgence")}>
            <StaggerItem index={5}>
              <SectionLabel color={colors.navy}>Contact d'urgence (optionnel)</SectionLabel>
              <Card colors={colors}>
                <Field label="Nom" value={urgenceNom} onChangeText={setUrgenceNom} colors={colors} />
                <SelectField
                  label="Lien"
                  value={urgenceLien}
                  onChange={setUrgenceLien}
                  options={[...URGENCE_LIENS]}
                  colors={colors}
                  placeholder="Choisir le lien"
                  allowManual
                  icon="people-outline"
                />
                <PhoneField
                  label="Téléphone d'urgence"
                  value={urgenceTel}
                  onChangeText={setUrgenceTel}
                  colors={colors}
                />
              </Card>
            </StaggerItem>
          </View>

          <View onLayout={markSection("assurance")}>
            <StaggerItem index={6}>
              <SectionLabel color={colors.navy}>Assurance (optionnel)</SectionLabel>
              <Card colors={colors}>
                <Field label="Assureur" value={assureur} onChangeText={setAssureur} colors={colors} />
                <Field label="N° police" value={police} onChangeText={setPolice} colors={colors} />
              </Card>
            </StaggerItem>
          </View>

          {error ? <Text style={{ color: C.emergency, fontWeight: "700" }}>{error}</Text> : null}
        </ScrollView>
      </ScreenEnter>
    </BrandBackground>
  );
}
