#!/usr/bin/env python3
"""
JARVIS Console backend for the admin dashboard.

Runs the clap listener (jarvis.py) in a background thread with a live hook and
serves a small FastAPI app the dashboard can talk to:

  GET  /api/state         — snapshot (session info, latest telemetry, flags)
  GET  /api/config        — current editable config
  POST /api/config        — patch config; applied at runtime
  POST /api/actions/fire  — run the double-clap ritual now (test button)
  POST /api/actions/rearm — re-arm the once-per-process briefing gate
  POST /api/actions/say   — speak an arbitrary line (voice check)
  POST /api/actions/brief — fetch + speak the live Atlas briefing now
  WS   /ws                — pushes {type:"block"|"event", ...} in real time

Run:
  python server.py            # serves http://127.0.0.1:8756 (listener starts too)
"""

from __future__ import annotations

import asyncio
import threading
import time
from collections import deque
from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import jarvis

HOST = "127.0.0.1"
PORT = 8756


# --- listener hook: bridges the mic loop to async websocket clients ----------
class ListenerHook:
    """Thread-safe sink the jarvis mic loop calls. Fans telemetry out to clients."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._rearm = threading.Event()
        self.session: dict[str, Any] = {}
        self.last_block: dict[str, Any] = {}
        self.events: deque[dict[str, Any]] = deque(maxlen=200)
        self.started_at = time.time()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._clients: set[asyncio.Queue] = set()
        self._last_push = 0.0
        self._push_every = 0.05

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    # -- control surface the loop polls --
    def should_stop(self) -> bool:
        return self._stop.is_set()

    def request_stop(self) -> None:
        self._stop.set()

    def rearm_welcome(self) -> None:
        self._rearm.set()

    def consume_rearm(self) -> bool:
        if self._rearm.is_set():
            self._rearm.clear()
            return True
        return False

    # -- telemetry in (called from mic thread) --
    def on_block(self, **kw: Any) -> None:
        with self._lock:
            self.last_block = kw
        now = time.monotonic()
        if now - self._last_push >= self._push_every:
            self._last_push = now
            self._broadcast({"type": "block", **kw})

    def on_event(self, kind: str, **kw: Any) -> None:
        rec = {"kind": kind, "t": time.time(), **kw}
        with self._lock:
            if kind == "session":
                self.session = kw
            self.events.append(rec)
        self._broadcast({"type": "event", **rec})

    # -- fan-out --
    def _broadcast(self, msg: dict[str, Any]) -> None:
        loop = self._loop
        if loop is None:
            return
        for q in list(self._clients):
            try:
                loop.call_soon_threadsafe(q.put_nowait, msg)
            except RuntimeError:
                pass

    def add_client(self, q: asyncio.Queue) -> None:
        self._clients.add(q)

    def remove_client(self, q: asyncio.Queue) -> None:
        self._clients.discard(q)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "session": dict(self.session),
                "last_block": dict(self.last_block),
                "events": list(self.events)[-40:],
                "uptime_s": round(time.time() - self.started_at, 1),
                "stopped": self._stop.is_set(),
            }


hook = ListenerHook()


# --- config: editable knobs surfaced to the UI -------------------------------
CONFIG_FIELDS: list[dict[str, Any]] = [
    {"key": "SONG_URI", "label": "Spotify track", "kind": "url", "group": "ritual"},
    {"key": "JARVIS_SONG_VOLUME", "label": "Song volume (0..1)", "kind": "float", "group": "ritual"},
    {"key": "OPEN_TRACTION_SITE_IN_CHROME", "label": "Open dashboard in Brave", "kind": "bool", "group": "ritual"},
    {"key": "OPEN_TRADINGVIEW_APP", "label": "Open TradingView app", "kind": "bool", "group": "ritual"},
    {"key": "TRACTION_CHROME_MONITOR", "label": "Brave monitor", "kind": "int", "group": "ritual"},
    {"key": "JARVIS_WELCOME_ENABLED", "label": "Speak briefing", "kind": "bool", "group": "voice"},
    {"key": "JARVIS_AFTER_SONG_DELAY_S", "label": "Delay before speak (s)", "kind": "float", "group": "voice"},
    {"key": "JARVIS_VOICE_GAIN", "label": "Voice volume", "kind": "float", "group": "voice"},
    {"key": "SPIKE_RATIO", "label": "Spike ratio", "kind": "float", "group": "tuning"},
    {"key": "COOLDOWN_S", "label": "Cooldown (s)", "kind": "float", "group": "tuning"},
    {"key": "MIN_DOUBLE_GAP_S", "label": "Min clap gap (s)", "kind": "float", "group": "tuning"},
    {"key": "MAX_DOUBLE_GAP_S", "label": "Max clap gap (s)", "kind": "float", "group": "tuning"},
    {"key": "MIN_RMS", "label": "Min RMS floor", "kind": "float", "group": "tuning"},
]
_FIELD_BY_KEY = {f["key"]: f for f in CONFIG_FIELDS}


def _coerce(kind: str, value: Any) -> Any:
    if kind == "bool":
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in ("1", "true", "yes", "on")
    if kind == "int":
        return int(value)
    if kind == "float":
        return float(value)
    return str(value)


def read_config() -> list[dict[str, Any]]:
    return [{**f, "value": getattr(jarvis, f["key"], None)} for f in CONFIG_FIELDS]


def apply_config(patch: dict[str, Any]) -> dict[str, Any]:
    applied: dict[str, Any] = {}
    for key, raw in patch.items():
        f = _FIELD_BY_KEY.get(key)
        if not f:
            continue
        val = _coerce(f["kind"], raw)
        setattr(jarvis, key, val)  # live-apply on the module the loop reads
        applied[key] = val
    return applied


# --- FastAPI app -------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    hook.bind_loop(asyncio.get_running_loop())
    threading.Thread(target=_run_listener, name="jarvis-listener", daemon=True).start()
    yield


app = FastAPI(title="JARVIS Console", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConfigPatch(BaseModel):
    patch: dict[str, Any]


class SayBody(BaseModel):
    text: str


@app.get("/api/state")
def api_state() -> dict[str, Any]:
    return hook.snapshot()


@app.get("/api/config")
def api_config() -> dict[str, Any]:
    return {"fields": read_config()}


@app.post("/api/config")
def api_config_set(body: ConfigPatch) -> dict[str, Any]:
    return {"applied": apply_config(body.patch)}


@app.post("/api/actions/fire")
def api_fire() -> dict[str, str]:
    threading.Thread(target=jarvis.run_double_clap_actions, daemon=True).start()
    return {"status": "firing"}


@app.post("/api/actions/rearm")
def api_rearm() -> dict[str, str]:
    hook.rearm_welcome()
    return {"status": "rearmed"}


@app.post("/api/actions/say")
def api_say(body: SayBody) -> dict[str, str]:
    text = body.text.strip() or "Test."
    threading.Thread(target=jarvis.say_jarvis_welcome, args=(text,), daemon=True).start()
    return {"status": "speaking"}


@app.post("/api/actions/brief")
def api_brief() -> dict[str, str]:
    # text=None → fetch + speak the live Atlas briefing.
    threading.Thread(target=jarvis.say_jarvis_welcome, daemon=True).start()
    return {"status": "briefing"}


@app.websocket("/ws")
async def ws(websocket: WebSocket) -> None:
    await websocket.accept()
    q: asyncio.Queue = asyncio.Queue(maxsize=256)
    hook.add_client(q)
    await websocket.send_json({"type": "snapshot", **hook.snapshot()})
    try:
        while True:
            msg = await q.get()
            await websocket.send_json(msg)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        hook.remove_client(q)


# --- listener thread ---------------------------------------------------------
def _run_listener() -> None:
    jarvis.HOOK = hook
    try:
        jarvis.main()
    except Exception as e:  # keep server alive if the loop dies
        jarvis.log.error("Listener thread exited: %s", e)


def main() -> None:
    import socket

    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        probe.bind((HOST, PORT))
    except OSError:
        print(
            f"Port {PORT} is already in use - another JARVIS Console is likely "
            f"running. Close it (or `taskkill /IM python.exe`) and retry."
        )
        raise SystemExit(1)
    finally:
        probe.close()

    print(f"JARVIS Console -> http://{HOST}:{PORT}")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")


if __name__ == "__main__":
    main()
