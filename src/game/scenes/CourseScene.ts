import { Container, Graphics } from 'pixi.js'
import type { Game, GameAction, GameScene } from '../core/app'
import { C, MONO, makeButton, makePanel, makeText } from '../core/ui'
import { TraceView } from '../core/trace-view'
import type { FormulaView } from '../core/formula-view'
import { missionFormula, stateFormula } from '../core/formulas'
import { t, zh } from '../locale'
import { courseMissions } from '../sim'
import { loadCourseSave, saveCourseRecord } from '../save'
import type { CourseMission, TraceFrame } from '../types'
import type { ChapterId } from '../curriculum'
import { CourseMapScene } from './CourseMapScene'
import { LabScene, labMissions } from './LabScene'
import type { LabKind } from '../sim'

/** A replayable command cursor over immutable algorithm snapshots. Pixi owns the whole interaction. */
export class CourseScene implements GameScene {
  readonly container = new Container()
  readonly backdropAlpha = 0.97
  size = { width: 1440, height: 800 }
  private chrome = new Container()
  private view = new TraceView()
  private frames: TraceFrame[]
  private cursor = 0
  private variant: 0 | 1 = 0
  private checked = false
  private transferred = false
  private checkpointKind: 'prediction' | 'transfer' = 'prediction'
  private checkpoint = false
  private choice: number | null = null
  private lastWidth = 0
  private theoryOpen = false
  private theoryPage = 0
  private math: FormulaView | null = null
  private disposed = false
  private keyHandler: (event: KeyboardEvent) => void

  constructor(
    private game: Game,
    private mission: CourseMission,
  ) {
    const saved = loadCourseSave()[mission.id]
    this.variant = saved?.variant ?? 0
    this.frames = mission.trace(this.variant)
    const previous = saved?.attempts[this.variant]
    this.cursor = Math.min(previous?.step ?? 0, this.frames.length - 1)
    this.checked = previous?.checked ?? false
    this.transferred = previous?.transferred ?? false
    if (
      this.cursor === this.frames.length - 1 &&
      this.checked &&
      !this.transferred &&
      zh.course.missions[mission.id]?.theory
    ) {
      this.checkpoint = true
      this.checkpointKind = 'transfer'
    }
    this.container.addChild(this.chrome, this.view.container)
    this.keyHandler = (event) => {
      const modal = document.querySelector('[aria-modal="true"]')
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (modal && !modal.contains(this.game.app.canvas))
      )
        return
      if (
        event.key !== 'Escape' &&
        event.target instanceof HTMLElement &&
        event.target.closest('button, a, input, select')
      )
        return
      if (this.theoryOpen && event.key !== 'Escape') return
      if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault()
        this.next()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        this.previous()
      }
      if (event.key.toLowerCase() === 'r') this.restart()
      if (event.key === 'Escape') {
        if (this.theoryOpen) {
          this.theoryOpen = false
          this.draw()
        } else this.back()
      }
    }
    window.addEventListener('keydown', this.keyHandler)
    this.resize(game.width)
    void import('../core/formula-view')
      .then(({ FormulaView }) => {
        if (this.disposed) return
        this.math = new FormulaView(this.game)
        this.draw()
      })
      .catch((error) => {
        if (!this.disposed) console.error('Formula renderer failed', error)
      })
  }

  resize(width: number) {
    const w = Math.max(320, Math.round(width))
    if (w === this.lastWidth) return
    this.lastWidth = w
    this.size = {
      width: w,
      height:
        w < 760 ? 1350 : w < 1100 ? 1080 : Math.max(800, (w * 800) / 1440),
    }
    this.draw()
  }

  private persist() {
    saveCourseRecord(this.mission.id, this.variant, {
      step: this.cursor,
      checked: this.checked,
      transferred: this.transferred,
      ...(this.cursor === this.frames.length - 1 &&
      this.checked &&
      (!zh.course.missions[this.mission.id].theory || this.transferred)
        ? { completedAt: new Date().toISOString() }
        : {}),
    })
  }
  private next() {
    if (this.theoryOpen) return
    if (this.checkpoint) return
    if (
      !this.checked &&
      this.cursor >= Math.max(0, Math.floor((this.frames.length - 1) * 0.45))
    ) {
      this.checkpoint = true
      this.checkpointKind = 'prediction'
      this.choice = null
      this.draw()
      return
    }
    if (this.cursor < this.frames.length - 1) this.cursor++
    if (
      this.cursor === this.frames.length - 1 &&
      this.checked &&
      !this.transferred &&
      zh.course.missions[this.mission.id].theory
    ) {
      this.checkpoint = true
      this.checkpointKind = 'transfer'
      this.choice = null
    }
    this.persist()
    this.draw()
  }
  private previous() {
    if (this.checkpoint || this.theoryOpen) return
    this.cursor = Math.max(0, this.cursor - 1)
    this.persist()
    this.draw()
  }
  private restart() {
    this.cursor = 0
    this.checked = false
    this.transferred = false
    this.checkpoint = false
    this.choice = null
    this.persist()
    this.draw()
  }
  private back() {
    this.persist()
    this.game.switch(
      (g) => new CourseMapScene(g, this.mission.chapter as ChapterId),
    )
  }
  private changeInput() {
    this.variant = this.variant === 0 ? 1 : 0
    this.frames = this.mission.trace(this.variant)
    const saved = loadCourseSave()[this.mission.id]?.attempts[this.variant]
    this.cursor = Math.min(saved?.step ?? 0, this.frames.length - 1)
    this.checked = saved?.checked ?? false
    this.checkpoint = false
    this.choice = null
    this.transferred = saved?.transferred ?? false
    if (
      this.cursor === this.frames.length - 1 &&
      this.checked &&
      !this.transferred &&
      zh.course.missions[this.mission.id].theory
    ) {
      this.checkpoint = true
      this.checkpointKind = 'transfer'
    }
    this.persist()
    this.draw()
  }
  private answer(index: number) {
    this.choice = index
    this.draw()
  }
  private get prediction() {
    const copy = zh.course.missions[this.mission.id]
    return this.checkpointKind === 'transfer' && copy.theory
      ? copy.theory.transfer
      : copy.prediction
  }
  private acceptPrediction() {
    const prediction = this.prediction
    if (this.choice !== prediction.answer) return
    if (this.checkpointKind === 'transfer') {
      this.transferred = true
      this.checkpoint = false
      this.persist()
      this.draw()
    } else {
      this.checked = true
      this.checkpoint = false
      this.persist()
      this.next()
    }
  }

  private paragraph(
    label: string,
    body: string,
    x: number,
    y: number,
    width: number,
    color: number = C.muted,
  ) {
    makeText(this.chrome, x, y, label, { size: 11, color: C.yellow })
    const text = makeText(this.chrome, x, y + 25, body, {
      size: 14,
      color,
      wordWrap: width,
      lineHeight: 23,
    })
    return y + 25 + text.height + 28
  }

  private draw() {
    this.chrome
      .removeChildren()
      .forEach((child) => child.destroy({ children: true }))
    this.view.container.visible = !this.theoryOpen
    const { width: w, height: h } = this.size
    const mobile = w < 760,
      stacked = w < 1100
    const baseHeight = mobile
      ? 1350
      : stacked
        ? 1080
        : Math.max(800, (w * 800) / 1440)
    const copy = zh.course.missions[this.mission.id]
    if (!copy) throw new Error(`Missing mission copy: ${this.mission.id}`)
    const frame = this.frames[this.cursor]
    this.game.setDescription(
      [
        copy.title,
        `${this.cursor + 1}/${this.frames.length}`,
        zh.course.operations[frame.op],
        frame.formula,
        copy.invariant,
        [...(frame.items ?? []), ...(frame.output ?? [])]
          .map((item) => `${item.id}: ${item.value}`)
          .join(', '),
        ...(frame.groups ?? []).map(
          (group) =>
            `${group.id}: ${group.items.map((item) => item.value).join(', ')}`,
        ),
        frame.matrix?.values.map((row) => row.join(', ')).join('; ') ?? '',
        ...(frame.nodes ?? []).map((node) => `${node.id}: ${node.value}`),
        ...(frame.edges ?? []).map(
          (edge) =>
            `${edge.from} ${edge.directed ? '→' : '↔'} ${edge.to} ${edge.weight ?? ''}`,
        ),
      ].join('. '),
    )
    const complete =
      this.cursor === this.frames.length - 1 &&
      this.checked &&
      (!copy.theory || this.transferred)
    const pad = mobile ? 20 : 32
    const mainW = stacked ? w - pad * 2 : Math.round(w * 0.69) - 40
    const sideX = stacked ? pad : mainW + 64
    const sideW = stacked ? w - pad * 2 : w - sideX - pad
    makeButton(this.chrome, {
      x: pad,
      y: 20,
      h: 36,
      label: `← ${t('course.title')}`,
      variant: 'outline',
      size: 12,
      onTap: () => this.back(),
    })
    makeText(this.chrome, pad, 80, copy.title, {
      size: mobile ? 25 : 31,
      weight: '400',
      wordWrap: w - pad * 2,
      lineHeight: 38,
    })
    makeText(
      this.chrome,
      pad,
      mobile ? 132 : 128,
      `${t('course.sample', { n: this.variant + 1 })}  /  ${t('course.step', { n: this.cursor + 1, total: this.frames.length })}`,
      { size: 11, family: MONO, color: C.yellow },
    )
    if (!mobile)
      makeButton(this.chrome, {
        x: w - 166,
        y: 24,
        w: 134,
        h: 36,
        label: t('course.alternate'),
        variant: 'outline',
        onTap: () => this.changeInput(),
      })
    if (!mobile)
      makeButton(this.chrome, {
        x: w - 314,
        y: 24,
        w: 134,
        h: 36,
        label: t('course.theory'),
        variant: 'outline',
        onTap: () => {
          this.theoryOpen = true
          this.theoryPage = 0
          this.draw()
        },
      })

    const goal = makeText(
      this.chrome,
      pad,
      mobile ? 169 : 166,
      copy.objective,
      { size: 14, color: C.muted, wordWrap: mainW, lineHeight: 23 },
    )
    const viewY = (mobile ? 169 : 166) + Math.max(30, goal.height) + 18
    const viewH = mobile
      ? 366
      : stacked
        ? 410
        : Math.max(330, baseHeight - viewY - 236)
    makePanel(this.chrome, pad, viewY, mainW, viewH, {
      fill: 0x07161b,
      stroke: 0x385157,
    })
    this.view.container.position.set(pad + 12, viewY + 10)
    const graphLayout =
      this.mission.id === 'divide-closest-pair'
        ? 'spatial'
        : this.mission.chapter === 'trees' ||
            ['sort-heap', 'sort-tournament', 'external-optimal-merge'].includes(
              this.mission.id,
            )
          ? 'tree'
          : 'graph'
    this.view.update(frame, mainW - 24, viewH - 20, graphLayout)
    const progressY = viewY + viewH + 15
    const progress = new Graphics()
      .rect(pad, progressY, mainW, 2)
      .fill(C.border)
    progress
      .rect(
        pad,
        progressY,
        mainW * (this.cursor / Math.max(1, this.frames.length - 1)),
        2,
      )
      .fill(C.blue)
    this.chrome.addChild(progress)

    const evidenceY = progressY + 22
    makeText(this.chrome, pad, evidenceY, zh.course.operations[frame.op], {
      size: 15,
      color: C.blue,
    })
    const formula = makeText(this.chrome, pad, evidenceY + 28, frame.formula, {
      size: 13,
      color: C.ink,
      family: MONO,
      wordWrap: mainW,
      lineHeight: 22,
    })
    const counterY = evidenceY + 34 + formula.height
    const counterText = makeText(
      this.chrome,
      pad,
      counterY,
      Object.entries(frame.counters)
        .map(
          ([key, value]) =>
            `${key} ${typeof value === 'number' && !Number.isInteger(value) ? Number(value.toFixed(4)) : value}`,
        )
        .join('   ·   '),
      {
        size: 11,
        family: MONO,
        color: C.muted,
        wordWrap: mainW,
        lineHeight: 19,
      },
    )

    let sideY = stacked ? Math.max(mobile ? 778 : 760, counterY + 66) : 166
    this.math?.update(
      missionFormula(this.mission.id, frame),
      stateFormula(frame),
      sideX,
      sideY,
      sideW,
      !this.theoryOpen && !this.checkpoint,
    )
    if (!this.checkpoint)
      sideY += Math.max(
        156,
        this.math ? this.math.element.offsetHeight + 20 : 156,
      )
    if (this.checkpoint) {
      sideY = this.drawPrediction(sideX, sideY, sideW)
    } else if (complete) {
      sideY = this.paragraph(
        t('course.complete'),
        t('course.completeNote'),
        sideX,
        sideY,
        sideW,
        C.green,
      )
      sideY = this.paragraph(
        t('course.transfer'),
        copy.transfer,
        sideX,
        sideY,
        sideW,
      )
      const next =
        courseMissions[
          courseMissions.findIndex((m) => m.id === this.mission.id) + 1
        ]
      if (next)
        makeButton(this.chrome, {
          x: sideX,
          y: sideY,
          w: sideW,
          h: 44,
          label: t('course.continue'),
          onTap: () => this.game.switch((g) => new CourseScene(g, next)),
        })
    } else {
      sideY = this.paragraph(
        t('course.invariant'),
        copy.invariant,
        sideX,
        sideY,
        sideW,
        C.green,
      )
      sideY = this.paragraph(
        t('course.complexity'),
        copy.complexity,
        sideX,
        sideY,
        sideW,
      )
    }

    const controlsY = Math.max(
      stacked ? sideY + 20 : baseHeight - 94,
      counterY + counterText.height + 24,
      sideY + (complete ? 64 : 16),
    )
    // Actual Pixi text measurements are also available to the browser regression check.
    this.game.app.canvas.dataset.layoutBounds = JSON.stringify({
      evidenceBottom: counterY + counterText.height,
      sidebarBottom: sideY + (complete ? 44 : 0),
      controlsTop: controlsY,
    })
    const labKind = (Object.keys(labMissions) as LabKind[]).find(kind => labMissions[kind] === this.mission.id)
    if (labKind && !this.theoryOpen) makeButton(this.chrome, { x: w - 462, y: 24, w: 134, h: 36, label: t('lab.practiceEntry'), onTap: () => this.game.switch(g => new LabScene(g, labKind)) })
    const actions: GameAction[] = [
      { label: t('course.back'), run: () => this.back() },
      {
        label: t('course.previous'),
        disabled: this.checkpoint || this.cursor === 0,
        run: () => this.previous(),
      },
      {
        label: t('course.next'),
        disabled: this.checkpoint || complete,
        run: () => this.next(),
      },
      { label: t('course.restart'), run: () => this.restart() },
      { label: t('course.alternate'), run: () => this.changeInput() },
      {
        label: t('course.theory'),
        focusOnChange: !this.checkpoint,
        run: () => {
          this.theoryOpen = true
          this.theoryPage = 0
          this.draw()
        },
      },
    ]
    if (labKind) actions.push({ label: t('lab.practiceEntry'), run: () => this.game.switch(g => new LabScene(g, labKind)) })
    if (this.checkpoint) {
      this.prediction.options.forEach((option, index) =>
        actions.push({
          label: option,
          run: () => this.answer(index),
          focusOnChange: index === 0,
        }),
      )
      if (this.choice === this.prediction.answer)
        actions.push({
          label: t('course.reveal'),
          run: () => this.acceptPrediction(),
        })
    }
    if (!this.theoryOpen) this.game.setActions(actions)
    const buttonW = mobile ? (w - 48) / 2 : 166
    const previous = makeButton(this.chrome, {
      x: pad,
      y: controlsY,
      w: buttonW,
      h: 44,
      label: t('course.previous'),
      variant: 'outline',
      size: 13,
      onTap: () => this.previous(),
    })
    previous.setEnabled(!this.checkpoint && this.cursor > 0)
    const next = makeButton(this.chrome, {
      x: pad + buttonW + 8,
      y: controlsY,
      w: buttonW,
      h: 44,
      label: t(complete ? 'course.replay' : 'course.next'),
      size: 13,
      onTap: () => (complete ? this.restart() : this.next()),
    })
    next.setEnabled(!this.checkpoint)
    makeButton(this.chrome, {
      x: mobile ? pad : pad + buttonW * 2 + 24,
      y: mobile ? controlsY + 54 : controlsY,
      w: mobile ? buttonW : 132,
      h: 44,
      label: t('course.restart'),
      variant: 'ghost',
      size: 12,
      onTap: () => this.restart(),
    })
    if (mobile)
      makeButton(this.chrome, {
        x: pad + buttonW + 8,
        y: controlsY + 54,
        w: buttonW,
        h: 44,
        label: t('course.alternate'),
        variant: 'outline',
        size: 12,
        onTap: () => this.changeInput(),
      })
    if (mobile)
      makeButton(this.chrome, {
        x: pad,
        y: controlsY + 108,
        w: w - pad * 2,
        h: 44,
        label: t('course.theory'),
        variant: 'outline',
        size: 13,
        onTap: () => {
          this.theoryOpen = true
          this.theoryPage = 0
          this.draw()
        },
      })
    if (!mobile)
      makeText(this.chrome, w - pad, controlsY + 16, t('course.keyboard'), {
        size: 10,
        anchorX: 1,
        color: C.faint,
      })
    // Variable-height mobile content stays readable instead of shrinking the canvas.
    this.size.height = Math.max(baseHeight, controlsY + (mobile ? 180 : 80))
    if (this.theoryOpen) this.drawTheory()
    this.game.updateLayout()
  }

  private drawPrediction(x: number, y: number, width: number) {
    const prediction = this.prediction
    y = this.paragraph(
      t(
        this.checkpointKind === 'transfer'
          ? 'course.transferCheckpoint'
          : 'course.checkpoint',
      ),
      prediction.prompt,
      x,
      y,
      width,
      C.ink,
    )
    prediction.options.forEach((option, index) => {
      const label = makeText(
        this.chrome,
        x + 16,
        y + 13,
        `${String.fromCharCode(65 + index)}  ${option}`,
        {
          size: 14,
          color: this.choice === index ? C.blue : C.ink,
          wordWrap: width - 32,
          lineHeight: 22,
        },
      )
      const height = Math.max(52, label.height + 26)
      const button = new Graphics()
        .roundRect(x, y, width, height, 2)
        .fill({ color: this.choice === index ? C.blueBg : C.panel })
        .stroke({ width: 1, color: this.choice === index ? C.blue : C.border })
      this.chrome.addChildAt(button, this.chrome.getChildIndex(label))
      button.eventMode = 'static'
      button.cursor = 'pointer'
      button.on('pointertap', () => this.answer(index))
      label.eventMode = 'none'
      y += height + 10
    })
    if (this.choice !== null) {
      const correct = this.choice === prediction.answer
      y = this.paragraph(
        t(correct ? 'course.correct' : 'course.retry'),
        correct ? prediction.explanation : t('course.checkpointHint'),
        x,
        y + 12,
        width,
        correct ? C.green : C.orange,
      )
      if (correct) {
        makeButton(this.chrome, {
          x,
          y,
          w: width,
          h: 44,
          label: t('course.reveal'),
          onTap: () => this.acceptPrediction(),
        })
        y += 60
      }
    }
    return y
  }

  private drawTheory() {
    const copy = zh.course.missions[this.mission.id]
    const note = copy.theory ?? {
      conditions: copy.complexity,
      claim: copy.invariant,
      steps: [copy.explanation],
      boundary: copy.transfer,
    }
    const pages = [
      { label: t('course.conditions'), text: note.conditions },
      { label: t('course.claim'), text: note.claim },
      { label: t('course.evidence'), text: copy.explanation },
      ...note.steps.map((text, i) => ({
        label: `${t('course.argument')} ${i + 1}`,
        text,
      })),
      { label: t('course.boundary'), text: note.boundary },
    ]
    this.theoryPage = Math.min(this.theoryPage, pages.length - 1)
    const { width: w, height: h } = this.size
    const mobile = w < 760,
      x = mobile ? 12 : Math.max(32, w * 0.18),
      y = mobile ? 22 : 70
    const wide = mobile ? w - 24 : w * 0.64
    const overlay = new Graphics()
      .rect(0, 0, w, h)
      .fill({ color: C.bg, alpha: 0.94 })
    overlay.eventMode = 'static'
    this.chrome.addChild(overlay)
    this.view.container.visible = false
    makePanel(this.chrome, x, y, wide, mobile ? 640 : 540, {
      stroke: C.border,
      fill: C.panel,
    })
    makeText(this.chrome, x + 24, y + 25, t('course.theory'), {
      size: 12,
      color: C.yellow,
    })
    makeText(this.chrome, x + 24, y + 63, copy.title, {
      size: mobile ? 23 : 30,
      wordWrap: wide - 48,
      lineHeight: 35,
    })
    const page = pages[this.theoryPage]
    const end = this.paragraph(
      page.label,
      page.text,
      x + 24,
      y + 141,
      wide - 48,
      C.ink,
    )
    const controlsY = Math.max(y + (mobile ? 472 : 386), end + 30)
    const change = (delta: number) => {
      this.theoryPage = (this.theoryPage + delta + pages.length) % pages.length
      this.draw()
    }
    const close = () => {
      this.theoryOpen = false
      this.view.container.visible = true
      this.draw()
    }
    const bw = (wide - 56) / 2
    makeButton(this.chrome, {
      x: x + 24,
      y: controlsY,
      w: bw,
      h: 44,
      label: t('course.previousPage'),
      variant: 'outline',
      onTap: () => change(-1),
    })
    makeButton(this.chrome, {
      x: x + 32 + bw,
      y: controlsY,
      w: bw,
      h: 44,
      label: t('course.nextPage'),
      variant: 'outline',
      onTap: () => change(1),
    })
    makeText(
      this.chrome,
      x + 24,
      controlsY - 28,
      `${this.theoryPage + 1} / ${pages.length}`,
      { size: 12, family: MONO, color: C.muted },
    )
    makeButton(this.chrome, {
      x: x + 24,
      y: controlsY + 58,
      w: wide - 48,
      h: 44,
      label: t('course.closeTheory'),
      onTap: close,
    })
    this.game.setDescription(`${copy.title}. ${page.label}. ${page.text}`)
    this.game.setActions([
      { label: t('course.previousPage'), run: () => change(-1) },
      {
        label: t('course.nextPage'),
        run: () => change(1),
        focusOnChange: true,
      },
      { label: t('course.closeTheory'), run: close },
    ])
    if (mobile) this.size.height = Math.max(this.size.height, controlsY + 130)
  }

  destroy() {
    this.disposed = true
    this.math?.destroy()
    window.removeEventListener('keydown', this.keyHandler)
    this.view.destroy()
    this.container.destroy({ children: true })
  }
}
