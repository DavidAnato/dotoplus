/**
 * Son court pour une nouvelle demande d'accès (consentement).
 * Débounce pour éviter un double déclenchement SSE + modal.
 */
import { Platform } from "react-native";

const ACCESS_SOUND = require("../assets/sounds/access-request.wav");

let lastPlayedAt = 0;
let playerRef: { seekTo: (p: number) => void; play: () => void; release: () => void } | null = null;

export async function playAccessRequestSound() {
  const now = Date.now();
  if (now - lastPlayedAt < 1600) return;
  lastPlayedAt = now;

  try {
    const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: Platform.OS === "ios" ? "mixWithOthers" : "duckOthers",
    });

    if (playerRef) {
      try {
        playerRef.release();
      } catch {
        /* ignore */
      }
      playerRef = null;
    }

    const player = createAudioPlayer(ACCESS_SOUND);
    playerRef = player;
    player.play();
  } catch (e) {
    console.log("[sound] access request:", (e as Error)?.message || e);
  }
}
