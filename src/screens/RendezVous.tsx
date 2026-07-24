import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Header, SectionLabel } from "../ui";
import { C, darkC } from "../theme";
import { api } from "../api";
import {
  BrandBackground,
  EmptyState,
  IconBadge,
  ScreenEnter,
  StaggerItem,
  hapticSuccess,
} from "../motion";
import { StoryArt } from "../components/StoryArt";
import { appAlert } from "../components/AppDialog";
import { usePullRefresh } from "../hooks/usePullRefresh";

export default function RendezVous({ dark = false }: { dark?: boolean }) {
  const colors = dark ? darkC : C;
  const navigation = useNavigation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const appts = await api.appointments();
      setItems(Array.isArray(appts) ? appts : []);
    } catch (e: any) {
      appAlert("Erreur", e.message || "Chargement impossible");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const cancel = (id: number) => {
    appAlert("Annuler le RDV", "Confirmer l'annulation ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Annuler le RDV",
        style: "destructive",
        onPress: async () => {
          try {
            await api.cancelAppointment(id);
            hapticSuccess();
            await load({ silent: true });
          } catch (e: any) {
            appAlert("Erreur", e.message || "Annulation impossible");
          }
        },
      },
    ]);
  };

  const activeCount = items.filter((a) => a.statut !== "annule" && a.statut !== "termine").length;
  const { refreshControl } = usePullRefresh({
    refetch: [() => load({ silent: true })],
  });

  return (
    <BrandBackground dark={dark}>
      <ScreenEnter>
        <Header
          title="Mes rendez-vous"
          onBack={() => {
            if (navigation.canGoBack()) navigation.goBack();
          }}
        />
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
          refreshControl={refreshControl}
        >
          <StaggerItem index={0}>
            <StoryArt
              preset="rdv"
              compact
              dark={dark}
              title="Agenda médical"
              subtitle="Consultations planifiées par votre médecin — rappels et détails ici."
            />
          </StaggerItem>

          <StaggerItem index={1}>
            <Card
              colors={colors}
              decor="navy"
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <IconBadge name="calendar-outline" color="#fff" bg={C.navy} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>
                  {activeCount} actif{activeCount > 1 ? "s" : ""}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Consultation uniquement — prise de RDV par le médecin
                </Text>
              </View>
            </Card>
          </StaggerItem>

          <SectionLabel color={colors.navy}>À venir & passés</SectionLabel>
          {!loading && items.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="Aucun rendez-vous"
              subtitle="Votre médecin planifiera vos prochaines consultations."
              dark={dark}
              companions={["time", "business"]}
            />
          ) : null}
          {items.map((a, i) => (
            <StaggerItem key={a.id} index={i + 1}>
              <Card colors={colors}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: colors.lightBlue || C.lightBlue,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="calendar" size={20} color={C.navy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>
                      {a.motif || "Rendez-vous"}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                      {a.debut
                        ? new Date(a.debut).toLocaleString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                      {a.structure_nom ? ` · ${a.structure_nom}` : ""}
                    </Text>
                    {a.professionnel_nom ? (
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                        Avec {a.professionnel_nom}
                      </Text>
                    ) : null}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      <Ionicons name="ellipse" size={8} color={C.blue} />
                      <Text style={{ color: C.blue, fontWeight: "700", fontSize: 12 }}>
                        {a.statut_label || a.statut}
                      </Text>
                    </View>
                  </View>
                </View>
                {a.statut !== "annule" && a.statut !== "termine" ? (
                  <View style={{ marginTop: 12 }}>
                    <Button
                      title="Annuler"
                      icon="close-circle-outline"
                      outline
                      color={C.emergency}
                      onPress={() => cancel(a.id)}
                    />
                  </View>
                ) : null}
              </Card>
            </StaggerItem>
          ))}
        </ScrollView>
      </ScreenEnter>
    </BrandBackground>
  );
}
