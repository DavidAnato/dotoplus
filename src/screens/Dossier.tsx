import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Card, Header, Pill, SectionLabel } from "../ui";
import { C, Profile, darkC } from "../theme";
import {
  BrandBackground,
  EmptyState,
  IconBadge,
  PressScale,
  ScreenEnter,
  StaggerItem,
} from "../motion";
import { CriticalMedicalCard } from "../components/CriticalMedical";
import { StoryArt } from "../components/StoryArt";
import { usePullRefresh } from "../hooks/usePullRefresh";
import { qk } from "../queries/keys";
import { useHistorique, useMyAssurance } from "../queries/hooks";
import { useAppStore, type DossierSub } from "../store/appStore";

type Sub = DossierSub;

const SUBS: { key: Sub; label: string }[] = [
  { key: "dossier", label: "Dossier" },
  { key: "ordonnances", label: "Ordonnances" },
  { key: "examens", label: "Examens" },
  { key: "assurance", label: "Assurance" },
];

function TabBadge({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null;
  return (
    <View
      style={{
        marginLeft: 6,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? C.emergency : "#fff",
      }}
    >
      <Text
        style={{
          color: active ? "#fff" : C.navy,
          fontSize: 9,
          fontWeight: "800",
        }}
      >
        {count > 9 ? "9+" : count}
      </Text>
    </View>
  );
}

export default function Dossier({ user, dark = false }: { user: Profile; dark?: boolean }) {
  const colors = dark ? darkC : C;
  const [sub, setSub] = useState<Sub>("dossier");
  const dossierBadges = useAppStore((s) => s.dossierBadges);
  const clearDossierBadge = useAppStore((s) => s.clearDossierBadge);
  const histQ = useHistorique(true);
  const assuranceQ = useMyAssurance(true);

  const hist = histQ.data ?? null;
  const assurance = assuranceQ.data ?? null;
  const loading = histQ.isLoading && !histQ.data;

  useEffect(() => {
    clearDossierBadge(sub);
  }, [sub, clearDossierBadge]);

  const selectSub = (key: Sub) => {
    setSub(key);
    clearDossierBadge(key);
  };

  const { refreshControl } = usePullRefresh({
    keys: [qk.me, qk.historique, qk.assurance],
  });

  return (
    <BrandBackground dark={dark}>
      <ScreenEnter>
        <View style={{ backgroundColor: C.navy }}>
          <Header title="Mon dossier" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 12,
              gap: 4,
              alignItems: "center",
              height: 40,
            }}
          >
            {SUBS.map((t) => {
              const active = sub === t.key;
              const badge = dossierBadges[t.key] || 0;
              return (
                <PressScale
                  key={t.key}
                  onPress={() => selectSub(t.key)}
                  style={{
                    height: 36,
                    paddingHorizontal: 14,
                    justifyContent: "center",
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    backgroundColor: active ? colors.bg : "transparent",
                    alignSelf: "center",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: active ? (dark ? colors.text : C.navy) : "rgba(255,255,255,0.65)",
                    }}
                  >
                    {t.label}
                  </Text>
                  <TabBadge count={badge} active={active} />
                </PressScale>
              );
            })}
          </ScrollView>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
          refreshControl={refreshControl}
        >
          {loading ? (
            <ActivityIndicator color={C.blue} style={{ marginTop: 24 }} />
          ) : (
            <>
              {sub === "dossier" ? (
                <StoryArt
                  preset="dossier"
                  compact
                  dark={dark}
                  title="Votre parcours de soins"
                  subtitle="Consultations, chroniques et historique — toujours à portée de main."
                />
              ) : null}
              {sub === "ordonnances" ? (
                <StoryArt
                  preset="ordonnance"
                  compact
                  dark={dark}
                  title="Ordonnances"
                  subtitle="Médicaments prescrits par vos médecins."
                />
              ) : null}
              {sub === "examens" ? (
                <StoryArt
                  preset="examen"
                  compact
                  dark={dark}
                  title="Examens & labo"
                  subtitle="Résultats biologiques et imagerie."
                />
              ) : null}
              {sub === "assurance" ? (
                <StoryArt
                  preset="assurance"
                  compact
                  dark={dark}
                  title="Couverture santé"
                  subtitle="Assureur, police et garanties."
                />
              ) : null}
              {sub === "dossier" && (
                <DossierTab
                  user={user}
                  dark={dark}
                  consultations={hist?.consultations || []}
                />
              )}
              {sub === "ordonnances" && (
                <Ordonnances dark={dark} items={hist?.ordonnances || []} />
              )}
              {sub === "examens" && <Examens dark={dark} items={hist?.examens || []} />}
              {sub === "assurance" && (
                <Assurance user={user} dark={dark} data={assurance} />
              )}
            </>
          )}
        </ScrollView>
      </ScreenEnter>
    </BrandBackground>
  );
}

function DossierTab({
  user,
  dark,
  consultations,
}: {
  user: Profile;
  dark: boolean;
  consultations: any[];
}) {
  const colors = dark ? darkC : C;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <StaggerItem index={0}>
        <SectionLabel color={colors.navy}>Infos critiques</SectionLabel>
        <CriticalMedicalCard user={user} dark={dark} style={{ marginTop: 8 }} />
      </StaggerItem>

      <StaggerItem index={1}>
        <Card colors={colors}>
          <SectionLabel color={dark ? darkC.amber : C.amber}>Maladies chroniques</SectionLabel>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {user.chronic?.length ? (
              user.chronic.map((c: any) => (
                <Pill key={c.nom || c} color={dark ? darkC.amber : C.amber} bg={dark ? darkC.amberSoft : C.amberSoft}>
                  {typeof c === "string"
                    ? c
                    : c.depuis
                      ? `${c.nom} — depuis ${c.depuis}`
                      : c.nom}
                </Pill>
              ))
            ) : (
              <Text style={{ color: colors.muted }}>Aucune</Text>
            )}
          </View>
        </Card>
      </StaggerItem>

      <StaggerItem index={2}>
        <Card colors={colors}>
          <SectionLabel>Historique des consultations</SectionLabel>
          {consultations.length === 0 ? (
            <EmptyState
              title="Aucune consultation"
              subtitle="Vos prochaines visites médicales apparaîtront ici."
              dark={dark}
              icon="medical-outline"
              companions={["business", "calendar"]}
            />
          ) : (
            consultations.map((c, i) => (
              <PressScale
                key={c.id || i}
                onPress={() => setOpen(open === i ? null : i)}
                style={{ flexDirection: "row", gap: 12, paddingVertical: 10 }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: C.emerald,
                    marginTop: 4,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: colors.text }}>
                    {c.titre ||
                      [c.specialite || "Consultation", c.medecin_nom, c.structure_nom]
                        .filter(Boolean)
                        .join(" — ") ||
                      "Consultation"}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {c.date ? new Date(c.date).toLocaleDateString("fr-FR") : "—"}
                    {c.appointment_id ? " · Liée à un RDV" : ""}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {c.medecin_nom || ""}
                  </Text>
                  <Text style={{ color: C.blue, fontSize: 12, marginTop: 2 }}>
                    {c.diagnostic || c.type_label || "Consultation"}
                  </Text>
                  {open === i && c.notes ? (
                    <View
                      style={{
                        backgroundColor: colors.lightBlue,
                        borderRadius: 12,
                        padding: 12,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 12, lineHeight: 18 }}>
                        {c.notes}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </PressScale>
            ))
          )}
        </Card>
      </StaggerItem>
    </>
  );
}

function Ordonnances({ dark, items }: { dark: boolean; items: any[] }) {
  const colors = dark ? darkC : C;
  if (!items.length) {
    return (
      <EmptyState
        title="Aucune ordonnance"
        subtitle="Les prescriptions de vos médecins s'afficheront ici."
        dark={dark}
        icon="medkit-outline"
        companions={["fitness", "water"]}
      />
    );
  }
  return (
    <>
      <SectionLabel color={colors.navy}>Ordonnances</SectionLabel>
      {items.map((o, i) => (
        <StaggerItem key={o.id || i} index={i}>
          <Card colors={colors} style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <IconBadge name="medkit-outline" color={C.emerald} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>
                  {o.date
                    ? `Ordonnance du ${new Date(o.date).toLocaleDateString("fr-FR")}`
                    : "Ordonnance"}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {o.medecin_nom || ""} · {o.statut_label || o.statut}
                </Text>
              </View>
            </View>
            {(o.medicaments || []).map((m: any) => (
              <Text key={m.id || m.nom} style={{ color: colors.text, fontSize: 13, marginTop: 6 }}>
                • {m.nom} {m.dosage} — {m.frequence}
              </Text>
            ))}
          </Card>
        </StaggerItem>
      ))}
    </>
  );
}

function Examens({ dark, items }: { dark: boolean; items: any[] }) {
  const colors = dark ? darkC : C;
  if (!items.length) {
    return (
      <EmptyState
        title="Aucun examen"
        subtitle="Résultats de laboratoire et imagerie à venir."
        dark={dark}
        icon="flask-outline"
        companions={["pulse", "eyedrop"]}
      />
    );
  }
  return (
    <>
      <SectionLabel color={colors.navy}>Résultats</SectionLabel>
      {items.map((x, i) => (
        <StaggerItem key={x.id || i} index={i}>
          <Card colors={colors}>
            <Text style={{ fontWeight: "800", color: colors.text }}>{x.type_examen}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              {x.laboratoire} ·{" "}
              {x.date ? new Date(x.date).toLocaleDateString("fr-FR") : "—"} ·{" "}
              {x.statut_label || x.statut}
            </Text>
            {x.resultat_texte ? (
              <Text style={{ color: colors.text, fontSize: 13, marginTop: 8 }}>
                {x.resultat_texte}
              </Text>
            ) : null}
          </Card>
        </StaggerItem>
      ))}
    </>
  );
}

function Assurance({
  user,
  dark,
  data,
}: {
  user: Profile;
  dark: boolean;
  data: any;
}) {
  const colors = dark ? darkC : C;
  if (!data && !user.hasInsurance) {
    return (
      <EmptyState
        title="Aucune assurance"
        subtitle="Ajoutez votre couverture dans le profil pour la voir ici."
        dark={dark}
        icon="shield-outline"
        companions={["business", "card"]}
      />
    );
  }
  const a = data || {
    assureur: user.insurer,
    num_police: user.policyNumber,
    droits_valides: true,
    garanties: [],
  };
  return (
    <Card colors={colors}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
        <View>
          <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>
            {a.assureur}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, fontFamily: "monospace" }}>
            Police {a.num_police}
          </Text>
        </View>
        <Pill
          color={a.droits_valides ? C.emerald : C.emergency}
          bg={a.droits_valides ? C.lightBlue : C.redSoft}
        >
          {a.droits_valides ? "Droits valides" : "Suspendus"}
        </Pill>
      </View>
      {(a.garanties || []).map((g: any, i: number) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 8,
            borderTopWidth: i ? 1 : 0,
            borderTopColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{g.categorie}</Text>
          <Text style={{ color: C.emerald, fontWeight: "800" }}>{g.taux}%</Text>
        </View>
      ))}
    </Card>
  );
}
