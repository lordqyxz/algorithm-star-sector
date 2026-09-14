import { useEffect, useRef } from 'react'

/** 全站深空星野：闪烁恒星 + 低频流星（纯表现粒子，不影响交互）。 */
export function StarField() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const stars = Array.from({ length: 150 }, () => ({ x: Math.random() * width, y: Math.random() * height, r: 0.4 + Math.random() * 1.3, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 1.2 }))
    let comets: { x: number; y: number; vx: number; vy: number; life: number }[] = []
    let raf = 0
    let t = 0
    const onFrame = () => {
      t += 0.016
      ctx.clearRect(0, 0, width, height)
      for (const star of stars) {
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase))
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(217, 227, 243, ${twinkle.toFixed(3)})`
        ctx.fill()
      }
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
      raf = requestAnimationFrame(onFrame)
    }
    raf = requestAnimationFrame(onFrame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="starfield" aria-hidden="true" />
}
