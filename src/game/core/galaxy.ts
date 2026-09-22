import { Application, Container, Geometry, Graphics, Mesh, Shader, Sprite, Text, Texture, UniformGroup } from 'pixi.js'
import type { Ticker } from 'pixi.js'
import { mulberry32 } from './ui'

/**
 * 轨道星系引擎（关卡星图专用，参考 stepfun《foundation-model galaxy》封面特效移植到 PixiJS 8，
 * 并适配站点深空词表：冷蓝尘埃 + 暖金亮星 + 奖章色轨道）。
 *
 * 两层结构，与参考实现同构：
 *   GL 尘埃盘 —— 每粒子只带 1 个 seed，全部运动在顶点着色器里算：对数分布轨道半径、
 *     差速自转（内圈更快）、双旋臂调制、三次方厚度衰减、21° 倾斜 + 透视投影（focal 2.8）。
 *   2D 舰队层 —— 每个航段一条倾斜椭圆轨道环（按深度分近/远两段描边）、行星节点
 *     （大小 = 奖章等级、色 = 奖章色、沿轨道差速运行）、彗尾航迹、脉动星核、
 *     对数距离刻度轴（光年）。
 *
 * 可交互节点位置经 onNodes 每帧回调交回 React（外壳只负责无障碍按钮与标签，
 * 不持有游戏状态）。prefers-reduced-motion 渲染单帧静星系。
 */

const TAU = Math.PI * 2
const RAD = Math.PI / 180
const PITCH = 21 * RAD
const ROLL = -5 * RAD
const FOCAL = 2.8
const SINP = Math.sin(PITCH)
const COSP = Math.cos(PITCH)
const COSR = Math.cos(ROLL)
const SINR = Math.sin(ROLL)
const GOLD = 2.39996323

export type GalaxyTone = 'gold' | 'silver' | 'bronze' | 'locked'

export interface GalaxyNodeSpec {
  id: string
  /** 轨道半径占比 0..1（0 = 内圈 R0，1 = 外圈 R1）。 */
  radiusFrac: number
  tone: GalaxyTone
  /** 成色等级 0..3，决定行星大小。 */
  tier: number
}

export interface GalaxyNodePos {
  id: string
  x: number
  y: number
}

export interface OrbitGalaxyOptions {
  app: Application
  width: number
  height: number
  pixelScale: number
  seed?: number
  nodes: readonly GalaxyNodeSpec[]
  /** 每帧回传星核 + 各行星的投影坐标（含 id 'hub'），供外壳定位可交互按钮。 */
  onNodes?: (positions: readonly GalaxyNodePos[]) => void
  ambient?: number
  /** 距离刻度（占比 + 标签，如 25 ly），与节点同一半径映射。 */
  ticks?: readonly { frac: number; label: string }[]
}

interface NodeRuntime extends GalaxyNodeSpec {
  ph: number
  inc: number
  node: number
  rr: number
  omega: number
  /** 当前轨道角（逐帧积分，悬停时缓动减速便于点击）。 */
  a: number
  speedK: number
}

interface Proj {
  x: number
  y: number
  k: number
  d: number
}

const TONE_COLOR: Record<GalaxyTone, number> = {
  gold: 0xe4aa21,
  silver: 0xd9e0ea,
  bronze: 0xe0a979,
  locked: 0x5a6c88,
}

const DUST_VERTEX = /* glsl */ `
  in float aSeed;

  uniform mat3 uProjectionMatrix;
  uniform mat3 uWorldTransformMatrix;
  uniform mat3 uTransformMatrix;

  uniform float uTime;
  uniform float uFade;
  uniform float uPixelScale;
  uniform float uAmbient;
  uniform vec2 uCen;
  uniform vec2 uCam;
  uniform vec2 uRot;
  uniform vec2 uGeo;

  out float vA;
  out float vT;
  out float vR;
  out float vK;

  const float TAU = 6.28318530718;

  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

  void main() {
    float s = aSeed;
    float R1 = uGeo.x;
    float a0 = hash(s * 1.9) * TAU;
    float u = hash(s * 3.7);
    float rn = 0.16 + pow(u, 1.45) * 2.75;
    float w = 0.15 / pow(max(0.20, rn), 0.85);
    float a = a0 + uTime * w;
    float arm = sin(a * 2.0 + rn * 4.2 + s * 3.0);
    float lane = sin(a * 3.0 - rn * 1.8 + 1.7);
    float rr = (rn + arm * 0.075 + sin(a * 6.0 + s * 11.0) * 0.022) * R1;
    float hz = hash(s * 7.3) * 2.0 - 1.0;
    hz = hz * hz * hz;
    float thick = R1 * 0.115 * (0.34 + 1.1 * exp(-rr / (0.5 * R1)));
    float wy = hz * thick + sin(uTime * 0.30 + s * 29.0) * R1 * 0.006;
    float wx = cos(a) * rr;
    float wz = sin(a) * rr;
    float sy = -(wz * uCam.x + wy * uCam.y);
    float d = wz * uCam.y - wy * uCam.x;
    float f = uGeo.y * R1;
    float k = f / max(f * 0.22, f + d);
    vec2 p = vec2(wx * k, sy * k);
    p = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
    vec2 local = uCen + p;

    vec3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix * vec3(local, 1.0);
    gl_Position = vec4(mvp.xy, 0.0, 1.0);

    float rel = rr / R1;
    vR = rel;
    vK = k;
    float core = 1.0 - smoothstep(0.05, 1.35, rel);
    float dust = 0.52 + 0.48 * smoothstep(-0.5, 0.6, lane);
    float bright = step(0.972, hash(s * 11.7));
    vT = bright;
    float a1 = (0.72 + core * 0.30) * (0.30 + hash(s * 5.1) * 0.70) * dust;
    a1 *= smoothstep(2.95, 1.60, rel);
    a1 *= mix(0.50, 1.45, smoothstep(0.70, 1.80, k));
    vA = a1 * uFade * uAmbient * 0.9;

    float sizePx = (0.62 + hash(s * 13.3) * 1.25 + bright * 4.6 + core * 0.45)
      * clamp(k, 0.60, 2.20) * uPixelScale;
    gl_PointSize = max(sizePx, 1.0 * uPixelScale);
  }
`

const DUST_FRAGMENT = /* glsl */ `
  in float vA;
  in float vT;
  in float vR;
  in float vK;

  out vec4 finalColor;

  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float L = length(d);
    float m = 1.0 - smoothstep(0.18, 0.50, L);
    float mb = pow(1.0 - smoothstep(0.0, 0.50, L), 1.7);
    m = mix(m, mb, vT);
    vec3 hotc = vec3(0.608, 0.694, 0.855);
    vec3 cold = vec3(0.20, 0.25, 0.38);
    vec3 far = vec3(0.32, 0.36, 0.47);
    vec3 goldc = vec3(0.949, 0.784, 0.365);
    float k = smoothstep(0.06, 0.55, vR);
    vec3 c = mix(cold, hotc, k * 0.70);
    c = mix(c, far, smoothstep(0.80, 2.00, vR) * 0.85);
    c = mix(c, far, (1.0 - smoothstep(0.65, 1.15, vK)) * 0.40);
    c = mix(c, goldc, vT * 0.9);
    float a = vA * m * 1.45;
    if (a < 0.004) discard;
    finalColor = vec4(c * a, a);
  }
`

/** 生成径向渐变光斑纹理（行星晕 / 星核辉光共用）。 */
function makeGlowTexture(): Texture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.22, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.16)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  return Texture.from(canvas)
}

export class OrbitGalaxy {
  readonly container = new Container({ label: 'orbit-galaxy' })
  readonly reduced: boolean

  private app: Application
  private opts: OrbitGalaxyOptions
  private uniforms: UniformGroup
  private mesh: Mesh<Geometry, Shader> | null = null
  private geometry: Geometry | null = null
  private shader: Shader | null = null

  private nodes: NodeRuntime[] = []
  private hoverId: string | null = null

  private W = 0
  private H = 0
  private CX = 0
  private CY = 0
  private R0 = 0
  private R1 = 0

  private ringG = new Graphics()
  private trailG = new Graphics()
  private axisG = new Graphics()
  private axisLabels = new Container()
  private planetLayer = new Container()
  private planets = new Map<string, {
    root: Container
    body: Graphics
    halo: Sprite
    ring: Graphics
    R: number
  }>()
  private coreHalo: Sprite | null = null
  private coreInner: Sprite | null = null
  private glowTex: Texture

  private time = 14
  private intro = 0
  private positions: GalaxyNodePos[] = []

  constructor(options: OrbitGalaxyOptions) {
    this.app = options.app
    this.opts = options
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    this.glowTex = makeGlowTexture()

    const rand = mulberry32(options.seed ?? 20260909)
    this.container.addChild(this.ringG, this.trailG, this.axisG, this.axisLabels, this.planetLayer)

    // —— GL 尘埃盘 ——
    const lowPower = ((navigator.hardwareConcurrency || 8) <= 4)
      || window.matchMedia?.('(max-width: 1023px)')?.matches || false
    const N = lowPower ? 26000 : 88000
    const seeds = new Float32Array(N)
    for (let i = 0; i < N; i += 1) seeds[i] = rand()
    this.geometry = new Geometry({
      label: 'orbit-galaxy-dust',
      attributes: { aSeed: { buffer: seeds, format: 'float32' } },
      topology: 'point-list',
    })
    this.uniforms = new UniformGroup({
      uTime: { value: this.time, type: 'f32' },
      uFade: { value: 0, type: 'f32' },
      uPixelScale: { value: options.pixelScale, type: 'f32' },
      uAmbient: { value: options.ambient ?? 1, type: 'f32' },
      uCen: { value: new Float32Array([options.width / 2, options.height * 0.52]), type: 'vec2<f32>' },
      uCam: { value: new Float32Array([SINP, COSP]), type: 'vec2<f32>' },
      uRot: { value: new Float32Array([COSR, SINR]), type: 'vec2<f32>' },
      uGeo: { value: new Float32Array([1, FOCAL]), type: 'vec2<f32>' },
    })
    this.shader = Shader.from({
      gl: { vertex: DUST_VERTEX, fragment: DUST_FRAGMENT, name: 'orbit-galaxy-dust' },
      resources: { galaxyUniforms: this.uniforms },
    })
    this.mesh = new Mesh<Geometry, Shader>({ geometry: this.geometry, shader: this.shader })
    this.mesh.blendMode = 'add'
    this.container.addChildAt(this.mesh, 0)

    this.setNodes(options.nodes)
    this.resize({ width: options.width, height: options.height, pixelScale: options.pixelScale })

    if (this.reduced) {
      this.renderStatic()
      return
    }
    this.app.ticker.add(this.tick)
  }

  /** 更新航段节点（重建轨道环与行星）；相位/倾角由索引的黄金角决定，可复现。 */
  setNodes(specs: readonly GalaxyNodeSpec[]) {
    this.nodes = specs.map((spec, i) => {
      const inc = ((i % 2 ? 1 : -1) * (3.0 + (i * 2.7) % 7.0)) * RAD
      return {
        ...spec,
        ph: i * GOLD + 0.7,
        inc,
        node: i * GOLD * 0.63,
        rr: 0,
        omega: 0,
        a: i * GOLD + 0.7,
        speedK: 1,
      }
    })
    this.hoverId = null
    this.rebuildPlanets()
    if (this.W > 0) this.layout()
  }

  /** 悬停强调：被指节点轨道与行星提亮，其余压暗（呼应参考实现的 emph）。 */
  setEmphasis(id: string | null) {
    if (this.hoverId === id) return
    this.hoverId = id
    this.redrawRings()
    this.planets.forEach((p, key) => {
      const em = this.emph(key)
      p.root.alpha = em
      p.ring.visible = key === this.hoverId
    })
  }

  resize(opts: { width: number; height: number; pixelScale: number }) {
    this.W = Math.max(1, opts.width)
    this.H = Math.max(1, opts.height)
    this.CX = this.W * 0.5
    this.CY = this.H * 0.52
    this.R1 = Math.min(this.W * 0.44, this.H * 0.62)
    this.R0 = this.R1 * 0.22
    if (this.uniforms) {
      const u = this.uniforms.uniforms
      u.uPixelScale = opts.pixelScale
      ;(u.uCen as Float32Array).set([this.CX, this.CY])
      ;(u.uGeo as Float32Array).set([this.R1, FOCAL])
    }
    this.layout()
  }

  /** 减动效：固定时刻渲染一帧完整星系并回传一次节点坐标。 */
  renderStatic() {
    this.intro = 1
    if (this.uniforms) {
      const u = this.uniforms.uniforms
      u.uTime = this.time
      u.uFade = 1
    }
    this.draw2D(this.time)
    this.emitNodes()
    this.app.render()
  }

  destroy() {
    if (!this.reduced) this.app.ticker.remove(this.tick)
    this.planets.forEach(p => {
      p.halo.destroy()
      p.body.destroy()
      p.ring.destroy()
      p.root.destroy({ children: true })
    })
    this.planets.clear()
    this.axisLabels.destroy({ children: true })
    this.ringG.destroy()
    this.trailG.destroy()
    this.axisG.destroy()
    this.coreHalo?.destroy()
    this.coreInner?.destroy()
    this.mesh?.destroy({ children: true })
    this.geometry?.destroy(true)
    this.shader?.destroy(true)
    this.glowTex.destroy(true)
    this.container.destroy({ children: true })
  }

  // —— 几何：倾斜盘面投影（与参考实现逐式对应） ——

  private project(wx: number, wy: number, wz: number): Proj {
    const sy = -(wz * SINP + wy * COSP)
    const d = wz * COSP - wy * SINP
    const f = FOCAL * this.R1
    const k = f / Math.max(f * 0.22, f + d)
    const px = wx * k
    const py = sy * k
    return {
      x: this.CX + px * COSR - py * SINR,
      y: this.CY + px * SINR + py * COSR,
      k,
      d,
    }
  }

  private orb(n: NodeRuntime, a: number, r: number): Proj {
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const cn = Math.cos(n.node)
    const sn = Math.sin(n.node)
    let u = x * cn + z * sn
    let v = -x * sn + z * cn
    const y = v * Math.sin(n.inc)
    v *= Math.cos(n.inc)
    return this.project(u * cn - v * sn, y, u * sn + v * cn)
  }

  private fracToRadius(frac: number) {
    return this.R0 + (this.R1 - this.R0) * Math.max(0, Math.min(1, frac))
  }

  private emph(key: string) {
    if (!this.hoverId) return 1
    return key === this.hoverId ? 1.35 : 0.5
  }

  // —— 布局：轨道半径 / 角速度 / 刻度轴 / 静态轨道环 ——

  private layout() {
    for (const n of this.nodes) {
      n.rr = this.fracToRadius(n.radiusFrac)
      n.omega = 0.052 * Math.pow(this.R1 / Math.max(1, n.rr), 1.15) * 0.55
    }
    this.drawAxis()
    this.redrawRings()
    if (this.reduced || this.intro >= 1) this.draw2D(this.time)
  }

  /** 距离刻度轴：两道沿盘面的射线 + 对数刻度（近侧亮、远侧淡，呼应参考实现 drawScale）。 */
  private drawAxis() {
    const g = this.axisG
    g.clear()
    this.axisLabels.removeChildren().forEach(child => child.destroy())
    const ticks = this.opts.ticks ?? []
    if (!ticks.length) return
    const ref: NodeRuntime = { id: '', radiusFrac: 0, tone: 'locked', tier: 0, ph: 0, inc: 0, node: 0, rr: 0, omega: 0, a: 0, speedK: 1 }
    const ray = (A: number, far: boolean) => {
      const STEP = 28
      let prev: Proj | null = null
      for (let i = 0; i <= STEP; i += 1) {
        const q = this.orb(ref, A, this.R0 + (this.R1 - this.R0) * (i / STEP))
        if (prev) {
          const k = Math.min(1.8, (prev.k + q.k) / 2)
          g.moveTo(prev.x, prev.y)
          g.lineTo(q.x, q.y)
          g.stroke({
            color: 0x8fa3c0,
            width: 0.7 + 0.45 * k,
            alpha: (far ? 0.16 : 0.26) * (0.55 + 0.45 * k),
            cap: 'round',
          })
        }
        prev = q
      }
      for (const tick of ticks) {
        const p = this.orb(ref, A, this.fracToRadius(tick.frac))
        g.moveTo(p.x - 4, p.y)
        g.lineTo(p.x + 4, p.y)
        g.stroke({ color: 0x8fa3c0, width: 1, alpha: far ? 0.28 : 0.42 })
        const label = new Text({
          text: tick.label,
          style: { fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontSize: far ? 8.5 : 9.5, fill: 0x8fa3c0 },
        })
        label.anchor.set(1, 0.5)
        label.position.set(p.x - 7, p.y)
        label.alpha = far ? 0.30 : 0.46
        this.axisLabels.addChild(label)
      }
    }
    ray(Math.PI * 0.5, true)
    ray(Math.PI * 1.5, false)
  }

  /** 静态轨道环：按深度分近/远两段描边，锁定航段更淡。 */
  private redrawRings() {
    const g = this.ringG
    g.clear()
    const SEG = 128
    for (const n of this.nodes) {
      const col = TONE_COLOR[n.tone]
      const em = this.emph(n.id)
      const near: Proj[] = []
      const far: Proj[] = []
      let prev: Proj | null = null
      for (let j = 0; j <= SEG; j += 1) {
        const q = this.orb(n, (j / SEG) * TAU, n.rr)
        if (prev) {
          const isNear = prev.d + q.d < 0
          ;(isNear ? near : far).push(prev, q)
        }
        prev = q
      }
      const draw = (pts: Proj[], base: number, width: number) => {
        if (pts.length < 2) return
        g.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i].x, pts[i].y)
        g.stroke({ color: col, width, alpha: base * em, cap: 'round', join: 'round' })
      }
      draw(near, 0.34, 1.1)
      draw(far, 0.13, 0.9)
    }
  }

  // —— 行星节点：晕 + 星体 + 悬停环 ——

  private rebuildPlanets() {
    this.planets.forEach(p => {
      p.halo.destroy()
      p.body.destroy()
      p.ring.destroy()
      p.root.destroy({ children: true })
    })
    this.planets.clear()
    this.planetLayer.removeChildren()
    for (const n of this.nodes) {
      const col = TONE_COLOR[n.tone]
      const R = 2.4 + n.tier * 1.05
      const root = new Container()
      const halo = new Sprite(this.glowTex)
      halo.anchor.set(0.5)
      halo.tint = col
      halo.blendMode = 'add'
      halo.width = R * 11
      halo.height = R * 11
      const body = new Graphics()
        .circle(0, 0, R)
        .fill({ color: col })
        .circle(R * 0.3, R * 0.3, R * 0.34)
        .fill({ color: 0x0b1220, alpha: 0.85 })
      const ring = new Graphics()
        .circle(0, 0, R + 7.5)
        .stroke({ color: col, width: 1.1, alpha: 0.85 })
      ring.visible = false
      root.addChild(halo, body, ring)
      this.planetLayer.addChild(root)
      this.planets.set(n.id, { root, body, halo, ring, R })
    }
  }

  // —— 逐帧 2D 舰队层 ——

  private draw2D(t: number) {
    const fade = this.intro
    this.trailG.clear()
    // 彗尾航迹：沿轨道向后展开、按行程衰减（呼应参考实现 twenty-month path）。
    for (const n of this.nodes) {
      const col = TONE_COLOR[n.tone]
      const em = this.emph(n.id)
      const a = n.a
      const span = n.tone === 'locked' ? 0.42 : 1.05
      const SUB = 22
      let prev: Proj | null = null
      for (let s = 0; s <= SUB; s += 1) {
        const f = s / SUB
        const q = this.orb(n, a - (1 - f) * span, n.rr)
        if (prev) {
          this.trailG.moveTo(prev.x, prev.y)
          this.trailG.lineTo(q.x, q.y)
          this.trailG.stroke({
            color: col,
            width: 0.5 + 1.3 * f,
            alpha: fade * em * 0.34 * f * f,
            cap: 'round',
          })
        }
        prev = q
      }
    }

    // 星核脉动辉光。
    const c0 = this.project(0, 0, 0)
    if (this.coreHalo && this.coreInner) {
      const puls = 0.5 + 0.16 * Math.sin(t * 0.8)
      this.coreHalo.position.set(c0.x, c0.y)
      this.coreInner.position.set(c0.x, c0.y)
      this.coreHalo.alpha = fade * (0.42 + 0.12 * puls)
      this.coreInner.alpha = fade * (0.52 + 0.16 * Math.sin(t * 1.3))
      this.coreHalo.scale.set(1 + 0.05 * puls)
    }

    // 行星沿轨道差速运行（内圈更快），近侧压远侧绘制。
    const order = this.nodes
      .map((n, i) => ({ n, i, p: this.orb(n, n.a, n.rr) }))
      .sort((a, b) => b.p.d - a.p.d)
    this.positions = [{ id: 'hub', x: c0.x, y: c0.y }]
    for (const { n, i, p } of order) {
      const rec = this.planets.get(n.id)
      if (rec) {
        const em = this.emph(n.id)
        const kk = Math.max(0.55, Math.min(1.7, p.k))
        const puls = 0.5 + 0.5 * Math.sin(t * 0.9 + i * 1.3)
        rec.root.position.set(p.x, p.y)
        rec.root.scale.set(kk)
        rec.root.alpha = em
        rec.halo.alpha = (n.tone === 'locked' ? 0.14 : 0.22) + 0.10 * puls
        rec.ring.visible = n.id === this.hoverId
      }
      this.positions.push({ id: n.id, x: p.x, y: p.y })
    }
  }

  private emitNodes() {
    this.opts.onNodes?.(this.positions)
  }

  private tick = (ticker: Ticker) => {
    if (document.hidden) return
    const dt = Math.min(ticker.deltaMS / 1000, 0.033)
    this.time += dt
    this.intro = Math.min(1, this.intro + dt / 1.6)
    // 行星差速运行：悬停节点缓动减速（聚焦可点击），离开后恢复。
    const damp = 1 - Math.exp(-dt / 0.35)
    for (const n of this.nodes) {
      const target = this.hoverId === n.id ? 0.06 : 1
      n.speedK += (target - n.speedK) * damp
      n.a += n.omega * n.speedK * dt
    }
    const u = this.uniforms.uniforms
    u.uTime = this.time
    u.uFade = this.intro
    this.draw2D(this.time)
    this.emitNodes()
  }
}

/**
 * 纯函数布局：不依赖 WebGL 时为外壳兜底计算节点坐标（与引擎同一套投影常量）。
 * specs 需附带 ly 以刻画距离轴；返回 hub + 各节点坐标。
 */
export function planGalaxyNodes(
  width: number,
  height: number,
  specs: readonly (GalaxyNodeSpec & { ly: number })[],
): GalaxyNodePos[] {
  const CX = width * 0.5
  const CY = height * 0.52
  const R1 = Math.min(width * 0.44, height * 0.62)
  const R0 = R1 * 0.22
  const lys = specs.map(s => s.ly)
  const lo = Math.log10(Math.min(...lys))
  const hi = Math.log10(Math.max(...lys))
  const out: GalaxyNodePos[] = [{ id: 'hub', x: CX, y: CY }]
  specs.forEach((spec, i) => {
    const frac = hi === lo ? 0.5 : (Math.log10(spec.ly) - lo) / (hi - lo)
    const rr = R0 + (R1 - R0) * frac
    const a = i * GOLD + 0.7
    out.push({ id: spec.id, x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr * 0.55 })
  })
  return out
}
