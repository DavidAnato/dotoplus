# dotoplus - App mobile Patient (DOTO+)

Application mobile **patient** de l'écosystème **DOTO+**, construite avec
**Expo / React Native** d'après le design Figma Make (10 écrans).

## Écrans (fidèles au Figma)
Onboarding (3 slides) · Connexion · Accueil · Mon dossier (Dossier / Ordonnances /
Examens / Assurance) · Ma carte (**DotoCard** + QR) · Paramètres · **Mode Urgence**
(fond rouge, accessible hors ligne).

## Stack
- Expo ~57 · React Native 0.86 · React 19 · TypeScript
- Navigation par état (léger, sans dépendance)
- Palette et typographie reprises du Figma (`src/theme.ts`)

## Installation
```bash
cd dotoplus
npm install
copy .env.example .env      # cp sous macOS/Linux
npm start                   # puis 'a' (Android), 'i' (iOS) ou 'w' (web)
```

## Nouveautés (suite gaps)
- **DotoCard** : QR réel via `GET /api/dodocards/mine/` + `react-native-qrcode-svg` (token chiffré backend).
- **Hors ligne** : snapshot AsyncStorage (profil urgence + token QR) ; SecureStore pour JWT / flags bio.
- **Connexion** : téléphone + mot de passe uniquement. OTP pour inscription / reset MDP.
- **NPI / ANIP** : identification du dossier côté Hub/pro (pas pour login patient).
- **PIN** : déverrouillage optionnel (paramètres) ; biométrie possible.
- **Biométrie** : `expo-local-authentication` (fallback gracieux si hardware absent).

## Connexion
- Tél `+229 97 45 12 88` / `demo123`
- OTP mock `00000` (inscription / changement MDP uniquement)
- Bouton « Continuer en démo » → urgence hors ligne sans API

Configurez `EXPO_PUBLIC_API_URL` (voir `.env.example`).

## Build APK via GitHub Actions

Sans EAS : workflow `.github/workflows/android-apk.yml`.

1. Sur GitHub : **Actions** → **Android APK** → **Run workflow** (ou push sur `main` qui touche le code mobile).
2. À la fin du run : ouvrir le job → section **Artifacts** → télécharger **`dotoplus-android`** (`app-release.apk`).
3. L’APK est signé avec le **keystore debug** Android (preview interne, pas pour le Play Store).
4. `EXPO_PUBLIC_API_URL` injectée = celle de `eas.json` preview/production (`https://doto-anato.loca.lt`).
