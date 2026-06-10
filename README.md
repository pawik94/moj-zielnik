# Mój Zielnik 🌿

Aplikacja Android do zarządzania zielniku z palet. Śledź rośliny, harmonogram podlewania i wskazówki pielęgnacyjne.

## Funkcje
- 3 kondygnacje z roślinami (konfigurowalny układ)
- Licznik podlewania z kolorowym alertem (zielony → pomarańczowy → czerwony)
- Pełne informacje o każdej roślinie (podlewanie, przycinanie, kuchnia)
- Dodawanie / edycja / usuwanie roślin
- Przenoszenie roślin między kondygnacjami i zmiana kolejności
- Dane domyślne: 11 ziół z kompletnym opisem

## Instalacja i uruchomienie

### Wymagania
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Konto na expo.dev

### Uruchomienie lokalne
```cmd
cd moj-zielnik
npm install
set EAS_NO_VCS=1
npx expo start --android
```

### Build APK (EAS)
```cmd
set EAS_NO_VCS=1
eas build --platform android --profile preview
```

### Build produkcyjny
```cmd
set EAS_NO_VCS=1
eas build --platform android --profile production
```

## Struktura projektu
```
App.js                  - Główny plik, nawigacja
database.js             - SQLite (expo-sqlite)
theme.js                - Kolory, style, logika podlewania
data/
  defaultPlants.js      - Domyślne rośliny i kondygnacje
screens/
  HomeScreen.js         - Główny ekran z kondygnacjami
  PlantDetailScreen.js  - Szczegóły rośliny
  EditPlantScreen.js    - Dodawanie / edycja rośliny
components/
  TierRow.js            - Kondygnacja (duży prostokąt)
  PlantCard.js          - Karta rośliny z licznikiem
```

## Domyślne rośliny
| Kondygnacja | Roślina |
|---|---|
| 1 – Góra | Mięta marokańska, Mięta czekoladowa |
| 2 – Środek | Rozmaryn, Bazylia Magic Blue, Bazylia zwykła, Oregano |
| 3 – Dół | Kocanka/Curry, Szałwia, Tymianek, Cząber górski, Szczypior |

## Logika licznika podlewania
- 🟢 **Zielony** — podlano niedawno (>30% czasu pozostało)
- 🟠 **Pomarańczowy** — wkrótce trzeba podlać (<30% czasu)
- 🔴 **Czerwony** — czas podlać! (termin minął)
- Po naciśnięciu przycisku — licznik resetuje się do zera
