import { Container } from 'pixi.js'
import type { Game, GameAction, GameScene } from '../core/app'
import { C, makeButton, makePanel, makeText } from '../core/ui'
import { TraceView } from '../core/trace-view'
import type { FormulaView } from '../core/formula-view'
import { missionFormula, stateFormula } from '../core/formulas'
import {
  createLab,
  labChoices,
  applyLabAction,
  labFrame,
  labHint,
  labParameter,
  labIsComplete,
  labReference,
  labSummary,
  labDemoAction,
  type LabKind,
  type LabState,
  type LabAction,
  type LabChoice,
  type LabFeedback,
} from '../sim'
import { loadLabSave, saveLabRecord } from '../save'
import { t, zh, type TextKey } from '../locale'
import { CourseMapScene } from './CourseMapScene'

export type LabMode = 'demo' | 'practice' | 'challenge'
export const labMissions: Record<LabKind, string> = {
  dijkstra: 'g-shortest-path',
  knapsack: 'dp-knapsack-01',
  maxflow: 'g-max-flow',
}
const kinds: LabKind[] = ['dijkstra', 'knapsack', 'maxflow']
const text = (key: string, vars: Record<string, string | number> = {}) =>
  t(key as TextKey, vars)

/** The scene owns learner commands. Every transition is decided by the pure model. */
export class LabScene implements GameScene {
  readonly container = new Container()
  readonly backdropAlpha = 0.97
  size = { width: 1440, height: 980 }
  private chrome = new Container()
  private view = new TraceView()
  private math: FormulaView | null = null
  private disposed = false
  private width = 0
  private state: LabState
  private history: LabState[] = []
  private actions: LabAction[] = []
  private mode: LabMode
  private hints = 0
  private errors = 0
  private hintLevel = 0
  private feedback: LabFeedback = { key: 'lab.feedback.welcome' }
  private attemptedTargets: string[] = []
  private feedbackError = false
  private baseline: number | null = null
  private keyHandler: (event: KeyboardEvent) => void
  private previousTabIndex: number
  private readonly focusCanvas = () =>
    this.game.app.canvas.focus({ preventScroll: true })

  constructor(
    private game: Game,
    private kind: LabKind = 'dijkstra',
    requestedMode?: LabMode,
  ) {
    this.previousTabIndex = game.app.canvas.tabIndex
    game.app.canvas.tabIndex = 0
    game.app.canvas.addEventListener('pointerdown', this.focusCanvas, true)
    const previous = loadLabSave()[kind]?.last
    this.mode = requestedMode ?? previous?.mode ?? 'practice'
    const variant: 0 | 1 = this.mode === 'challenge' ? 1 : 0
    this.state = createLab(kind, variant)
    if (
      requestedMode === undefined &&
      previous &&
      previous.variant === variant
    ) {
      try {
        this.state = createLab(kind, previous.variant, previous.parameter)
        for (const action of previous.actions) {
          const result = applyLabAction(this.state, action)
          if (!result.changed) break
          this.history.push(this.state)
          this.actions.push(action)
          this.state = result.state
        }
        this.hints = previous.hints
        this.errors = previous.errors
        if (this.actions.length) this.feedback = { key: 'lab.resume' }
      } catch {
        this.state = createLab(kind, variant)
        this.history = []
        this.actions = []
      }
    }
    this.container.addChild(this.chrome, this.view.container)
    if (this.mode === 'demo') saveLabRecord(kind, { viewed: true })
    this.keyHandler = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const modal = document.querySelector('[aria-modal="true"]')
      if (modal && !modal.contains(this.game.app.canvas)) return
      if (
        event.key !== 'Escape' &&
        event.target instanceof HTMLElement &&
        event.target.closest('button,a,input,select')
      )
        return
      if (event.key === 'Escape') this.back()
      else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        this.undo()
      } else if (event.key.toLowerCase() === 'r') this.restart()
      else if (
        this.mode === 'demo' &&
        (event.key === 'ArrowRight' || event.key === ' ')
      ) {
        event.preventDefault()
        this.demoNext()
      } else if (/^[1-9]$/.test(event.key) && this.mode !== 'demo') {
        const choice = labChoices(this.state)[Number(event.key) - 1]
        if (choice) this.act(choice.action)
      }
    }
    window.addEventListener('keydown', this.keyHandler)
    this.resize(game.width)
    void import('../core/formula-view')
      .then(({ FormulaView }) => {
        if (this.disposed) return
        this.math = new FormulaView(game)
        this.draw()
      })
      .catch((error) => {
        if (!this.disposed) console.error('Formula renderer failed', error)
      })
  }

  resize(width: number) {
    const next = Math.max(760, Math.round(width))
    if (next === this.width) return
    this.width = next
    this.size.width = next
    this.draw()
  }
  private back() {
    this.game.switch(
      (g) =>
        new CourseMapScene(g, this.kind === 'knapsack' ? 'dynamic' : 'graphs'),
    )
  }
  private switchMode(mode: LabMode) {
    if (mode !== this.mode)
      this.game.switch((g) => new LabScene(g, this.kind, mode))
  }
  private persist() {
    if (this.mode === 'demo') {
      saveLabRecord(this.kind, { viewed: true })
      return
    }
    const complete = labIsComplete(this.state)
    const date = new Date().toISOString()
    saveLabRecord(this.kind, {
      last: {
        mode: this.mode,
        variant: this.state.variant,
        parameter: this.state.parameter,
        actions: this.actions,
        hints: this.hints,
        errors: this.errors,
      },
      ...(complete
        ? {
            [this.mode === 'challenge' && this.hints === 0 && this.errors === 0
              ? 'independent'
              : 'assisted']: date,
            steps: this.actions.length,
            hints: this.hints,
            errors: this.errors,
            [this.mode === 'challenge' && this.hints === 0 && this.errors === 0
              ? 'independentMetrics'
              : 'assistedMetrics']: {
              steps: this.actions.length,
              hints: this.hints,
              errors: this.errors,
              variant: this.state.variant,
              parameter: this.state.parameter,
            },
          }
        : {}),
    })
  }
  private act(action: LabAction) {
    const attempted =
      labChoices(this.state).find(
        (choice) => JSON.stringify(choice.action) === JSON.stringify(action),
      )?.targets ?? []
    const result = applyLabAction(this.state, action)
    this.attemptedTargets = result.changed ? [] : attempted
    this.feedback = result.feedback
    this.feedbackError = !result.changed
    this.hintLevel = 0
    if (result.changed) {
      this.history.push(this.state)
      this.actions.push(action)
      this.state = result.state
    } else if (this.mode !== 'demo') this.errors++
    this.persist()
    this.draw()
  }
  private undo() {
    const previous = this.history.pop()
    if (!previous) return
    this.state = previous
    this.actions.pop()
    this.feedback = { key: 'lab.feedback.welcome' }
    this.feedbackError = false
    this.attemptedTargets = []
    this.hintLevel = 0
    this.persist()
    this.draw()
  }
  private demoNext() {
    const action = labDemoAction(this.state)
    if (action) this.act(action)
  }
  private requestHint() {
    if (this.mode === 'demo' || labIsComplete(this.state)) return
    this.hints++
    this.hintLevel = Math.min(2, this.hintLevel + 1)
    this.feedback = labHint(this.state, this.hintLevel)
    this.feedbackError = false
    this.attemptedTargets = []
    this.persist()
    this.draw()
  }
  private restart(
    parameter = this.state.parameter,
    variant = this.state.variant,
  ) {
    if (parameter !== this.state.parameter && labIsComplete(this.state))
      this.baseline = labReference(this.state).value
    this.state = createLab(this.kind, variant, parameter)
    this.history = []
    this.actions = []
    this.hints = 0
    this.errors = 0
    this.hintLevel = 0
    this.feedback = { key: 'lab.feedback.welcome' }
    this.feedbackError = false
    this.attemptedTargets = []
    this.persist()
    this.draw()
  }
  private choiceLabel(choice: LabChoice) {
    const vars = { ...choice.vars }
    if (typeof vars.edge === 'string') {
      const [id, direction] = vars.edge.split(':')
      if (id.length === 2)
        vars.edge =
          direction === 'r' ? `${id[1]}→${id[0]}` : `${id[0]}→${id[1]}`
    }
    return text(choice.key, vars)
  }
  private feedbackText() {
    const vars = { ...this.feedback.vars }
    if (vars.take === '—' || vars.take === '-∞') vars.take = t('lab.infeasible')
    let result = text(this.feedback.key, vars)
    if (this.hintLevel >= 2 && this.feedback.vars) {
      if (this.state.phase === 'settle')
        result +=
          '\n' +
          t('lab.hint.minimumDetail', {
            node: this.feedback.targets?.[0]?.split(':')[1] ?? '',
            distance:
              this.feedback.vars.distance ?? this.feedback.vars.minimum ?? '',
          })
      if (this.state.phase === 'dependency')
        result += '\n' + t('lab.hint.dependencyDetail', this.feedback.vars)
      if (this.state.phase === 'bottleneck')
        result += '\n' + t('lab.hint.bottleneckDetail', this.feedback.vars)
      if (this.state.phase === 'decision' || this.state.phase === 'backtrack')
        result += '\n' + t('lab.feedback.decision', vars)
    }
    return result
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
    const value = makeText(this.chrome, x, y + 23, body, {
      size: 14,
      lineHeight: 23,
      wordWrap: width,
      color,
    })
    return y + 23 + value.height + 25
  }

  private draw() {
    this.chrome
      .removeChildren()
      .forEach((child) => child.destroy({ children: true }))
    const w = this.width,
      pad = 32,
      sideW = 326,
      mainW = w - sideW - pad * 3,
      sideX = pad * 2 + mainW
    const complete = labIsComplete(this.state)
    const choices = this.mode === 'demo' ? [] : labChoices(this.state)
    const actions: GameAction[] = []
    const button = (
      x: number,
      y: number,
      width: number,
      label: string,
      run: () => void,
      disabled = false,
      solid = false,
    ) => {
      makeButton(this.chrome, {
        x,
        y,
        w: width,
        h: 40,
        label,
        onTap: run,
        size: 13,
        variant: solid ? 'solid' : 'outline',
      }).setEnabled(!disabled)
      actions.push({ label, run, disabled })
    }
    button(pad, 20, 152, t('lab.back'), () => this.back())
    ;(['demo', 'practice', 'challenge'] as LabMode[]).forEach((mode, i) =>
      button(
        w - pad - 354 + i * 122,
        20,
        110,
        zh.lab[mode],
        () => this.switchMode(mode),
        false,
        this.mode === mode,
      ),
    )
    makeText(this.chrome, pad, 83, zh.lab.kind[this.kind], {
      size: 30,
      wordWrap: w - 64,
    })
    kinds.forEach((kind, i) =>
      button(
        pad + i * 210,
        132,
        198,
        zh.lab.kind[kind],
        () => {
          if (kind !== this.kind) this.game.switch((g) => new LabScene(g, kind))
        },
        false,
        this.kind === kind,
      ),
    )
    const goal = makeText(
      this.chrome,
      pad,
      191,
      zh.lab.description[this.kind],
      { size: 14, wordWrap: mainW, color: C.muted, lineHeight: 23 },
    )
    const viewY = 191 + goal.height + 16,
      viewH = 362
    makePanel(this.chrome, pad, viewY, mainW, viewH)
    const frame = labFrame(this.state)
    if (this.state.kind === 'dijkstra' && complete) {
      const path = new Set<string>()
      let node = 't'
      for (
        let i = 0;
        i < this.state.nodes.length && this.state.previous[node];
        i++
      ) {
        const previous = this.state.previous[node]!
        path.add(`edge:${previous}:${node}`)
        node = previous
      }
      frame.edges = frame.edges?.map((edge) => ({
        ...edge,
        tone: path.has(`edge:${edge.from}:${edge.to}`) ? 'settled' : 'muted',
      }))
      frame.counters = {
        target: 't',
        distance: this.state.distance.t,
        settled: this.state.settled.length,
      }
    }
    if (this.state.kind === 'knapsack') {
      const state = this.state
      if (complete)
        frame.counters = {
          capacity: state.capacity,
          optimum: labSummary(state).value,
          selectedWeight: state.chosen.reduce(
            (sum, id) =>
              sum + state.items.find((item) => item.id === id)!.weight,
            0,
          ),
        }
      frame.items = state.items.map((item, i) => ({
        id: item.id,
        value: `v=${item.value}`,
        label: `${i + 1}: w=${item.weight}`,
        tone: state.chosen.includes(item.id)
          ? 'settled'
          : !complete &&
              i + 1 ===
                (state.phase === 'backtrack' ? state.backtrackRow : state.row)
            ? 'active'
            : 'muted',
      }))
    }
    if (this.state.kind === 'maxflow') {
      const previous = this.history.at(-1)
      if (
        this.actions.at(-1)?.type === 'augment' &&
        previous?.kind === 'maxflow'
      ) {
        for (const edge of labFrame(previous).edges ?? [])
          if (
            edge.tone === 'active' &&
            !frame.edges?.some(
              (current) => current.from === edge.from && current.to === edge.to,
            )
          ) {
            frame.edges?.push({ ...edge, weight: 0, saturated: true })
          }
      }
      if (!complete && this.state.phase !== 'bottleneck')
        delete frame.counters.bottleneck
      if (complete)
        frame.counters = {
          flow: this.state.total,
          cutCapacity: (frame.result as { cutCapacity: number }).cutCapacity,
        }
    }
    for (const key of Object.keys(frame.counters))
      if (frame.counters[key] === '') delete frame.counters[key]
    const marks = new Set(this.feedback.targets ?? [])
    const mistakes = new Set(this.attemptedTargets)
    frame.nodes = frame.nodes?.map((node) =>
      mistakes.has(`node:${node.id}`)
        ? { ...node, tone: 'red' }
        : marks.has(`node:${node.id}`)
          ? { ...node, tone: 'active' }
          : node,
    )
    frame.edges = frame.edges?.map((edge) =>
      mistakes.has(`edge:${edge.from}:${edge.to}`)
        ? { ...edge, tone: 'red' }
        : marks.has(`edge:${edge.from}:${edge.to}`)
          ? { ...edge, tone: 'active' }
          : edge,
    )
    if (
      this.state.kind === 'knapsack' &&
      frame.matrix &&
      ['decision', 'backtrack'].includes(this.state.phase)
    ) {
      const row =
        this.state.phase === 'decision'
          ? this.state.selected!.row
          : this.state.backtrackRow
      const capacity =
        this.state.phase === 'decision'
          ? this.state.selected!.capacity
          : this.state.backtrackCapacity
      const item = this.state.items[row - 1]
      frame.matrix.links = [
        { from: [row - 1, capacity], to: [row, capacity] },
        ...(item.weight <= capacity
          ? [
              {
                from: [row - 1, capacity - item.weight] as [number, number],
                to: [row, capacity] as [number, number],
              },
            ]
          : []),
      ]
    }
    const targetChoices = new Map<string, LabChoice[]>()
    choices.forEach((choice) =>
      choice.targets?.forEach((target) =>
        targetChoices.set(target, [
          ...(targetChoices.get(target) ?? []),
          choice,
        ]),
      ),
    )
    const uniqueTargets = [...targetChoices]
      .filter(([, list]) => list.length === 1)
      .map(([target]) => target)
    this.view.setInteraction(
      uniqueTargets,
      (target) => {
        const choice = targetChoices.get(target)?.[0]
        if (choice) this.act(choice.action)
      },
      this.feedbackError ? this.attemptedTargets : this.feedback.targets,
      this.feedbackError,
    )
    this.view.container.position.set(pad + 10, viewY + 10)
    this.view.update(frame, mainW - 20, viewH - 20)
    const choiceY = viewY + viewH + 25
    makeText(this.chrome, pad, choiceY, text(`lab.phase.${this.state.phase}`), {
      size: 16,
      color: complete ? C.green : C.blue,
      wordWrap: mainW,
    })
    let bottom = choiceY + 36
    if (this.mode === 'demo') {
      button(
        pad,
        bottom,
        200,
        t('course.next'),
        () => this.demoNext(),
        complete,
        true,
      )
      bottom += 58
    } else {
      const cols = Math.max(2, Math.min(3, Math.floor(mainW / 200))),
        gap = 8,
        cw = (mainW - gap * (cols - 1)) / cols
      choices.forEach((choice, i) =>
        button(
          pad + (i % cols) * (cw + gap),
          bottom + Math.floor(i / cols) * 48,
          cw,
          this.choiceLabel(choice),
          () => this.act(choice.action),
        ),
      )
      bottom += Math.ceil(choices.length / cols) * 48 + 12
    }
    makeText(
      this.chrome,
      pad,
      bottom,
      t('lab.stats', {
        steps: this.actions.length,
        hints: this.hints,
        errors: this.errors,
      }),
      { size: 12, color: C.muted, wordWrap: mainW },
    )
    bottom += 40

    let sideY = this.paragraph(
      t('lab.goal'),
      text(`lab.phase.${this.state.phase}`),
      sideX,
      191,
      sideW,
    )
    this.math?.update(
      this.kind === 'maxflow' && !complete
        ? frame.formula
        : missionFormula(labMissions[this.kind], frame),
      this.kind === 'knapsack' ? stateFormula(frame).replace(/^M_/, 'D_') : stateFormula(frame),
      sideX,
      sideY,
      sideW,
      true,
    )
    sideY += Math.max(156, (this.math?.element.offsetHeight ?? 136) + 20)
    sideY = this.paragraph(
      this.hintLevel ? t('lab.hintTitle') : t('lab.feedbackTitle'),
      this.feedbackText(),
      sideX,
      sideY,
      sideW,
      this.feedbackError ? C.orange : C.ink,
    )
    if (complete)
      sideY = this.paragraph(
        t('lab.complete'),
        text(labSummary(this.state).labelKey, labSummary(this.state).vars) +
          '\n' +
          t('lab.completedNote'),
        sideX,
        sideY,
        sideW,
        C.green,
      )
    const range = labParameter(this.kind),
      parameterY = sideY
    makeText(this.chrome, sideX, parameterY, t('lab.parameterTitle'), {
      size: 11,
      color: C.yellow,
    })
    const edge =
      this.kind === 'dijkstra'
        ? this.state.variant
          ? 'b→a'
          : 'a→c'
        : this.state.variant
          ? 's→b'
          : 's→a'
    makeText(
      this.chrome,
      sideX,
      parameterY + 25,
      text(`lab.parameter.${this.kind}`, { value: this.state.parameter, edge }),
      { size: 14, wordWrap: sideW },
    )
    button(
      sideX,
      parameterY + 55,
      96,
      t('lab.parameterMinus'),
      () => this.restart(this.state.parameter - range.step),
      this.state.parameter <= range.min,
    )
    button(
      sideX + 106,
      parameterY + 55,
      96,
      t('lab.parameterPlus'),
      () => this.restart(this.state.parameter + range.step),
      this.state.parameter >= range.max,
    )
    button(
      sideX + 212,
      parameterY + 55,
      114,
      t('lab.parameterReset'),
      () => this.restart(range.default),
      this.state.parameter === range.default,
    )
    sideY = parameterY + 112
    if (this.baseline !== null)
      sideY = this.paragraph(
        t('lab.parameterTitle'),
        complete
          ? t('lab.comparison', {
              before: this.baseline,
              after: labSummary(this.state).value,
            })
          : t('lab.baseline', { value: this.baseline }),
        sideX,
        sideY,
        sideW,
      )
    const controlsY = Math.max(bottom, sideY + 15)
    button(
      pad,
      controlsY,
      162,
      t('lab.undo'),
      () => this.undo(),
      !this.history.length,
    )
    button(pad + 174, controlsY, 162, t('lab.reset'), () => this.restart())
    button(pad + 348, controlsY, 140, t('lab.alternate'), () => {
      this.baseline = null
      const range = labParameter(this.kind)
      const next =
        this.state.parameter + range.step > range.max
          ? range.min
          : this.state.parameter + range.step
      this.restart(next, this.mode === 'challenge' ? 1 : 0)
    })
    if (this.mode !== 'demo')
      button(
        sideX,
        controlsY,
        sideW,
        this.hintLevel ? t('lab.hintMore') : t('lab.showHint'),
        () => this.requestHint(),
        complete,
        true,
      )
    const note = makeText(
      this.chrome,
      pad,
      controlsY + 63,
      this.mode === 'challenge'
        ? t('lab.challengeNote')
        : t('lab.chooseOnDiagram'),
      { size: 12, color: C.faint, wordWrap: w - pad * 2, lineHeight: 21 },
    )
    this.size.height = Math.max(940, controlsY + 74 + note.height + 20)
    this.game.app.canvas.dataset.layoutBounds = JSON.stringify({
      evidenceBottom: bottom - 20,
      sidebarBottom: sideY,
      controlsTop: controlsY,
    })
    this.game.app.canvas.dataset.lab = JSON.stringify({
      kind: this.kind,
      mode: this.mode,
      phase: this.state.phase,
      variant: this.state.variant,
      parameter: this.state.parameter,
      complete,
      steps: this.actions.length,
      hints: this.hints,
      errors: this.errors,
      result: complete ? labSummary(this.state).value : null,
    })
    this.game.setDescription(
      `${zh.lab.kind[this.kind]}. ${zh.lab[this.mode]}. ${text(`lab.phase.${this.state.phase}`)}. ${this.feedbackText()}`,
    )
    const focusLabel = this.hintLevel
      ? t('lab.hintMore')
      : complete
        ? t('lab.alternate')
        : this.mode === 'demo'
          ? t('course.next')
          : choices[0]
            ? this.choiceLabel(choices[0])
            : ''
    const focusAction = actions.find(
      (action) => action.label === focusLabel && !action.disabled,
    )
    if (focusAction) focusAction.focusOnChange = true
    this.game.setActions(actions)
    this.game.updateLayout()
  }

  destroy() {
    this.game.app.canvas.removeEventListener(
      'pointerdown',
      this.focusCanvas,
      true,
    )
    this.game.app.canvas.tabIndex = this.previousTabIndex
    delete this.game.app.canvas.dataset.lab
    this.disposed = true
    this.math?.destroy()
    window.removeEventListener('keydown', this.keyHandler)
    this.view.destroy()
    this.container.destroy({ children: true })
  }
}
