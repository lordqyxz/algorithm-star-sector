import { Application, Container, Geometry, GlProgram, Mesh, Shader, UniformGroup } from 'pixi.js'
import type { Ticker } from 'pixi.js'
import { mulberry32 } from './ui'

/**
 * GPU 粒子星野引擎（参考 tokentracker.cc 首屏 TokenGalaxy 的架构，移植到 PixiJS 8）。
 *
 * 三类粒子同住一份几何体、一次 draw call，全部运动都在顶点着色器里算，
 * CPU 每帧只推进几个 uniform：
 *   星盘（disc）—— 差速自转（内圈更快）+ 双对数旋臂亮度调制 + 闪烁；
 *   星流（flow）—— 从六个轨道锚点螺旋汇入星核的彗尾带，源头亮斑、近核淡出；
 *   星野（star）—— 远景缓慢漂移 + 闪烁。
 * 另有入场揭示（星流从锚点长出）、指针视差（悬停设备）、
 * 页面隐藏 / 画布离屏时暂停、低端设备降量、prefers-reduced-motion 单帧静星。
 */

const TAU = Math.PI * 2
const DISC_R = 10 // 星盘半径（世界单位）
const ANCHORS = 6 // 星流锚点数

export interface ParticleGalaxyOptions {
  /** 已初始化的 Pixi Application（webgl preference）。 */
  app: Application
  /** 初始画布尺寸（局部舞台单位）。 */
  width: number
  height: number
  /** 舞台单位 → 物理像素的比例（resolution × stage scale）。 */
  pixelScale: number
  /** 固定种子保证星点分布可复现。 */
  seed?: number
  /** 星核在画布中的相对位置。 */
  coreFrac?: { x: number; y: number }
  /** 全局亮度系数（站点外壳背景比游戏内更收敛）。 */
  ambient?: number
}

const PARTICLE_VERTEX = /* glsl */ `
  in vec2 aPosition;
  in float aSeed;
  in float aPhase;
  in float aSize;
  in float aFlow;
  in float aStream;

  uniform mat3 uProjectionMatrix;
  uniform mat3 uWorldTransformMatrix;
  uniform mat3 uTransformMatrix;

  uniform float uTime;
  uniform float uIntro;
  uniform float uUnit;
  uniform float uSizeUnit;
  uniform float uPixelScale;
  uniform float uStageScale;
  uniform float uCenterX;
  uniform float uCenterY;
  uniform float uParX;
  uniform float uParY;
  uniform float uAlpha;

  out float vAlpha;
  out float vGlow;
  out vec3 vColor;

  const float TAU = 6.28318530718;
  const float FLAT = 0.72;
  const float ANCHORS = 6.0;
  const float SWIRL = 2.6;

  void main() {
    vec2 p;
    float glow = 0.0;
    float alpha = 1.0;

    if (aFlow > 1.5) {
      // 星盘本体：差速自转（内圈更快）+ 双对数旋臂亮度调制。
      float r0 = length(aPosition);
      float ang0 = atan(aPosition.y, aPosition.x);
      float angSpeed = 0.05 / max(r0 / ${DISC_R.toFixed(1)}, 0.35);
      float ang = ang0 + uTime * angSpeed + uTime * 0.012;
      float radius = r0 * (1.0 + 0.03 * sin(uTime * 0.5 + aSeed * 21.0));
      float thick = mix(1.5, 0.3, radius / ${DISC_R.toFixed(1)});
      p = vec2(cos(ang) * radius, sin(ang) * radius);
      float z = (fract(aSeed * 3.7) - 0.5) * 2.0 * thick;
      float arm = sin(2.0 * ang - 3.4 * log(max(radius, 0.4)) - uTime * 0.14);
      float armBoost = 0.72 + 0.28 * smoothstep(-0.3, 0.9, arm);
      armBoost = mix(armBoost, 1.0, smoothstep(7.8, 9.8, radius));
      float ringBoost = 0.3 * smoothstep(7.8, 9.8, radius) * (1.0 - smoothstep(11.4, 13.2, radius));
      float rimFade = 1.0 - 0.75 * smoothstep(11.4, 13.6, radius);
      float coreBoost = smoothstep(9.5, 1.2, radius);
      float tw = 0.75 + 0.25 * sin(uTime * (0.5 + aSeed) + aSeed * 30.0);
      alpha = (0.32 + 0.22 * coreBoost + ringBoost) * armBoost * tw * rimFade;
      glow = coreBoost * 0.4 + ringBoost * 0.5;
    } else if (aFlow > 0.5) {
      // 星流：从轨道锚点螺旋汇入星核的彗尾带（源头亮斑，近核淡出）。
      float anchorAng = aStream * (TAU / ANCHORS) + uTime * 0.012;
      float speed = 0.05 + 0.035 * aSeed;
      float t = fract(uTime * speed + aPhase);
      float tt = t * t * (3.0 - 2.0 * t);
      float radius = mix(${(DISC_R * 1.18).toFixed(2)}, 0.25, tt);
      float ang = anchorAng + SWIRL * tt * (0.85 + 0.3 * fract(aSeed * 7.31));
      vec2 radial = vec2(cos(ang), sin(ang));
      vec2 lateral = vec2(-radial.y, radial.x);
      float band = mix(0.55, 0.06, tt);
      float off1 = (fract(aSeed * 13.37) - 0.5) * 2.0;
      float off2 = (fract(aSeed * 47.11) - 0.5) * 2.0;
      p = radial * radius + lateral * off1 * band + radial * off2 * band * 0.35;
      float fadeIn = smoothstep(0.025, 0.1, t);
      float fadeOut = 1.0 - smoothstep(0.7, 0.93, t);
      float spawn = (1.0 - smoothstep(0.05, 0.22, t)) * fadeIn;
      float pulse = 0.72 + 0.28 * sin(uTime * 2.1 + aStream * 2.4);
      float reveal = smoothstep(t - 0.12, t, uIntro);
      alpha = 0.8 * fadeIn * fadeOut * pulse * reveal * (1.0 + spawn * 0.9);
      glow = smoothstep(0.5, 0.92, tt) * 0.7 + spawn * 0.55;
    } else {
      // 远景星野：缓慢漂移 + 闪烁。
      p = aPosition;
      p.x += sin(uTime * 0.05 + aSeed * 40.0) * 0.4;
      p.y += cos(uTime * 0.04 + aSeed * 55.0) * 0.3;
      float tw = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed) + aSeed * 20.0);
      alpha = 0.34 * tw;
      glow = tw * 0.18;
    }

    p.y *= FLAT;

    // 伪深度：翻到远半侧的星点更小更暗，近半侧更大更亮。
    float far = smoothstep(-10.0, 10.0, p.y);
    float nearK = mix(1.18, 0.72, far);
    alpha *= mix(1.06, 0.62, far);

    // 指针视差：远景星野浅、星盘与星流深（相机平移方向相反）。
    float parK = aFlow > 0.5 ? 12.0 : 6.0;
    vec2 local = vec2(
      uCenterX + p.x * uUnit - uParX * parK / uStageScale,
      uCenterY - p.y * uUnit - uParY * parK / uStageScale
    );

    vec3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix * vec3(local, 1.0);
    gl_Position = vec4(mvp.xy, 0.0, 1.0);

    float sizePx = aSize * uSizeUnit * uPixelScale * nearK * (1.0 + glow * 0.8);
    gl_PointSize = max(sizePx, 1.2 * uPixelScale);

    // 白心 + 冷蓝 + 暖金：与跃迁星流、站点强调色同一套词表。
    vec3 color = mix(vec3(0.624, 0.753, 1.0), vec3(0.875, 0.914, 0.984), aSeed);
    color = mix(color, vec3(1.0, 0.851, 0.541), clamp(glow, 0.0, 1.0) * 0.85);
    vColor = color;
    vAlpha = alpha * uIntro * uAlpha;
    vGlow = glow;
  }
`

const PARTICLE_FRAGMENT = /* glsl */ `
  in float vAlpha;
  in float vGlow;
  in vec3 vColor;
  uniform float uAlpha;

  out vec4 finalColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.02, d);
    float halo = smoothstep(0.5, 0.18, d) * 0.5;
    float a = (core + halo * vGlow) * vAlpha;
    if (a < 0.004) discard;
    finalColor = vec4(vColor * a, a);
  }
`

export function isLowPowerDevice(): boolean {
  if (typeof window === 'undefined') return true
  const compact = window.matchMedia?.('(max-width: 1023px)')?.matches
  const fewCores = (navigator.hardwareConcurrency || 8) <= 4
  return Boolean(compact || fewCores)
}

export class ParticleGalaxy {
  readonly container = new Container({ label: 'particle-galaxy' })
  readonly reduced: boolean

  private app: Application
  private geometry: Geometry
  private shader: Shader
  private uniforms: UniformGroup
  private mesh: Mesh<Geometry, Shader>
  private coreFrac: { x: number; y: number }
  private ambient: number

  private time = 0.7
  private intro = 0
  private pointer = { tx: 0, ty: 0, x: 0, y: 0 }
  private inView = true
  private io: IntersectionObserver | null = null

  constructor(options: ParticleGalaxyOptions) {
    this.app = options.app
    this.coreFrac = options.coreFrac ?? { x: 0.5, y: 0.42 }
    this.ambient = options.ambient ?? 1
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

    const lowPower = isLowPowerDevice()
    const counts = lowPower
      ? { flow: 520, disc: 1700, stars: 300 }
      : { flow: 1300, disc: 4200, stars: 650 }

    const rand = mulberry32(options.seed ?? 20260913)
    const total = counts.flow + counts.disc + counts.stars
    const positions = new Float32Array(total * 2)
    const seeds = new Float32Array(total)
    const phases = new Float32Array(total)
    const sizes = new Float32Array(total)
    const flows = new Float32Array(total)
    const streams = new Float32Array(total)

    for (let i = 0; i < counts.flow; i += 1) {
      const streamIndex = i % ANCHORS
      const anchorAng = (streamIndex / ANCHORS) * TAU
      positions[i * 2] = Math.cos(anchorAng) * DISC_R * 1.18
      positions[i * 2 + 1] = Math.sin(anchorAng) * DISC_R * 1.18
      seeds[i] = rand()
      phases[i] = rand()
      sizes[i] = 0.6 + rand()
      flows[i] = 1
      streams[i] = streamIndex
    }
    for (let i = counts.flow; i < counts.flow + counts.disc; i += 1) {
      const u = rand()
      const r = u < 0.55
        ? DISC_R * (0.05 + 0.95 * Math.pow(rand(), 0.8))
        : u < 0.85
          ? 8 + rand() * 2.6
          : 10.5 + rand() * 2.5
      const theta = rand() * TAU
      positions[i * 2] = Math.cos(theta) * r
      positions[i * 2 + 1] = Math.sin(theta) * r
      seeds[i] = rand()
      phases[i] = rand()
      sizes[i] = 0.42 + rand() * 0.75
      flows[i] = 2
    }
    for (let i = counts.flow + counts.disc; i < total; i += 1) {
      positions[i * 2] = (rand() * 2 - 1) * DISC_R * 2.6
      positions[i * 2 + 1] = (rand() * 2 - 1) * DISC_R * 1.9
      seeds[i] = rand()
      phases[i] = rand()
      sizes[i] = 0.32 + rand() * 0.55
    }

    this.geometry = new Geometry({
      label: 'particle-galaxy',
      attributes: {
        aPosition: { buffer: positions, format: 'float32x2' },
        aSeed: { buffer: seeds, format: 'float32' },
        aPhase: { buffer: phases, format: 'float32' },
        aSize: { buffer: sizes, format: 'float32' },
        aFlow: { buffer: flows, format: 'float32' },
        aStream: { buffer: streams, format: 'float32' },
      },
      topology: 'point-list',
    })

    this.uniforms = new UniformGroup({
      uTime: { value: 0, type: 'f32' },
      uIntro: { value: 0, type: 'f32' },
      uUnit: { value: 10, type: 'f32' },
      uSizeUnit: { value: 4, type: 'f32' },
      uPixelScale: { value: options.pixelScale, type: 'f32' },
      uStageScale: { value: 1, type: 'f32' },
      uCenterX: { value: options.width * this.coreFrac.x, type: 'f32' },
      uCenterY: { value: options.height * this.coreFrac.y, type: 'f32' },
      uParX: { value: 0, type: 'f32' },
      uParY: { value: 0, type: 'f32' },
      uAlpha: { value: this.ambient, type: 'f32' },
    })
    this.shader = Shader.from({
      gl: {
        vertex: PARTICLE_VERTEX,
        fragment: PARTICLE_FRAGMENT,
        name: 'particle-galaxy',
      },
      resources: { galaxyUniforms: this.uniforms },
    })
    this.mesh = new Mesh<Geometry, Shader>({ geometry: this.geometry, shader: this.shader })
    this.mesh.blendMode = 'add'
    this.container.addChild(this.mesh)

    this.resize({ width: options.width, height: options.height, pixelScale: options.pixelScale })

    if (this.reduced) {
      // 减动效：不做逐帧运动，只渲染一帧静态星系。
      this.renderStatic()
      return
    }

    this.app.ticker.add(this.tick)
    this.io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(entries => { this.inView = entries[0]?.isIntersecting ?? true }, { threshold: 0 })
      : null
    if (this.io) this.io.observe(this.app.canvas)

    if (window.matchMedia?.('(hover: hover)')?.matches) {
      window.addEventListener('pointermove', this.onPointer, { passive: true })
    }
  }

  /** 画布尺寸 / 缩放变化时更新投影相关的 uniform（不重建几何体）。 */
  resize(opts: { width: number; height: number; pixelScale: number; stageScale?: number }) {
    const u = this.uniforms.uniforms
    const minDim = Math.min(opts.width, opts.height)
    u.uUnit = minDim / 34
    u.uSizeUnit = minDim / 150
    u.uPixelScale = opts.pixelScale
    u.uStageScale = opts.stageScale ?? 1
    u.uCenterX = opts.width * this.coreFrac.x
    u.uCenterY = opts.height * this.coreFrac.y
  }

  /** 减动效路径：固定时刻渲染一帧完整星系。 */
  renderStatic() {
    const u = this.uniforms.uniforms
    u.uTime = this.time
    u.uIntro = 1
    this.app.render()
  }

  destroy() {
    this.app.ticker.remove(this.tick)
    window.removeEventListener('pointermove', this.onPointer)
    this.io?.disconnect()
    this.io = null
    this.mesh.destroy({ children: true })
    this.geometry.destroy(true)
    this.shader.destroy(true)
    this.container.destroy({ children: true })
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.tx = (e.clientX / window.innerWidth) * 2 - 1
    this.pointer.ty = (e.clientY / window.innerHeight) * 2 - 1
  }

  private tick = (ticker: Ticker) => {
    if (document.hidden || !this.inView) return
    const dt = Math.min(ticker.deltaMS / 1000, 0.033)
    this.time += dt
    this.intro = Math.min(1, this.intro + dt / 2.2)
    const damp = 1 - Math.exp(-dt / 0.22)
    this.pointer.x += (this.pointer.tx - this.pointer.x) * damp
    this.pointer.y += (this.pointer.ty - this.pointer.y) * damp
    const u = this.uniforms.uniforms
    u.uTime = this.time
    u.uIntro = this.intro
    u.uParX = this.pointer.x
    u.uParY = this.pointer.y
  }
}
