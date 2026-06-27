# CBT Companion

A conversational mental health companion powered by Claude, built with React Native + Expo **SDK 55** (the latest stable as of build time). Guides users through evidence-based CBT exercises: daily mood check-ins, cognitive restructuring (thought records), gratitude journaling, and psychoeducation micro-lessons.

---

## Quick start (Expo Go)

```bash
# 1. Install dependencies
npm install

# 2. Copy the env example and add your Anthropic API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# 3. Start the dev server
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone.

The Anthropic API key lives in `.env` — it's read server-side by the Expo Router API route at `app/api/chat+api.ts` and is **never bundled into the client**.

---

## Project structure

```
app/
  _layout.tsx           Root layout — DB init, splash screen
  onboarding.tsx        First-launch name prompt
  (tabs)/
    _layout.tsx         Tab bar (Chat · History · Learn · Settings)
    chat.tsx            Main chat screen with streaming
    history.tsx         Mood chart, thought records, gratitude log
    lessons.tsx         Psychoeducation lesson picker
    settings.tsx        Name, data management
  api/
    chat+api.ts         Expo Router API route — Anthropic proxy (server-side)

components/
  ChatBubble.tsx        Message bubble (user / assistant)
  ChatInput.tsx         Multi-line text input with send button
  CrisisCard.tsx        988 Lifeline card shown on crisis keywords
  DisclaimerModal.tsx   First-open safety disclaimer
  MoodChart.tsx         SVG line chart (react-native-svg, no extra deps)
  MoodSlider.tsx        1–10 mood entry card

lib/
  ai/
    systemPrompt.ts     Builds mode-aware system prompts for Ember
    types.ts            Shared TypeScript types
  db/
    schema.ts           SQLite schema + singleton accessor
    queries.ts          All DB read/write helpers + seed data
  crisis.ts             Regex-based crisis keyword detector
  lessons.ts            Psychoeducation lesson content

constants/
  colors.ts             Colour palette + moodColor() helper
  distortions.ts        Cognitive distortion definitions

hooks/
  useDatabase.ts        DB init effect (used in root layout)
  useMoodHistory.ts     Mood entries loader with refresh
```

---

## Where to put the Anthropic API key

| Context | Where the key goes | Notes |
|---|---|---|
| **Local dev** | `.env` (never committed) | Read by the Expo dev server as `process.env.ANTHROPIC_API_KEY` |
| **EAS preview/production build** | `eas.json` → `build.preview.env.ANTHROPIC_API_KEY` **or** as an EAS secret | Do **not** prefix with `EXPO_PUBLIC_` — that would embed it in the bundle |

### Using EAS Secrets (recommended for production)

```bash
eas secret:create --scope project --name ANTHROPIC_API_KEY --value sk-ant-...
```

Then remove the hardcoded value from `eas.json`.

---

## Running in Expo Go vs TestFlight

### Expo Go (development)

```bash
npx expo start          # interactive menu
npx expo start --ios    # open directly in iOS Simulator
```

The API route (`/api/chat`) is served by the Expo development server. Make sure `.env` contains your key.

### TestFlight (EAS build)

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configure your Apple Developer account** in `eas.json`:
   - `submit.production.ios.appleId`
   - `submit.production.ios.ascAppId` (App Store Connect App ID)
   - `submit.production.ios.appleTeamId`

3. **Set your bundle identifier** in `app.json`:
   ```json
   "ios": { "bundleIdentifier": "com.yourname.cbtcompanion" }
   ```
   It must match what you register in App Store Connect.

4. **Build for TestFlight**
   ```bash
   eas build --platform ios --profile preview
   ```

5. **Submit to TestFlight**
   ```bash
   eas submit -p ios
   ```

The `preview` profile builds an `.ipa` distributed internally — perfect for TestFlight without going through the App Store review.

---

## Apple Developer account setup checklist

- [ ] Create an App ID with bundle identifier `com.yourname.cbtcompanion`
- [ ] Create an app in App Store Connect with the same bundle identifier
- [ ] Add yourself as a TestFlight tester
- [ ] Update `eas.json` with your `appleId`, `ascAppId`, and `appleTeamId`
- [ ] Update `app.json` with your `bundleIdentifier`

---

## API key security

The Anthropic key is **only** read inside `app/api/chat+api.ts`, which runs server-side (in the Expo dev server for local dev, and on EAS Hosting / your server for production builds). It is never referenced with `EXPO_PUBLIC_` and is therefore never bundled into the client binary — it cannot be extracted from a TestFlight `.ipa`.

---

## Conversation engine

`lib/ai/systemPrompt.ts` builds a dynamic system prompt for each mode:

| Mode | What it does |
|---|---|
| `free_chat` | Open supportive conversation |
| `check_in` | Mood logging + guided reflection |
| `thought_record` | 6-step cognitive restructuring exercise |
| `gratitude` | 1–3 item gratitude journaling |
| `lesson` | Guided psychoeducation delivery |

The model is instructed to embed `[[THOUGHT_RECORD_COMPLETE]]` and `[[GRATITUDE_COMPLETE]]` JSON blocks in its response when an exercise is complete. The client strips these blocks before displaying text and writes the structured data to SQLite.

---

## Extending the app

- **Add a lesson**: append an entry to `lib/lessons.ts`
- **Add a distortion**: append to `constants/distortions.ts`
- **Change the persona**: edit the `persona` string in `lib/ai/systemPrompt.ts`
- **Change the model**: set `ANTHROPIC_MODEL` in your `.env`
- **Voice / Driving mode**: tap 🚗 in the chat header (or the card on the welcome screen) to open hands-free mode. Speech-to-text runs **on-device** (`expo-speech-recognition`); Ember's replies are spoken back via **Deepgram Aura** (`expo-speech` is the automatic fallback). See "Driving / voice mode" below.

---

## Driving / voice mode

A hands-free, low-distraction screen (`app/driving.tsx`) for talking to Ember in the car.

- **Speech-to-text — on-device.** Uses `expo-speech-recognition` (iOS Speech framework / Android), forced on-device. Audio never leaves the phone. Recognition auto-stops on a natural pause, so it's turn-based without tapping.
- **Text-to-speech — Deepgram Aura.** Ember's reply is synthesized server-side by the `/api/speak` route (key stays off the client, same pattern as `/api/chat`), returned as base64, cached to a file, and played with `expo-audio`. If Deepgram is unavailable, it falls back to the device's built-in voice (`expo-speech`).
- **Auto-listen loop.** After Ember finishes speaking, the mic reopens automatically (toggle with the Auto/Manual button). Tap the big button to interrupt and talk, or to finalize early.
- **Conversation continuity.** Driving mode reuses the same session and history as the chat tab, so spoken turns show up in History.
- **Crisis safety.** The same `detectCrisis` gate runs on transcribed speech; it surfaces the 988 card and pauses the auto-listen loop.

> **Heads-up:** on-device speech recognition is a native module, so it does **not** run in plain Expo Go. Use a dev build (`npx expo run:ios`) or an EAS build to exercise voice input. Everything else works in Expo Go.

Set your Deepgram key in `.env`:

```bash
DEEPGRAM_API_KEY=...            # free tier is fine to start
# DEEPGRAM_TTS_MODEL=aura-2-thalia-en   # optional voice override
```

For EAS builds, add it the same way as the Anthropic key (env in `eas.json` or an EAS secret).

---

## Safety

- First-launch disclaimer modal surfaces the 988 Lifeline
- Client-side crisis keyword detection fires before any message reaches the API
- `CrisisCard` component shows dial/text buttons for 988
- The system prompt instructs the model to prioritize crisis response above all else
- The app never diagnoses or claims to be a therapist
