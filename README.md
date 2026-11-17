# Cold Storage Monitor: React Dashboard

React + Vite frontend. No backend: the ESP32 writes to Firebase Realtime Database and this dashboard reads from it.

**Login:** username `admin`, password `admin@123` (edit in `src/components/Lock.jsx`).
This is a front-end lock screen only. Anyone who opens the site's source can read the password, so it keeps casual visitors out but is not real security.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

With no `.env`, it runs in **demo mode** (simulated live data), so you can see every screen before the hardware is ready.

## Connect Firebase

1. Firebase console: create a project, then add **Realtime Database** (start in test mode).
2. Project settings, Your apps, add a Web app, and copy the config values.
3. `cp .env.example .env` and fill in the values (`VITE_FIREBASE_DATABASE_URL` is required).
4. Paste `database.rules.json` into the database's Rules tab and publish. The `.indexOn: ["ts"]` line is needed for the History and Download queries.
5. `npm run build` and deploy the `dist` folder (Vercel / Netlify / Firebase Hosting). On Vercel, add the same variables under Environment Variables.

The rules file opens read and write to everyone, which is fine for a demo. Before showing it publicly, tighten the write rule (for example to authenticated devices only).

## Database layout the ESP32 must write

```
coldstorage/
  latest            <- overwrite every reading (drives Current Status)
  history/<pushId>  <- push a new child every reading (drives History / Download)
  config            <- written by the dashboard (thresholds), read by the ESP32
```

Each reading (`latest` and every `history` child):

```json
{ "ts": 1763100000, "temp": 4.6, "hum": 61, "door": 0, "mains": 1, "batt": 4.05, "alarm": "OK" }
```

| Field | Meaning |
|---|---|
| `ts` | Epoch **seconds** (from NTP). Milliseconds also accepted |
| `temp` | Temperature in °C |
| `hum` | Relative humidity in % |
| `door` | `1` = open, `0` = closed |
| `mains` | `1` = mains present, `0` = lost |
| `batt` | Battery volts (optional) |
| `alarm` | `OK`, `TEMP_HIGH`, `TEMP_LOW`, `HUM_HIGH`, `DOOR_OPEN`, `POWER_LOST`, `SENSOR_FAULT` |

`config` holds `{ "tempMin": 2, "tempMax": 8, "humMax": 85, "delayMin": 10 }`.

The dashboard shows "Device offline" when the newest `latest.ts` is older than 60 seconds, so publish at least once a minute.
Store history at a lower rate than `latest` (for example every 1 to 5 minutes) to keep Firebase storage small.

## Structure

```
src/data.js            Firebase reads/writes + demo simulator
src/utils.js           timestamp handling, CSV, history summary
src/components/Lock.jsx
src/pages/Home.jsx  Status.jsx  History.jsx  Download.jsx
```
