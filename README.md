# Contract Risk Analyzer — Mobile

Expo / React Native app for uploading, pasting, or photographing a contract and getting an AI risk analysis. PII (names, emails, phone numbers, SSNs, etc.) is redacted before anything is sent for analysis, and the user reviews exactly what was redacted first.

The backend lives in a separate repo: [contract-analyzer-backend](https://github.com/jppeter-png/contract-analyzer-backend).

---

## Setup

```bash
npm install
```

Open `src/api.js` and set `BASE_URL` to your backend address:
- Local dev (same machine, iOS Simulator): `http://localhost:3000`
- Local dev (physical device): `http://YOUR_LOCAL_IP:3000`
- Production: your deployed backend URL

```bash
npm start            # Opens the Expo dev server
# Then press i (iOS) or a (Android)
```

### Running the native iOS project

This app has already been through `expo prebuild`, so `ios/` is a real native Xcode project (committed to this repo) rather than the Expo-managed default. `ios/Pods/` and `ios/build/` are gitignored — after cloning, install them before building:

```bash
cd ios && pod install
```

Then either open `ios/ContractAnalyzer.xcworkspace` in Xcode and run from there, or run `npx expo run:ios` from `mobile/`, which does the pod install/build for you. Either way, Metro (`npm start`) needs to be running for a Debug build to load its JS — a physical device also needs the "Local Network" permission granted on first launch (declared in `Info.plist`) to reach Metro on your Mac.

If you change native dependencies (anything with native code, e.g. a new Expo module), re-run `pod install`; a pure-JS change just hot-reloads.

---

## Project Structure

```
mobile/
├── App.js                    # Navigation setup
├── app.json                  # Expo config
├── package.json
├── ios/                      # Native iOS project (expo prebuild output; Pods/build gitignored)
└── src/
    ├── api.js                # Backend service calls
    ├── history.js            # On-device analysis history (AsyncStorage)
    ├── analysisChunking.js   # Splitting/merging long contracts (see "Long contracts" below)
    ├── screens/
    │   ├── UploadScreen.js       # Entry point: upload file / paste text / camera / history tabs
    │   ├── ReviewScreen.js       # Review redacted PII, pick contract type, trigger analysis
    │   ├── AnalyzingScreen.js    # Loading state for a single-pass analysis
    │   ├── ChunkedAnalyzingScreen.js  # Progress/ETA UI for the multi-section flow
    │   ├── ResultsScreen.js      # Risk summary, issues, missing protections
    │   ├── CameraScreen.js       # Multi-page photo capture → OCR
    │   ├── BatchReviewScreen.js  # Analyze multiple uploaded files at once
    │   └── HistoryScreen.js      # Past analyses, saved locally
    └── components/
        ├── RiskBadge.js
        └── IssueCard.js          # Renders one issue; shows a neutral "Missing protection"
                                   # pill instead of a severity badge when issue.type is that
```

---

## Long contracts

The backend caps a single `/api/analyze` call at 8,000 characters. When a contract's scrubbed text exceeds that, the user is asked to choose before anything is sent:

1. **Process anyway** — analyze just the first 8,000 characters; the response's `truncated: true` flag drives a visible warning banner on the results screen.
2. **Process in full** — the client splits the scrubbed text into ≤8,000-char sections (`analysisChunking.js`'s `chunkText`, breaking on paragraph/whitespace boundaries) and calls `/api/analyze` once per section, one section per minute (`CHUNK_INTERVAL_MS`) to stay under the model provider's rate limits, showing live progress and an ETA (`ChunkedAnalyzingScreen.js`, with a cancel option). Each call sets `chunkContext: { index, total }` so the backend doesn't flag a clause "missing" just because it's in a different section. Results are merged client-side (`mergeAnalyses`): `overall_risk` takes the worst across sections, `issues` and `missing_protections` are combined and deduped.
3. **Cancel** — abort before any request is sent.

This entire flow lives in the mobile app (`ReviewScreen.js` → `ChunkedAnalyzingScreen.js`); the backend has no separate "chunked" endpoint.

**Batch review** (`BatchReviewScreen.js`, analyzing multiple uploaded files at once) has the same protection, applied across the whole batch rather than per file. Before analyzing, every file's scrubbed text is checked; if any exceed 8,000 characters, the user sees one combined prompt ("2 of 5 files are long...") with the same three choices. Choosing "process in full" flattens every file's sections into a single ordered list — e.g. a 3-file batch where file 2 needs 3 sections produces a 5-step list — and paces across that whole list globally (one call per minute), not per file, since every call shares the same rate-limit budget. Each file's sections are merged back together independently once they've all completed; a file whose sections didn't all finish (cancelled mid-way, or a later section failed) is left unanalyzed rather than shown with a misleadingly-partial result.

---

## History

Every completed analysis (single, chunked, or from a batch) is saved locally via `src/history.js` (AsyncStorage) and browsable from the "History" tab on the upload screen. Nothing is stored server-side — history is per-device and won't sync across installs.

---

## Known limitations

- **Chunked analysis has no combined summary**: the merged `summary` for a chunked result is a concatenation of each section's summary, not a fresh synthesis — there's no final "re-read everything together" pass.
- **No automated tests** for this app yet — the backend has a Jest suite (see its README), but the mobile app is currently verified manually (simulator + real device).
- **No offline support**: every screen assumes the backend is reachable.
