#!/usr/bin/env python3
"""
Desktop clap listener for the admin dashboard.

Holds the microphone open until a DOUBLE CLAP fires, then runs a ritual:
  1. Opens the Spotify track (desktop app auto-plays).
  2. Opens the dashboard site in Brave on the chosen monitor.
  3. Launches the TradingView desktop app (Windows UWP).
  4. Speaks the LIVE Atlas briefing (ElevenLabs, Windows SAPI fallback).
Then it RELEASES the mic so a Bluetooth headset drops HFP and returns to
high-quality A2DP playback (STOP_AFTER_FIRE).

Run:
  python -m pip install -r requirements.txt
  python jarvis.py            # standalone CLI
  python server.py           # same listener + HTTP/WS bridge for the dashboard

Tuning (constants below):
  SAMPLE_RATE   — usually 44100 or 48000; match your device if needed.
  BLOCK_MS      — analysis window size; smaller = snappier, noisier.
  SPIKE_RATIO   — how many times louder than the noise floor counts as a clap;
                    raise if false triggers; lower if claps are missed.
  COOLDOWN_S    — minimum seconds between double-clap logs (debounce).
  MIN_DOUBLE_GAP_S / MAX_DOUBLE_GAP_S — allowed time between the two claps.
  MIN_RMS       — ignore spikes below this absolute level.
  SONG_URI      — Spotify URI to open on each double clap (empty = skip).
  STOP_AFTER_FIRE — release the mic after the ritual so BT returns to A2DP.
  ATLAS_* / ELEVENLABS_* — the spoken briefing. Configure via `.env`.
"""

from __future__ import annotations

import hashlib
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import wave
import webbrowser
from pathlib import Path

from dotenv import load_dotenv
import numpy as np
import sounddevice as sd

# --- tuning knobs -----------------------------------------------------------
# SAMPLE_RATE is a preferred default; if the chosen device rejects it, the code
# falls back to the device's default rate. Override with JARVIS_SAMPLE_RATE.
SAMPLE_RATE = 44100
BLOCK_MS = 40
CHANNELS = 1

SPIKE_RATIO = 12.0
COOLDOWN_S = 0.45
MIN_DOUBLE_GAP_S = 0.05
MAX_DOUBLE_GAP_S = 0.35
RETRIGGER_RATIO = 0.55
NOISE_FLOOR_ALPHA = 0.992
MIN_RMS = 0.05


def _env_float(name: str, default: float) -> float:
    raw = (os.environ.get(name) or "").strip()
    if raw:
        try:
            return float(raw)
        except ValueError:
            pass
    return default
QUIET_GATE_MULT = 2.2  # update noise floor only when below floor * this
# Startup mic probe: if default input RMS stays below this, scan for a louder device.
INPUT_PROBE_S = 0.5
INPUT_SILENT_RMS = 0.001
# Hold the mic open until the ritual fires on a double clap, then release it so a
# Bluetooth headset returns to high-quality A2DP. Set JARVIS_STOP_AFTER_FIRE=0
# to keep listening after.
STOP_AFTER_FIRE = True
# Optional hard time cap on listening (seconds); 0 = no cap. Override JARVIS_LISTEN_WINDOW_S.
LISTEN_WINDOW_S = 0.0

# Spotify: "spotify:track:TRACK_ID". A spotify: URI (not https) opens the
# DESKTOP app and auto-plays. Overridable via SONG_URI in .env.
SONG_URI = os.environ.get("SONG_URI") or "spotify:track:0cgODPSGPfVKvJ3ZarsK70"

# Brave (fallback: default browser). Ritual browser windows open normally.
OPEN_TRACTION_SITE_IN_CHROME = True
# TradingView desktop app (Microsoft Store / UWP) on double clap.
OPEN_TRADINGVIEW_APP = True
OPEN_CHROME_FULLSCREEN = False
# False = your normal Brave profile (extensions, logins). True = temp per-site dirs.
CHROME_SEPARATE_SITE_PROFILES = False
# Which physical screen (1 = leftmost/top-first after sorting). Windows only.
TRACTION_CHROME_MONITOR = 1

# --- voice / Atlas briefing --------------------------------------------------
JARVIS_WELCOME_ENABLED = True
# Playback gain for the spoken briefing (1.0 = full). Override JARVIS_VOICE_GAIN.
JARVIS_VOICE_GAIN = 0.6
# Speak a short test line once at startup. Off by default. Set JARVIS_WELCOME_SELFTEST=1.
JARVIS_WELCOME_SELFTEST = False
# Spoken only if the live briefing fetch fails and nothing else is available.
JARVIS_WELCOME_PHRASE = os.environ.get("ATLAS_BRIEFING_FALLBACK") or "Welcome home sir."
# Seconds after launching SONG_URI before speaking (gives Spotify time to start).
JARVIS_AFTER_SONG_DELAY_S = 1.0
# Save ElevenLabs PCM as WAV under .cache/jarvis_welcome/; replay skips the API.
JARVIS_WELCOME_CACHE_ENABLED = True

# Live Atlas briefing endpoint on the dashboard. On double clap the sidecar GETs
# the current briefing summary here and speaks it. Falls back to the phrase above
# if unreachable. The briefing text is dynamic, so its audio is NOT cached.
ATLAS_BRIEFING_URL = (os.environ.get("ATLAS_BRIEFING_URL") or "").strip()
ATLAS_BRIEFING_SECRET = (os.environ.get("ATLAS_BRIEFING_SECRET") or "").strip()
ATLAS_BRIEFING_TIMEOUT_S = 8.0

load_dotenv(Path(__file__).resolve().parent / ".env")

# Re-read env-backed knobs after load_dotenv (module-level reads above ran before it).
SONG_URI = os.environ.get("SONG_URI") or SONG_URI
ATLAS_BRIEFING_URL = (os.environ.get("ATLAS_BRIEFING_URL") or ATLAS_BRIEFING_URL).strip()
ATLAS_BRIEFING_SECRET = (os.environ.get("ATLAS_BRIEFING_SECRET") or ATLAS_BRIEFING_SECRET).strip()
JARVIS_WELCOME_PHRASE = os.environ.get("ATLAS_BRIEFING_FALLBACK") or JARVIS_WELCOME_PHRASE
# Clap-detection tuning, overridable from .env.
MIN_RMS = _env_float("MIN_RMS", MIN_RMS)
SPIKE_RATIO = _env_float("SPIKE_RATIO", SPIKE_RATIO)

# Optional live-dashboard hook (server.py sets jarvis.HOOK). Guarded everywhere so
# standalone CLI use has zero behavior change when unset.
HOOK = None


def _hook_block(**kw) -> None:
    h = HOOK
    if h is not None:
        try:
            h.on_block(**kw)
        except Exception:
            pass


def _hook_event(kind: str, **kw) -> None:
    h = HOOK
    if h is not None:
        try:
            h.on_event(kind, **kw)
        except Exception:
            pass


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("clap_listen")


def block_samples() -> int:
    n = int(SAMPLE_RATE * BLOCK_MS / 1000)
    return max(n, 1)


def rms_mono(block: np.ndarray) -> float:
    if block.ndim > 1:
        block = np.mean(block.astype(np.float64), axis=1)
    else:
        block = block.astype(np.float64)
    if block.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(block**2)))


def _input_devices() -> list[tuple[int, dict]]:
    out: list[tuple[int, dict]] = []
    try:
        devices = sd.query_devices()
    except Exception as e:
        log.warning("Could not enumerate audio devices: %s", e)
        return out
    for i, dev in enumerate(devices):
        try:
            if dev["max_input_channels"] >= 1:
                out.append((i, dev))
        except (KeyError, TypeError):
            continue  # skip a device that reports a malformed descriptor
    return out


def _resolve_input_device_index(spec: str) -> int:
    spec = spec.strip()
    if spec.isdigit():
        idx = int(spec)
        sd.query_devices(idx)
        return idx
    needle = spec.lower()
    for idx, dev in _input_devices():
        if needle in dev["name"].lower():
            return idx
    raise ValueError(f"No input device matches {spec!r}")


def _probe_input_max_rms(device: int, blocksize: int) -> float | None:
    try:
        with sd.InputStream(
            device=device,
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype="float32",
            blocksize=blocksize,
        ) as stream:
            peak = 0.0
            deadline = time.monotonic() + INPUT_PROBE_S
            while time.monotonic() < deadline:
                data, _ = stream.read(blocksize)
                peak = max(peak, rms_mono(data))
            return peak
    except sd.PortAudioError:
        return None


def _choose_input_device(blocksize: int) -> int:
    log.info("Audio devices:\n%s", sd.query_devices())

    override = (os.environ.get("JARVIS_INPUT_DEVICE") or "").strip()
    if override:
        try:
            idx = _resolve_input_device_index(override)
        except ValueError as e:
            log.error("%s", e)
            log.error("Set JARVIS_INPUT_DEVICE to a device index or name substring.")
            raise SystemExit(1) from e
        name = sd.query_devices(idx)["name"]
        peak = _probe_input_max_rms(idx, blocksize)
        log.info("Using JARVIS_INPUT_DEVICE [%d]: %s", idx, name)
        if peak is None:
            log.warning("Could not open configured mic; trying anyway.")
        elif peak < INPUT_SILENT_RMS:
            log.warning(
                "Configured mic looks silent (probe rms=%.5f). "
                "Check Windows input level or try another JARVIS_INPUT_DEVICE.",
                peak,
            )
        else:
            log.info("Mic probe OK (rms=%.5f).", peak)
        return idx

    default = sd.default.device[0]
    if default is not None and default >= 0:
        default_name = sd.query_devices(default)["name"]
        peak = _probe_input_max_rms(default, blocksize)
        if peak is not None and peak >= INPUT_SILENT_RMS:
            log.info(
                "Using default microphone [%d]: %s (probe rms=%.5f)",
                default,
                default_name,
                peak,
            )
            return default
        log.warning(
            "Default mic [%d] %s is silent or unavailable (probe rms=%s); "
            "scanning other inputs...",
            default,
            default_name,
            f"{peak:.5f}" if peak is not None else "unopenable",
        )

    best_idx: int | None = None
    best_peak = -1.0
    for idx, dev in _input_devices():
        if default is not None and idx == default:
            continue
        peak = _probe_input_max_rms(idx, blocksize)
        if peak is not None and peak > best_peak:
            best_peak = peak
            best_idx = idx

    if best_idx is not None and best_peak >= INPUT_SILENT_RMS:
        log.info(
            "Auto-selected microphone [%d]: %s (probe rms=%.5f)",
            best_idx,
            sd.query_devices(best_idx)["name"],
            best_peak,
        )
        return best_idx

    if default is not None and default >= 0:
        log.warning("No active mic found; falling back to default [%d].", default)
        return default
    inputs = _input_devices()
    if not inputs:
        log.error("No input devices found.")
        raise SystemExit(1)
    idx, dev = inputs[0]
    log.warning("No active mic found; falling back to [%d] %s.", idx, dev["name"])
    return idx


def _resolve_sample_rate(device: int) -> int:
    """Pick a samplerate the device accepts."""
    def _works(rate: int) -> bool:
        try:
            sd.check_input_settings(
                device=device, samplerate=rate, channels=CHANNELS, dtype="float32"
            )
            return True
        except (sd.PortAudioError, ValueError):
            return False

    override = (os.environ.get("JARVIS_SAMPLE_RATE") or "").strip()
    if override.isdigit():
        r = int(override)
        if _works(r):
            log.info("Using JARVIS_SAMPLE_RATE=%d", r)
            return r
        log.warning("JARVIS_SAMPLE_RATE=%d rejected by device; auto-selecting.", r)

    candidates: list[int] = [SAMPLE_RATE]
    try:
        default_rate = int(round(sd.query_devices(device)["default_samplerate"]))
        candidates.append(default_rate)
    except (KeyError, TypeError, ValueError):
        pass
    candidates.extend((48000, 44100, 32000, 16000))

    seen: set[int] = set()
    for r in candidates:
        if r <= 0 or r in seen:
            continue
        seen.add(r)
        if _works(r):
            if r != SAMPLE_RATE:
                log.info("Sample rate %d rejected; using %d instead.", SAMPLE_RATE, r)
            return r

    log.error("No supported sample rate found for device %d.", device)
    raise SystemExit(1)


def _elevenlabs_pcm_sample_rate(output_format: str) -> int:
    override = (os.environ.get("ELEVENLABS_PCM_SAMPLE_RATE") or "").strip()
    if override.isdigit():
        return int(override)
    if output_format.startswith("pcm_"):
        try:
            return int(output_format.split("_", maxsplit=1)[1])
        except (ValueError, IndexError):
            pass
    return 24000


def elevenlabs_env_config() -> tuple[str, str, str, int]:
    """voice_id, model_id, output_format, pcm_sample_rate."""
    voice = (os.environ.get("ELEVENLABS_VOICE_ID") or "").strip()
    model = (os.environ.get("ELEVENLABS_MODEL_ID") or "eleven_multilingual_v2").strip()
    fmt = (os.environ.get("ELEVENLABS_OUTPUT_FORMAT") or "pcm_24000").strip()
    rate = _elevenlabs_pcm_sample_rate(fmt)
    return voice, model, fmt, rate


def _jarvis_welcome_cache_dir() -> Path:
    base = Path(__file__).resolve().parent
    override = (os.environ.get("JARVIS_WELCOME_CACHE_DIR") or "").strip()
    if override:
        return Path(override).expanduser().resolve()
    return base / ".cache" / "jarvis_welcome"


def _jarvis_welcome_cache_path(
    text: str, voice_id: str, model_id: str, output_format: str
) -> Path:
    key = f"{text}|{voice_id}|{model_id}|{output_format}".encode()
    digest = hashlib.sha256(key).hexdigest()[:24]
    return _jarvis_welcome_cache_dir() / f"{digest}.wav"


def _welcome_output_device() -> int | None:
    """Output device for TTS. JARVIS_OUTPUT_DEVICE (index or name substring), else default."""
    spec = (os.environ.get("JARVIS_OUTPUT_DEVICE") or "").strip()
    if not spec:
        return None
    if spec.isdigit():
        try:
            sd.query_devices(int(spec))
            return int(spec)
        except (sd.PortAudioError, ValueError):
            log.warning("JARVIS_OUTPUT_DEVICE=%s invalid; using default output.", spec)
            return None
    needle = spec.lower()
    for idx, dev in enumerate(sd.query_devices()):
        if dev["max_output_channels"] >= 1 and needle in dev["name"].lower():
            return idx
    log.warning("No output device matches %r; using default output.", spec)
    return None


def _voice_gain() -> float:
    """Linear playback gain for the welcome voice."""
    raw = (os.environ.get("JARVIS_VOICE_GAIN") or "").strip()
    if raw:
        try:
            return max(0.0, min(1.0, float(raw)))
        except ValueError:
            pass
    return JARVIS_VOICE_GAIN


def _play_pcm_float(pcm_f: np.ndarray, rate: int) -> bool:
    gain = _voice_gain()
    if gain != 1.0:
        pcm_f = pcm_f * gain
    try:
        sd.play(pcm_f, rate, device=_welcome_output_device())
        sd.wait()
        return True
    except Exception as e:
        log.warning("Could not play welcome audio: %s", e)
        return False


def _play_pcm_wav_file(path: Path) -> bool:
    try:
        with wave.open(str(path), "rb") as wf:
            ch = wf.getnchannels()
            sw = wf.getsampwidth()
            rate = wf.getframerate()
            if ch != 1 or sw != 2:
                log.warning("Unsupported cached WAV (channels=%s, width=%s).", ch, sw)
                return False
            raw = wf.readframes(wf.getnframes())
    except (OSError, wave.Error) as e:
        log.warning("Could not read cached welcome audio: %s", e)
        return False
    if not raw:
        return False
    pcm_i16 = np.frombuffer(raw, dtype=np.int16)
    pcm_f = pcm_i16.astype(np.float32) / 32768.0
    return _play_pcm_float(pcm_f, rate)


def _save_pcm_wav_file(path: Path, pcm_bytes: bytes, sample_rate: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        with wave.open(str(tmp), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_bytes)
        tmp.replace(path)
    except OSError:
        if tmp.is_file():
            tmp.unlink(missing_ok=True)
        raise


def _say_via_windows_sapi(text: str) -> bool:
    """Speak with the built-in Windows SAPI voice (offline). True on success."""
    if sys.platform != "win32":
        return False
    safe = text.replace("'", "''")
    rate = (os.environ.get("JARVIS_SAPI_RATE") or "0").strip()
    voice = (os.environ.get("JARVIS_SAPI_VOICE") or "").strip()
    select = ""
    if voice:
        vsafe = voice.replace("'", "''")
        select = f"try {{ $s.SelectVoice('{vsafe}') }} catch {{}}; "
    vol = int(round(_voice_gain() * 100))
    ps = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        f"{select}"
        f"try {{ $s.Rate = [int]'{rate}' }} catch {{}}; "
        f"try {{ $s.Volume = [int]'{vol}' }} catch {{}}; "
        f"$s.Speak('{safe}')"
    )
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW,
            timeout=60,
            check=False,
        )
        return True
    except (OSError, subprocess.SubprocessError) as e:
        log.warning("Windows SAPI TTS failed: %s", e)
        return False


def fetch_atlas_briefing() -> str | None:
    """GET the live briefing summary from the dashboard. None if unconfigured/unreachable."""
    if not ATLAS_BRIEFING_URL:
        return None
    try:
        import httpx
    except ImportError:
        log.warning("httpx not installed: pip install -r requirements.txt")
        return None
    headers = {}
    if ATLAS_BRIEFING_SECRET:
        headers["Authorization"] = f"Bearer {ATLAS_BRIEFING_SECRET}"
    try:
        resp = httpx.get(ATLAS_BRIEFING_URL, headers=headers, timeout=ATLAS_BRIEFING_TIMEOUT_S)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        log.warning("Atlas briefing fetch failed: %s", e)
        return None
    spoken = (data.get("spoken") or data.get("summary") or "").strip()
    if not spoken:
        log.warning("Atlas briefing response had no text.")
        return None
    return spoken


def say_jarvis_welcome(text: str | None = None) -> None:
    """Speak the given text, or fetch + speak the live Atlas briefing."""
    if not JARVIS_WELCOME_ENABLED:
        return
    if text is None:
        text = fetch_atlas_briefing() or JARVIS_WELCOME_PHRASE
    text = (text or "").strip()
    if not text:
        return
    # Live briefing text changes daily, so never serve it from cache.
    allow_cache = JARVIS_WELCOME_CACHE_ENABLED and text == JARVIS_WELCOME_PHRASE
    if _say_via_elevenlabs(text, allow_cache=allow_cache):
        return
    log.info("Falling back to Windows built-in TTS.")
    if not _say_via_windows_sapi(text):
        log.warning("No TTS backend available; briefing not spoken.")


def _say_via_elevenlabs(text: str, *, allow_cache: bool = True) -> bool:
    """Try ElevenLabs (cache first when allowed, then API). True only if audio played."""
    if (os.environ.get("JARVIS_TTS_BACKEND") or "").strip().lower() == "sapi":
        return False
    vid, model_id, output_format, pcm_rate = elevenlabs_env_config()
    if not vid:
        log.info("No ELEVENLABS_VOICE_ID set; skipping ElevenLabs.")
        return False

    cache_path = _jarvis_welcome_cache_path(text, vid, model_id, output_format)
    if allow_cache and cache_path.is_file():
        log.info("Playing briefing from cache: %s", cache_path)
        if _play_pcm_wav_file(cache_path):
            return True
        log.warning("Cache miss after read failure; fetching from ElevenLabs.")

    api_key = (os.environ.get("ELEVENLABS_API_KEY") or "").strip()
    if not api_key:
        log.info("No ELEVENLABS_API_KEY set; skipping ElevenLabs.")
        return False
    try:
        from elevenlabs.client import ElevenLabs
    except ImportError:
        log.warning("elevenlabs not installed: pip install -r requirements.txt")
        return False
    try:
        client = ElevenLabs(api_key=api_key)
        chunks = client.text_to_speech.convert(
            voice_id=vid,
            text=text,
            model_id=model_id,
            output_format=output_format,
        )
        raw = b"".join(chunks)
    except Exception as e:
        log.warning("ElevenLabs TTS failed: %s", e)
        return False
    if not raw:
        log.warning("ElevenLabs returned empty audio.")
        return False
    if allow_cache:
        try:
            _save_pcm_wav_file(cache_path, raw, pcm_rate)
            log.info("Saved briefing audio to cache: %s", cache_path)
        except OSError as e:
            log.warning("Could not save briefing cache: %s", e)
    pcm_i16 = np.frombuffer(raw, dtype=np.int16)
    pcm_f = pcm_i16.astype(np.float32) / 32768.0
    return _play_pcm_float(pcm_f, pcm_rate)


def _spotify_force_play_win32() -> None:
    """Optionally nudge Spotify to play after opening the track (OFF by default)."""
    if (os.environ.get("JARVIS_SONG_SEND_PLAY") or "0").strip().lower() not in ("1", "true", "yes"):
        return
    try:
        delay = float((os.environ.get("JARVIS_SONG_PLAY_DELAY_S") or "3.0").strip())
    except ValueError:
        delay = 3.0
    time.sleep(max(0.0, delay))
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    hwnds: list[int] = []

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def _enum(hwnd, _lp):
        if not user32.IsWindowVisible(hwnd):
            return True
        if user32.GetWindowTextLengthW(hwnd) == 0:
            return True
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        h = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid.value)
        if not h:
            return True
        try:
            buf = ctypes.create_unicode_buffer(4096)
            sz = wintypes.DWORD(len(buf))
            if kernel32.QueryFullProcessImageNameW(h, 0, buf, ctypes.byref(sz)):
                if os.path.basename(buf.value).lower() == "spotify.exe":
                    r = wintypes.RECT()
                    user32.GetWindowRect(hwnd, ctypes.byref(r))
                    if (r.right - r.left) > 300 and (r.bottom - r.top) > 200:
                        hwnds.append(int(hwnd))
        finally:
            kernel32.CloseHandle(h)
        return True

    user32.EnumWindows(_enum, 0)
    if hwnds:
        user32.ShowWindow(hwnds[0], 9)  # SW_RESTORE
        user32.SetForegroundWindow(hwnds[0])
        time.sleep(0.4)
    VK_MEDIA_PLAY_PAUSE = 0xB3
    KEYEVENTF_KEYUP = 0x0002
    user32.keybd_event(VK_MEDIA_PLAY_PAUSE, 0, 0, 0)
    user32.keybd_event(VK_MEDIA_PLAY_PAUSE, 0, KEYEVENTF_KEYUP, 0)


def play_song(uri: str) -> None:
    u = uri.strip()
    if not u:
        return
    try:
        if sys.platform == "win32":
            os.startfile(u)
            _spotify_force_play_win32()
        else:
            webbrowser.open(u)
    except OSError as e:
        log.warning("Could not open SONG_URI: %s", e)


def _chrome_executable() -> str | None:
    """Path to Brave (named 'chrome' throughout for historical reasons)."""
    override = (os.environ.get("BRAVE_PATH") or "").strip()
    if override and os.path.isfile(override):
        return override
    if sys.platform == "win32":
        for base in (
            os.environ.get("ProgramFiles", r"C:\Program Files"),
            os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"),
            os.environ.get("LOCALAPPDATA", ""),
        ):
            if not base:
                continue
            p = os.path.join(
                base, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"
            )
            if os.path.isfile(p):
                return p
    return shutil.which("brave") or shutil.which("brave-browser")


def _win32_sorted_monitor_rects() -> list[tuple[int, int, int, int]]:
    """Each monitor as (left, top, right, bottom), sorted left-to-right then top-to-bottom."""
    if sys.platform != "win32":
        return []
    import ctypes
    from ctypes import wintypes

    class RECT(ctypes.Structure):
        _fields_ = [
            ("left", wintypes.LONG),
            ("top", wintypes.LONG),
            ("right", wintypes.LONG),
            ("bottom", wintypes.LONG),
        ]

    collected: list[tuple[int, int, int, int]] = []

    @ctypes.WINFUNCTYPE(
        wintypes.BOOL,
        wintypes.HMONITOR,
        wintypes.HDC,
        ctypes.POINTER(RECT),
        wintypes.LPARAM,
    )
    def _cb(_hm, _hdc, lprc, _lp):
        r = lprc.contents
        collected.append((int(r.left), int(r.top), int(r.right), int(r.bottom)))
        return True

    ctypes.windll.user32.EnumDisplayMonitors(None, None, _cb, 0)
    collected.sort(key=lambda t: (t[0], t[1]))
    return collected


def _chrome_monitor_top_left(one_based_index: int) -> tuple[int, int]:
    l, t, _, _ = _chrome_monitor_bounds(one_based_index)
    return (l, t)


def _chrome_monitor_bounds(one_based_index: int) -> tuple[int, int, int, int]:
    rects = _win32_sorted_monitor_rects()
    if not rects:
        return (0, 0, 1920, 1080)
    idx = one_based_index - 1
    if idx < 0:
        idx = 0
    if idx >= len(rects):
        log.warning(
            "Monitor %d requested but only %d found; using last monitor.",
            one_based_index,
            len(rects),
        )
        idx = len(rects) - 1
    return rects[idx]


def _chrome_monitor_pixel_size(one_based_index: int) -> tuple[int, int]:
    l, t, r, b = _chrome_monitor_bounds(one_based_index)
    return (max(320, r - l), max(240, b - t))


def _chrome_window_size() -> tuple[int, int]:
    w = (os.environ.get("CHROME_WINDOW_WIDTH") or "1400").strip()
    h = (os.environ.get("CHROME_WINDOW_HEIGHT") or "900").strip()
    try:
        return (max(400, int(w)), max(300, int(h)))
    except ValueError:
        return (1400, 900)


def _chrome_site_user_data_dir(site_key: str) -> str:
    p = Path(tempfile.gettempdir()) / "clap-trigger-chrome" / site_key
    p.mkdir(parents=True, exist_ok=True)
    return str(p)


def _chrome_new_window_wait_timeout_s() -> float:
    try:
        return max(3.0, float((os.environ.get("CHROME_NEW_WINDOW_WAIT_S") or "25").strip()))
    except ValueError:
        return 25.0


def _chrome_top_level_browser_hwnds_win32() -> set[int]:
    """HWND ints for visible-or-minimized top-level Brave browser windows."""
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    GW_OWNER = 4
    GWL_EXSTYLE = -20
    WS_EX_TOOLWINDOW = 0x00000080
    found: set[int] = set()

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def _enum(hwnd: wintypes.HWND, _lp: wintypes.LPARAM) -> bool:
        if user32.GetWindow(hwnd, GW_OWNER):
            return True
        if user32.GetWindowLongW(hwnd, GWL_EXSTYLE) & WS_EX_TOOLWINDOW:
            return True
        if not user32.IsWindowVisible(hwnd) and not user32.IsIconic(hwnd):
            return True
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if pid.value == 0:
            return True
        hproc = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid.value)
        if not hproc:
            return True
        try:
            buf = ctypes.create_unicode_buffer(4096)
            sz = wintypes.DWORD(len(buf))
            if not kernel32.QueryFullProcessImageNameW(hproc, 0, buf, ctypes.byref(sz)):
                return True
            exe_path = buf.value
        finally:
            kernel32.CloseHandle(hproc)
        if os.path.basename(exe_path).lower() != "brave.exe":
            return True
        r = wintypes.RECT()
        if not user32.GetWindowRect(hwnd, ctypes.byref(r)):
            return True
        w, h = r.right - r.left, r.bottom - r.top
        if w < 80 or h < 80:
            return True
        found.add(int(hwnd))
        return True

    user32.EnumWindows(_enum, 0)
    return found


def _wait_new_chrome_hwnd_win32(before: set[int], timeout: float) -> int | None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        time.sleep(0.12)
        now = _chrome_top_level_browser_hwnds_win32()
        new = now - before
        if not new:
            continue
        import ctypes
        from ctypes import wintypes

        user32 = ctypes.windll.user32
        best: int | None = None
        best_area = 0
        for h in new:
            r = wintypes.RECT()
            if user32.GetWindowRect(h, ctypes.byref(r)):
                a = max(0, r.right - r.left) * max(0, r.bottom - r.top)
                if a > best_area:
                    best_area = a
                    best = h
        if best is not None:
            return best
    return None


def _chrome_snap_window_to_monitor_win32(
    hwnd: int,
    one_based_monitor: int,
    *,
    fullscreen: bool,
    windowed_size: tuple[int, int] | None,
) -> None:
    import ctypes

    ml, mt, mr, mb = _chrome_monitor_bounds(one_based_monitor)
    user32 = ctypes.windll.user32
    SW_RESTORE = 9
    SW_SHOWMAXIMIZED = 3
    HWND_TOP = 0
    SWP_SHOWWINDOW = 0x0040
    SWP_FRAMECHANGED = 0x0020
    flags = SWP_SHOWWINDOW | SWP_FRAMECHANGED

    user32.ShowWindow(hwnd, SW_RESTORE)
    if fullscreen:
        w, h = mr - ml, mb - mt
        x, y = ml, mt
    else:
        ww, wh = windowed_size or _chrome_window_size()
        w, h = ww, wh
        x = ml + max(0, (mr - ml - w) // 2)
        y = mt + max(0, (mb - mt - h) // 2)
    user32.SetWindowPos(hwnd, HWND_TOP, x, y, w, h, flags)

    if fullscreen:
        user32.ShowWindow(hwnd, SW_SHOWMAXIMIZED)
        KEYEVENTF_KEYUP = 0x0002
        VK_F11 = 0x7A
        fg = user32.GetForegroundWindow()
        tid_tgt = user32.GetWindowThreadProcessId(hwnd, None)
        tid_fg = user32.GetWindowThreadProcessId(fg, None) if fg else 0
        if tid_fg and tid_tgt:
            user32.AttachThreadInput(tid_fg, tid_tgt, True)
        user32.SetForegroundWindow(hwnd)
        if tid_fg and tid_tgt:
            user32.AttachThreadInput(tid_fg, tid_tgt, False)
        user32.keybd_event(VK_F11, 0, 0, 0)
        user32.keybd_event(VK_F11, 0, KEYEVENTF_KEYUP, 0)


def _open_url_in_chrome(
    url: str,
    *,
    new_window: bool = True,
    label: str = "URL",
    window_position: tuple[int, int] | None = None,
    window_size: tuple[int, int] | None = None,
    fullscreen: bool = False,
    win32_post_fullscreen_monitor: int | None = None,
    user_data_dir: str | None = None,
) -> None:
    u = url.strip()
    if not u:
        return
    chrome = _chrome_executable()
    try:
        if chrome:
            args = [chrome]
            if user_data_dir:
                args.append(f"--user-data-dir={user_data_dir}")
                args.append("--no-first-run")
            if new_window:
                args.append("--new-window")
            if window_position is not None:
                x, y = window_position
                args.append(f"--window-position={x},{y}")
            if window_size:
                args.append(f"--window-size={window_size[0]},{window_size[1]}")
            if fullscreen and not (
                sys.platform == "win32" and win32_post_fullscreen_monitor is not None
            ):
                args.append("--start-fullscreen")
            args.append(u)
            popen_kw: dict = {
                "args": args,
                "stdin": subprocess.DEVNULL,
                "stdout": subprocess.DEVNULL,
                "stderr": subprocess.DEVNULL,
            }
            if sys.platform == "win32":
                popen_kw["creationflags"] = subprocess.CREATE_NO_WINDOW
            before: set[int] | None = None
            if sys.platform == "win32" and win32_post_fullscreen_monitor is not None:
                before = _chrome_top_level_browser_hwnds_win32()
            subprocess.Popen(**popen_kw)
            if sys.platform == "win32" and win32_post_fullscreen_monitor is not None:
                mon = win32_post_fullscreen_monitor
                hwnd = _wait_new_chrome_hwnd_win32(before, _chrome_new_window_wait_timeout_s())
                if hwnd is not None:
                    _chrome_snap_window_to_monitor_win32(
                        hwnd,
                        mon,
                        fullscreen=fullscreen,
                        windowed_size=window_size if not fullscreen else None,
                    )
                else:
                    log.warning(
                        "Chrome: timed out waiting for new window (%s); check "
                        "CHROME_NEW_WINDOW_WAIT_S or close extra Chrome instances.",
                        label,
                    )
        else:
            log.warning("Chrome not found; opening %s in default browser.", label)
            webbrowser.open(u)
    except OSError as e:
        log.warning("Could not open %s in Chrome: %s", label, e)


def open_traction_site_in_chrome() -> None:
    if not OPEN_TRACTION_SITE_IN_CHROME:
        return
    url = (os.environ.get("TRACTION_SITE_URL") or "http://localhost:5173/").strip()
    pos: tuple[int, int] | None = None
    size: tuple[int, int] | None = None
    fs = OPEN_CHROME_FULLSCREEN
    post_mon: int | None = None
    user_data: str | None = None
    if sys.platform == "win32":
        post_mon = TRACTION_CHROME_MONITOR
        pos = _chrome_monitor_top_left(TRACTION_CHROME_MONITOR)
        if fs:
            size = _chrome_monitor_pixel_size(TRACTION_CHROME_MONITOR)
        else:
            size = _chrome_window_size()
        if CHROME_SEPARATE_SITE_PROFILES:
            user_data = _chrome_site_user_data_dir("traction")
    elif not fs:
        size = _chrome_window_size()
    else:
        size = None
    _open_url_in_chrome(
        url,
        new_window=True,
        label="Traction site",
        window_position=pos,
        window_size=size,
        fullscreen=fs,
        win32_post_fullscreen_monitor=post_mon,
        user_data_dir=user_data,
    )


def open_tradingview_app() -> None:
    """Launch the TradingView desktop app (Microsoft Store / UWP) on Windows."""
    if not OPEN_TRADINGVIEW_APP:
        return
    app_id = (
        os.environ.get("TRADINGVIEW_APP_ID")
        or "31178TradingViewInc.TradingView_q4jpyh43s5mv6!TradingView.Desktop"
    ).strip()
    if sys.platform != "win32":
        log.warning("TradingView app launch is Windows-only; skipping.")
        return
    try:
        subprocess.Popen(
            ["explorer.exe", f"shell:AppsFolder\\{app_id}"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except OSError as e:
        log.warning("Could not launch TradingView app: %s", e)


def run_double_clap_actions() -> None:
    """Run outside the mic loop so sleeps do not stall capture."""
    play_song(SONG_URI)
    open_traction_site_in_chrome()
    open_tradingview_app()
    if JARVIS_WELCOME_ENABLED:
        delay = max(0.0, JARVIS_AFTER_SONG_DELAY_S)
        if delay:
            time.sleep(delay)
        # text=None → fetch + speak the LIVE Atlas briefing.
        threading.Thread(target=say_jarvis_welcome, daemon=True).start()


def main() -> int:
    global SAMPLE_RATE
    blocksize = block_samples()
    noise_floor = 1e-4
    last_logged_double = 0.0
    first_clap_time: float | None = None
    spike_armed = True
    welcome_sequence_done = False

    log.info(
        "Listening (double clap: %.2f-%.2fs apart, rate=%d, block=%d ms, "
        "spike_ratio=%.1f, cooldown=%.2fs). Ctrl+C to stop.",
        MIN_DOUBLE_GAP_S,
        MAX_DOUBLE_GAP_S,
        SAMPLE_RATE,
        BLOCK_MS,
        SPIKE_RATIO,
        COOLDOWN_S,
    )
    if SONG_URI.strip():
        log.info("Double clap opens this track: %s", SONG_URI.strip())
    if OPEN_TRACTION_SITE_IN_CHROME:
        tu = (os.environ.get("TRACTION_SITE_URL") or "http://localhost:5173/").strip()
        log.info("After Spotify, open site in Brave on monitor %d: %s", TRACTION_CHROME_MONITOR, tu)
    if OPEN_TRADINGVIEW_APP:
        log.info("Double clap will launch the TradingView desktop app.")
    if JARVIS_WELCOME_ENABLED:
        ev, em, ef, er = elevenlabs_env_config()
        log.info(
            "After song + %.2fs: speak live Atlas briefing (ElevenLabs voice=%s, model=%s, format=%s, pcm_rate=%d)",
            JARVIS_AFTER_SONG_DELAY_S,
            ev or "(unset -> Windows SAPI)",
            em,
            ef,
            er,
        )
        if ATLAS_BRIEFING_URL:
            log.info("Briefing source: %s", ATLAS_BRIEFING_URL)
        else:
            log.info("ATLAS_BRIEFING_URL unset -> speaking fallback phrase %r.", JARVIS_WELCOME_PHRASE)

    input_idx = _choose_input_device(blocksize)

    SAMPLE_RATE = _resolve_sample_rate(input_idx)
    blocksize = block_samples()

    try:
        _dev_name = sd.query_devices(input_idx)["name"]
    except Exception:
        _dev_name = f"device {input_idx}"
    _hook_event(
        "session",
        device_index=input_idx,
        device_name=_dev_name,
        sample_rate=SAMPLE_RATE,
        block_ms=BLOCK_MS,
        song_uri=SONG_URI,
    )

    selftest = (os.environ.get("JARVIS_WELCOME_SELFTEST") or str(JARVIS_WELCOME_SELFTEST))
    if JARVIS_WELCOME_ENABLED and selftest.strip().lower() not in ("0", "false", "no"):
        log.info("Welcome self-test: speaking a short line (set JARVIS_WELCOME_SELFTEST=0 to skip).")
        say_jarvis_welcome("Atlas online.")

    try:
        window_raw = (os.environ.get("JARVIS_LISTEN_WINDOW_S") or "").strip()
        try:
            window_s = float(window_raw) if window_raw else LISTEN_WINDOW_S
        except ValueError:
            window_s = LISTEN_WINDOW_S
        deadline = time.monotonic() + window_s if window_s > 0 else None
        if deadline is not None:
            log.info(
                "Listening for %.0fs then releasing the mic "
                "(set JARVIS_LISTEN_WINDOW_S=0 to listen continuously).",
                window_s,
            )
        saf_raw = (os.environ.get("JARVIS_STOP_AFTER_FIRE") or "").strip().lower()
        if saf_raw in ("0", "false", "no"):
            stop_after_fire = False
        elif saf_raw in ("1", "true", "yes"):
            stop_after_fire = True
        else:
            stop_after_fire = STOP_AFTER_FIRE
        if stop_after_fire:
            log.info("Mic stays live until the ritual fires, then releases (BT returns to A2DP).")

        with sd.InputStream(
            device=input_idx,
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype="float32",
            blocksize=blocksize,
        ) as stream:
            while True:
                if HOOK is not None and HOOK.should_stop():
                    log.info("Stop requested via dashboard.")
                    break
                if deadline is not None and time.monotonic() >= deadline:
                    log.info("Listen window elapsed - closing mic.")
                    _hook_event("listen_window_closed")
                    break
                data, overflowed = stream.read(blocksize)
                if overflowed:
                    log.warning("Input overflow; try a larger BLOCK_MS")
                    _hook_event("overflow")

                level = rms_mono(data)

                quiet_gate = noise_floor * QUIET_GATE_MULT
                if level < quiet_gate:
                    noise_floor = NOISE_FLOOR_ALPHA * noise_floor + (
                        1.0 - NOISE_FLOOR_ALPHA
                    ) * level
                    noise_floor = max(noise_floor, 1e-7)

                threshold = max(noise_floor * SPIKE_RATIO, MIN_RMS)
                now = time.monotonic()
                retrigger_level = threshold * RETRIGGER_RATIO

                if level < retrigger_level:
                    spike_armed = True

                if HOOK is not None and HOOK.consume_rearm():
                    welcome_sequence_done = False

                _hook_block(
                    level=level,
                    noise_floor=noise_floor,
                    threshold=threshold,
                    armed=spike_armed,
                    awaiting_second=first_clap_time is not None,
                    fired=welcome_sequence_done,
                )

                if (
                    spike_armed
                    and level >= threshold
                    and (now - last_logged_double) >= COOLDOWN_S
                ):
                    spike_armed = False
                    # Debug: every spike that clears the gate. Compare a desk tap's rms
                    # vs a real clap's, then set MIN_RMS between them. Silence via
                    # JARVIS_LOG_SPIKES=0.
                    if (os.environ.get("JARVIS_LOG_SPIKES") or "1").strip().lower() not in ("0", "false", "no"):
                        log.info("spike rms=%.5f (threshold=%.5f, floor=%.5f)", level, threshold, noise_floor)
                    if first_clap_time is None:
                        first_clap_time = now
                        _hook_event("clap", ordinal=1, level=level)
                    else:
                        gap = now - first_clap_time
                        if gap < MIN_DOUBLE_GAP_S:
                            pass
                        elif gap <= MAX_DOUBLE_GAP_S:
                            first_clap_time = None
                            last_logged_double = now
                            _hook_event(
                                "double_clap",
                                gap=gap,
                                level=level,
                                noise_floor=noise_floor,
                                threshold=threshold,
                            )
                            if not welcome_sequence_done:
                                welcome_sequence_done = True
                                log.info(
                                    "Double clap detected (gap=%.3fs, rms=%.5f, "
                                    "noise_floor=%.5f, threshold=%.5f) - running ritual once",
                                    gap,
                                    level,
                                    noise_floor,
                                    threshold,
                                )
                                _hook_event("ritual_fired", gap=gap)
                                threading.Thread(
                                    target=run_double_clap_actions, daemon=True
                                ).start()
                                if stop_after_fire:
                                    log.info(
                                        "Ritual fired - releasing the mic "
                                        "(set JARVIS_STOP_AFTER_FIRE=0 to keep listening)."
                                    )
                                    _hook_event("listen_window_closed", reason="fired")
                                    break
                            else:
                                _hook_event("double_clap_ignored_gate")
                        else:
                            first_clap_time = now
                            _hook_event("clap", ordinal=1, level=level)

    except KeyboardInterrupt:
        log.info("Stopped.")
        return 0
    except sd.PortAudioError as e:
        log.error("Audio error: %s", e)
        log.error("If PortAudio fails, install/repair drivers or try another SAMPLE_RATE.")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
