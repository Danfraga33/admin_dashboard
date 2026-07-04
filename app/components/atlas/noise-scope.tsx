import { useEffect, useRef, useState } from 'react'
import { useMounted } from './motion'

/**
 * Thin live noise-activity strip for the Daily Update, ported from the
 * jarvis-clap console scope. Reads the local clap sidecar's WebSocket
 * (127.0.0.1:8756) and paints a rolling RMS trace with the clap threshold line;
 * flashes gold on a double-clap strike.
 *
 * The sidecar is a LOCAL-ONLY process — it isn't reachable in prod or from
 * another machine. When it's down the strip shows a dim "offline" state and
 * keeps retrying quietly, so this never breaks the page.
 */

const SIDECAR_WS = 'ws://127.0.0.1:8756/ws'
const HISTORY = 160 // scope columns (thin row → fewer than the full console)
const CEIL = 0.08 // RMS→height ceiling; sqrt curve lifts quiet room noise into view

type Block = { level: number; threshold: number; armed: boolean }

function norm(v: number) {
  return Math.min(1, Math.sqrt(Math.max(0, v) / CEIL))
}

export function NoiseScope({ className }: { className?: string }) {
  const mounted = useMounted() // WS is client-only; skip on SSR
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const histRef = useRef(new Float32Array(HISTORY))
  const blockRef = useRef<Block>({ level: 0, threshold: 0.05, armed: true })
  const strikeRef = useRef(0)
  const [connected, setConnected] = useState(false)

  // --- WebSocket to the sidecar ---
  useEffect(() => {
    if (!mounted) return
    let alive = true
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout>

    const connect = () => {
      try {
        ws = new WebSocket(SIDECAR_WS)
      } catch {
        retry = setTimeout(connect, 2000)
        return
      }
      ws.onopen = () => alive && setConnected(true)
      ws.onclose = () => {
        if (!alive) return
        setConnected(false)
        retry = setTimeout(connect, 2000)
      }
      ws.onerror = () => ws?.close()
      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        if (msg.type === 'block') {
          const h = histRef.current
          h.copyWithin(0, 1)
          h[HISTORY - 1] = Number(msg.level) || 0
          blockRef.current = {
            level: Number(msg.level) || 0,
            threshold: Number(msg.threshold) || blockRef.current.threshold,
            armed: msg.armed !== false,
          }
        } else if (msg.type === 'event' && msg.kind === 'double_clap') {
          strikeRef.current = performance.now()
        }
      }
    }
    connect()
    return () => {
      alive = false
      clearTimeout(retry)
      ws?.close()
    }
  }, [mounted])

  // --- draw loop ---
  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const pad = 4
      const base = h - pad
      const span = h - pad * 2
      const hist = histRef.current
      const n = hist.length
      const colW = w / n
      const b = blockRef.current
      const armed = b.armed

      // strike flash: gold wash fading over ~500ms
      const since = performance.now() - strikeRef.current
      if (strikeRef.current && since < 520) {
        ctx.fillStyle = `rgba(245, 192, 68, ${(1 - since / 520) * 0.18})`
        ctx.fillRect(0, 0, w, h)
      }

      // threshold line (dashed)
      const ty = base - norm(b.threshold) * span
      ctx.strokeStyle = 'rgba(245, 192, 68, 0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0, ty)
      ctx.lineTo(w, ty)
      ctx.stroke()
      ctx.setLineDash([])

      const stroke = armed ? '#4ade80' : '#7d8996'

      // filled RMS area
      ctx.beginPath()
      ctx.moveTo(0, base)
      for (let i = 0; i < n; i++) ctx.lineTo(i * colW, base - norm(hist[i]) * span)
      ctx.lineTo(w, base)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, pad, 0, base)
      grad.addColorStop(0, armed ? 'rgba(74,222,128,0.26)' : 'rgba(125,137,150,0.16)')
      grad.addColorStop(1, 'rgba(74,222,128,0.02)')
      ctx.fillStyle = grad
      ctx.fill()

      // RMS trace
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const x = i * colW
        const y = base - norm(hist[i]) * span
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1.25
      ctx.shadowColor = armed ? 'rgba(74,222,128,0.5)' : 'transparent'
      ctx.shadowBlur = armed ? 5 : 0
      ctx.stroke()
      ctx.shadowBlur = 0

      // leading-edge dot
      ctx.fillStyle = stroke
      ctx.beginPath()
      ctx.arc((n - 1) * colW, base - norm(hist[n - 1]) * span, 2, 0, Math.PI * 2)
      ctx.fill()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [mounted])

  return (
    <div className={className}>
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card/40 px-3 py-1.5">
        <span
          className={
            'inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest ' +
            (connected ? 'text-chart-1' : 'text-muted-foreground')
          }
        >
          <span
            className={
              'size-1.5 rounded-full ' +
              (connected ? 'bg-chart-1 animate-pulse' : 'bg-muted-foreground/40')
            }
          />
          {connected ? 'Listening' : 'Mic idle'}
        </span>
        <canvas ref={canvasRef} className="h-7 flex-1" />
      </div>
    </div>
  )
}
