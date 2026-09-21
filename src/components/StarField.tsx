import { useEffect, useRef } from 'react'

type Cleanup = () => void

/**
 * 全站深空星野：GPU 粒子星系（旋臂星盘 + 锚点星流 + 闪烁星野 + 指针视差，
 * 引擎见 src/game/core/particles.ts）。WebGL 不可用时回退 2D Canvas 星野；
 * prefers-reduced-motion 渲染单帧静星，不做逐帧运动。
 */
export function StarField() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current
    if (!host) return
    let disposed = false
    let cleanup: Cleanup | null = null
    void mountGalaxy(host).then(result => {
      if (disposed) {
        result?.()
        return
      }
      cleanup = result ?? mountFallback(host)
    })
    return () => {
      disposed = true
      cleanup?.()
      cleanup = null
    }
  }, [])
  return <div ref={ref} className="starfield-host" aria-hidden="true" />
}

/** PixiJS GPU 星系挂载；任何一步失败返回 null，由调用方落到 2D 回退。 */
async function mountGalaxy(host: HTMLDivElement): Promise<Cleanup | null> {
  let app: import('pixi.js').Application | null = null
  try {
    const [{ Application }, { ParticleGalaxy, isLowPowerDevice }] = await Promise.all([
      import('pixi.js'),
      import('@/game/core/particles'),
    ])
    const lowPower = isLowPowerDevice()
    const resolution = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2)
    app = new Application()
    try {
      await app.init({
        resizeTo: window,
        backgroundAlpha: 0,
        antialias: false,
        preference: 'webgl',
        resolution,
        autoDensity: true,
      })
    } catch {
      app.destroy(true, { children: true })
      app = null
      return null
    }
    app.canvas.className = 'starfield'
    host.appendChild(app.canvas)
    const galaxy = new ParticleGalaxy({
      app,
      width: window.innerWidth,
      height: window.innerHeight,
      pixelScale: resolution,
      seed: 20260214,
      coreFrac: { x: 0.5, y: 0.44 },
      ambient: 0.6,
    })
    app.stage.addChild(galaxy.container)
    if (galaxy.reduced) {
      // 静态帧已渲染，停掉渲染循环避免空转。
      app.ticker.stop()
    }
    const onResize = () => {
      galaxy.resize({ width: window.innerWidth, height: window.innerHeight, pixelScale: resolution })
      if (galaxy.reduced) galaxy.renderStatic()
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      galaxy.destroy()
      app?.destroy(true, { children: true })
      app = null
    }
  } catch {
    app?.destroy(true, { children: true })
    return null
  }
}

/** 2D Canvas 回退星野：闪烁恒星 + 低频流星（动效路径）。 */
function mountFallback(host: HTMLDivElement): Cleanup {
  const canvas = document.createElement('canvas')
  canvas.className = 'starfield'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  host.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let width = 0
  let height = 0
  const stars = Array.from({ length: 150 }, () => ({ x: 0, y: 0, r: 0.4 + Math.random() * 1.3, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 1.2 }))
  let comets: { x: number; y: number; vx: number; vy: number; life: number }[] = []
  const resize = () => {
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    for (const star of stars) {
      if (star.x === 0 && star.y === 0) {
        star.x = Math.random() * width
        star.y = Math.random() * height
      }
    }
    if (reduced) drawFrame(1.2)
  }
  const drawFrame = (t: number) => {
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    for (const star of stars) {
      const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase))
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(217, 227, 243, ${twinkle.toFixed(3)})`
      ctx.fill()
    }
    if (reduced) return
    if (Math.random() < 0.006 && comets.length < 2) comets.push({ x: Math.random() * width * 0.7, y: Math.random() * height * 0.3, vx: 6 + Math.random() * 4, vy: 2 + Math.random() * 2, life: 1 })
    comets = comets.filter(comet => comet.life > 0)
    for (const comet of comets) {
      comet.x += comet.vx
      comet.y += comet.vy
      comet.life -= 0.012
      ctx.beginPath()
      ctx.moveTo(comet.x, comet.y)
      ctx.lineTo(comet.x - comet.vx * 6, comet.y - comet.vy * 6)
      ctx.strokeStyle = `rgba(228, 170, 33, ${(comet.life * 0.8).toFixed(3)})`
      ctx.lineWidth = 1.4
      ctx.stroke()
    }
  }
  let raf = 0
  let t = 0
  const onFrame = () => {
    t += 0.016
    drawFrame(t)
    raf = requestAnimationFrame(onFrame)
  }
  resize()
  window.addEventListener('resize', resize)
  if (!reduced) raf = requestAnimationFrame(onFrame)
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    canvas.remove()
  }
}
