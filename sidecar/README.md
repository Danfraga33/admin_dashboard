# Jarvis clap sidecar

Local-only Python service that gives the admin dashboard three desktop-native
abilities ported from [`jarvis-clap`](https://github.com/Danfraga33/jarvis-clap).
It runs on **your machine** — never on Vercel (a browser/serverless runtime
cannot open desktop apps or grab a Bluetooth mic).

## What a double clap does

1. **Ritual** — opens the Spotify track (auto-plays), the dashboard in Brave on
   your chosen monitor, and the TradingView desktop app.
2. **Voice** — fetches your **live Atlas briefing** from the dashboard and speaks
   it (ElevenLabs, falling back to the built-in Windows voice).
3. **Mic release** — holds the mic open until the clap fires, then releases it so
   a Bluetooth headset drops HFP and returns to high-quality A2DP playback
   (`STOP_AFTER_FIRE`).

## Setup

```bash
npm run sidecar:setup           # pip install -r sidecar/requirements.txt
cp sidecar/.env.example sidecar/.env
```

Fill `sidecar/.env`:

- `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` — for the spoken briefing. Without
  them the briefing still speaks via the Windows SAPI voice.
- `ATLAS_BRIEFING_SECRET` — copy the `SIDECAR_TTS_SECRET` value from the
  dashboard's `.env.local`. They must match.
- `ATLAS_BRIEFING_URL` — the dashboard's briefing endpoint (default points at the
  Vite dev server `http://localhost:5173/api/briefing/tts`).
- `SONG_URI`, `TRACTION_SITE_URL`, `TRACTION_CHROME_MONITOR` — ritual targets.

## Run

```bash
npm run dev:all    # dashboard + clap sidecar together (Ctrl+C stops both)
```

Or run them separately:

```bash
npm run dev        # terminal 1 — dashboard (serves /api/briefing/tts)
npm run sidecar    # terminal 2 — clap listener + HTTP bridge on :8756
```

Double-clap. Stop with **Ctrl+C**. The listener releases the mic after it fires;
restart `npm run sidecar` (or hit `POST /api/actions/rearm`) to arm again.

## HTTP bridge (127.0.0.1:8756)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/state` | telemetry snapshot |
| GET/POST | `/api/config` | read / live-patch tuning |
| POST | `/api/actions/fire` | run the ritual now (no clap) |
| POST | `/api/actions/brief` | fetch + speak the live briefing now |
| POST | `/api/actions/say` | speak an arbitrary line (voice check) |
| POST | `/api/actions/rearm` | re-arm the once-per-run briefing gate |
| WS | `/ws` | live block/event stream |

## Tuning

Edit constants at the top of `jarvis.py` or override via `.env`
(`SPIKE_RATIO`, `COOLDOWN_S`, `MIN_RMS`, `JARVIS_INPUT_DEVICE`, `JARVIS_VOICE_GAIN`).
List mics: `python -c "import sounddevice as sd; print(sd.query_devices())"`.

## Notes

- Windows-only ritual bits: Spotify `os.startfile`, TradingView UWP launch,
  Brave monitor-snapping. Voice + clap detection are cross-platform.
- `sidecar/` is excluded from the Vercel build (`.vercelignore`) and its `.env`
  / `.cache` are gitignored.
