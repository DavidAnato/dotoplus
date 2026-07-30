import React, { useCallback } from "react";
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
import { useAppointments } from "../queries/hooks";
import { qk } from "../queries/keys";
import { useQueryClient } from "@tanstack/react-query";

export default function RendezVous({ dark = false }: { dark?: boolean }) {
  const colors = dark ? darkC : C;
  const navigation = useNavigation();
  const qc = useQueryClient();
  const apptsQ = useAppointments(true);
  const items = Array.isArray(apptsQ.data) ? apptsQ.data : [];
  const loading = apptsQ.isLoading && !apptsQ.data;

  useFocusEffect(
    useCallback(() => {
      void qc.invalidateQueries({ queryKey: qk.appointments });
    }, [qc])
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
            await qc.invalidateQueries({ queryKey: qk.appointments });
          } catch (e: any) {
            appAlert("Erreur", e.message || "Annulation impossible");
          }
        },
      },
    ]);
  };

  const activeCount = items.filter((a) => a.statut !== "annule" && a.statut !== "termine").length;
  const { refreshControl } = usePullRefresh({
    keys: [qk.appointments],
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
          <StoryArt
            preset="rdv"
            compact
            dark={dark}
            title="Agenda patient"
            subtitle={
              loading
                ? "Chargement…"
                : activeCount
                  ? `${activeCount} rendez-vous à venir ou en cours.`
                  : "Aucun rendez-vous planifié pour le moment."
            }
          />

          {loading ? (
            <Text style={{ color: colors.muted, textAlign: "center", marginTop: 20 }}>
              Chargement…
            </Text>
          ) : items.length === 0 ? (
            <EmptyState
              title="Aucun rendez-vous"
              subtitle="Les RDV pris par votre structure apparaîtront ici en temps réel."
              dark={dark}
              icon="calendar-outline"
              companions={["time", "business"]}
            />
          ) : (
            <>
              <SectionLabel color={colors.navy}>Vos rendez-vous</SectionLabel>
              {items.map((a, i) => {
                const cancelled = a.statut === "annule";
                const done = a.statut === "termine";
                return (
                  <StaggerItem key={a.id || i} index={i}>
                    <Card colors={colors} style={{ opacity: cancelled || done ? 0.65 : 1 }}>
                      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                        <IconBadge name="calendar-outline" color={cancelled ? colors.muted : C.blue} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>
                            {a.debut
                              ? new Date(a.debut).toLocaleString("fr-FR", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Date à confirmer"}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                            {a.structure_nom || a.structure?.nom || "Structure"}
                            {a.professionnel_nom ? ` · ${a.professionnel_nom}` : ""}
                          </Text>
                          {a.motif ? (
                            <Text style={{ color: colors.text, fontSize: 13, marginTop: 6 }}>
                              {a.motif}
                            </Text>
                          ) : null}
                          <Text
                            style={{
                              color: cancelled ? C.emergency : done ? colors.muted : C.emerald,
                              fontSize: 12,
                              fontWeight: "700",
                              marginTop: 8,
                            }}
                          >
                            {a.statut_label || a.statut}
                          </Text>
                          {!cancelled && !done ? (
                            <View style={{ marginTop: 10, alignSelf: "flex-start" }}>
                              <Button
                                title="Annuler"
                                outline
                                color={C.emergency}
                                compact
                                onPress={() => cancel(a.id)}
                              />
                            </View>
                          ) : null}
                        </View>
                        <Ionicons
                          name={cancelled ? "close-circle" : "checkmark-circle"}
                          size={18}
                          color={cancelled ? C.emergency : C.emerald}
                        />
                      </View>
                    </Card>
                  </StaggerItem>
                );
              })}
            </>
          )}
        </ScrollView>
      </ScreenEnter>
    </BrandBackground>
  );
}
