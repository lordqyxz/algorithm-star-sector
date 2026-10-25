import { Container, Graphics } from 'pixi.js'
import type { Game, GameAction, GameScene } from '../core/app'
import { C, MONO, makeButton, makePanel, makeText } from '../core/ui'
import { TraceView } from '../core/trace-view'
import type { FormulaView } from '../core/formula-view'
import {
  experimentChoices, applyExperiment, experimentFrame, experimentReport,
  experimentFields, experimentFormula, experimentReading,
  type ExperimentKind, type ExperimentState,
} from '../sim'
import type { ExperimentChoice, ExperimentFact } from '../simulation/experiment-types'
import {
  loadExperimentSession, saveExperimentSession, experimentSessionState,
  commitExperiment, seekExperiment, pinExperiment, changeExperimentInput, swapExperimentBranches,
} from '../experiment-session'
import { t, type TextKey } from '../locale'
import { CourseMapScene } from './CourseMapScene'
import { LabScene } from './LabScene'
import { recordExperimentExposure } from '../experiment-exposure'
import { loadLabSave } from '../save'

const kinds: ExperimentKind[] = ['dijkstra', 'knapsack', 'maxflow', 'reduction']
const word = (key: string, vars: Record<string, string | number> = {}) => t(key as TextKey, vars)
const factText = (fact: ExperimentFact) => word(fact.key, fact.vars)
const toneColor = (tone?: ExperimentFact['tone']) =>
  tone === 'bad' ? C.orange : tone === 'caution' ? C.yellow : tone === 'witness' ? C.purple : tone === 'good' ? C.green : C.muted
const pageSize = 6

/** A native Pixi workbench; all transitions come from the deterministic adapters. */
export class ExperimentScene implements GameScene {
  readonly container = new Container()
  readonly backdropAlpha = 0.96
  size = { width: 1440, height: 1160 }
  private chrome = new Container()
  private view = new TraceView()
  private previewView = new TraceView()
  private math: FormulaView | null = null
  private sessions = Object.fromEntries(kinds.map(kind => [kind, loadExperimentSession(kind)])) as Record<ExperimentKind, ReturnType<typeof loadExperimentSession>>
  private kind: ExperimentKind
  private selected: string | null = null
  private previewMode = false
  private page = 0
  private evidenceOpen = false
  private inputOpen = false
  private inputForm = document.createElement('form')
  private amountControl = document.createElement('label')
  private amountInput = document.createElement('input')
  private amount = 1
  private feedback: ExperimentFact | null = null
  private disposed = false
  private width = 0
  private previousTabIndex: number
  private readonly focusCanvas = () => this.game.app.canvas.focus({ preventScroll: true })
  private keyHandler: (event: KeyboardEvent) => void

  constructor(private game: Game, kind: ExperimentKind = 'dijkstra') {
    this.kind = kind
    this.container.addChild(this.chrome, this.view.container, this.previewView.container)
    this.previousTabIndex = game.app.canvas.tabIndex
    game.app.canvas.tabIndex = 0
    game.app.canvas.addEventListener('pointerdown', this.focusCanvas, true)
    this.inputForm.className = 'experiment-input-form'
    this.inputForm.hidden = true
    this.inputForm.addEventListener('submit', this.applyInput)
    game.mountOverlay(this.inputForm)
    this.amountControl.className = 'experiment-amount-control'
    this.amountControl.textContent = word('experiment.ui.augmentAmount')
    this.amountInput.type = 'number'
    this.amountInput.min = '1'
    this.amountInput.step = '1'
    this.amountInput.addEventListener('change', this.changeAmount)
    this.amountControl.append(this.amountInput)
    this.amountControl.hidden = true
    game.mountOverlay(this.amountControl)
    this.keyHandler = event => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (document.querySelector('[aria-modal="true"]')) return
      if (event.key === 'Escape') {
        if (this.inputOpen) this.toggleInput(false)
        else this.back()
        return
      }
      if (event.target instanceof HTMLElement && event.target.closest('input,button,select')) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); this.seek(-1) }
      else if (event.key === 'ArrowRight') { event.preventDefault(); this.seek(1) }
      else if (event.key.toLowerCase() === 'r') { event.preventDefault(); this.restart() }
      else if (event.key === 'Enter' && this.selected) { event.preventDefault(); this.execute() }
    }
    window.addEventListener('keydown', this.keyHandler)
    this.resize(game.width)
    void import('../core/formula-view').then(({ FormulaView }) => {
      if (this.disposed) return
      this.math = new FormulaView(game)
      this.draw()
    }).catch(error => { if (!this.disposed) console.error('Formula renderer failed', error) })
  }

  private get session() { return this.sessions[this.kind] }
  private get state() { return experimentSessionState(this.session) }
  private persist() { saveExperimentSession(this.session) }

  resize(width: number) {
    const next = Math.max(900, Math.round(width))
    if (next === this.width) return
    this.width = next
    this.size.width = next
    this.draw()
  }

  private back() {
    this.game.switch(game => new CourseMapScene(game, this.kind === 'knapsack' ? 'dynamic' : this.kind === 'reduction' ? 'complexity' : 'graphs'))
  }

  private switchKind(kind: ExperimentKind) {
    if (kind === this.kind) return
    this.inputOpen = false
    this.inputForm.hidden = true
    this.kind = kind
    this.selected = null
    this.previewMode = false
    this.page = 0
    this.feedback = null
    this.draw()
  }

  private select(choice: ExperimentChoice) {
    recordExperimentExposure(this.state)
    this.selected = choice.id
    this.previewMode = true
    if (choice.action.type === 'augment') this.amount = this.bottleneck()
    this.feedback = null
    this.draw()
  }

  private bottleneck() {
    return experimentChoices(this.state).find(choice => choice.action.type === 'augment')?.action.amount ?? 1
  }

  private readonly changeAmount = () => {
    const value = this.amountInput.valueAsNumber
    if (!Number.isInteger(value)) return
    this.amount = value
    this.draw()
  }

  private action(choice: ExperimentChoice) {
    return choice.action.type === 'augment' ? { ...choice.action, amount: this.amount } : choice.action
  }

  private execute() {
    const choice = experimentChoices(this.state).find(item => item.id === this.selected)
    if (!choice) return
    const { session, result } = commitExperiment(this.session, this.action(choice))
    this.sessions[this.kind] = session
    this.feedback = result.feedback
    if (result.changed) {
      this.selected = null
      this.previewMode = false
    }
    this.persist()
    this.draw()
  }

  private seek(delta: number) {
    const next = Math.max(0, Math.min(this.session.active.actions.length, this.session.active.cursor + delta))
    if (next === this.session.active.cursor) return
    this.sessions[this.kind] = seekExperiment(this.session, next)
    this.selected = null
    this.previewMode = false
    this.feedback = null
    this.persist()
    this.draw()
  }

  private restart() {
    this.sessions[this.kind] = seekExperiment(this.session, 0)
    this.selected = null
    this.previewMode = false
    this.feedback = null
    this.persist()
    this.draw()
  }

  private pin() {
    this.sessions[this.kind] = pinExperiment(this.session)
    this.persist()
    this.draw()
  }

  private swap() {
    if (!this.session.comparison) return
    this.sessions[this.kind] = swapExperimentBranches(this.session)
    this.selected = null
    this.previewMode = false
    this.feedback = null
    this.persist()
    this.draw()
  }

  private alternate() {
    this.sessions[this.kind] = changeExperimentInput(this.session, {}, this.state.variant === 0 ? 1 : 0)
    this.selected = null
    this.previewMode = false
    this.feedback = null
    this.persist()
    this.draw()
  }

  private toggleInput(open: boolean) {
    this.inputOpen = open
    this.inputForm.hidden = !open
    if (open) this.renderInputForm()
    this.draw()
  }

  private renderInputForm() {
    const fields = experimentFields(this.state)
    this.inputForm.replaceChildren()
    const heading = document.createElement('h3')
    heading.textContent = word('experiment.ui.inputTitle')
    this.inputForm.append(heading)
    const description = document.createElement('p')
    description.textContent = word('experiment.ui.inputDraftNote')
    this.inputForm.append(description)
    const grid = document.createElement('div')
    grid.className = 'experiment-input-grid'
    for (const field of fields) {
      const label = document.createElement('label')
      label.textContent = word(field.key, field.vars)
      const input = document.createElement('input')
      input.type = 'number'
      input.name = field.id
      input.value = String(field.value)
      input.min = String(field.min)
      input.max = String(field.max)
      input.step = String(field.step)
      input.required = true
      label.append(input)
      grid.append(label)
    }
    this.inputForm.append(grid)
    const controls = document.createElement('div')
    controls.className = 'experiment-input-controls'
    const apply = document.createElement('button')
    apply.type = 'submit'
    apply.textContent = word('experiment.ui.applyInput')
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = word('experiment.ui.cancel')
    cancel.addEventListener('click', () => this.toggleInput(false))
    controls.append(apply, cancel)
    this.inputForm.append(controls)
  }

  private readonly applyInput = (event: Event) => {
    event.preventDefault()
    const input: Record<string, number> = {}
    for (const field of experimentFields(this.state)) {
      const control = this.inputForm.elements.namedItem(field.id)
      if (!(control instanceof HTMLInputElement)) return
      const value = control.valueAsNumber
      if (!Number.isFinite(value) || value < field.min || value > field.max || (value - field.min) % field.step !== 0) {
        control.reportValidity()
        return
      }
      input[field.id] = value
    }
    try {
      this.sessions[this.kind] = changeExperimentInput(this.session, input)
      this.selected = null
      this.previewMode = false
      this.feedback = null
      this.persist()
      this.toggleInput(false)
    } catch {
      const paragraph = this.inputForm.querySelector('p')
      if (paragraph) paragraph.textContent = word('experiment.ui.inputError')
    }
  }

  private target(choice: ExperimentChoice, state: ExperimentState, hit = false): string[] {
    return (hit ? choice.hitTargets ?? choice.targets ?? [] : choice.targets ?? []).flatMap(raw => {
      if (raw.startsWith('node:') || raw.startsWith('cell:') || raw.startsWith('item:') || raw.startsWith('group:')) return [raw]
      if (raw.startsWith('edge:')) {
        const id = raw.slice(5)
        const edges = 'edges' in state ? state.edges : []
        const reverse = id.startsWith('rev:')
        const edge = edges.find(item => item.id === (reverse ? id.slice(4) : id))
        if (edge && 'from' in edge) return [`edge:${reverse ? edge.to : edge.from}:${reverse ? edge.from : edge.to}`]
        return []
      }
      if (raw.startsWith('e:') && state.kind === 'reduction') {
        const edge = state.edges.find(item => item.id === raw.slice(2))
        return edge ? [`edge:v:${edge.u}:v:${edge.v}`] : []
      }
      if (raw.includes(':') && state.kind === 'reduction') return [`node:${raw}`]
      if (/^\d+:\d+$/.test(raw)) return [`cell:${raw}`]
      if (raw.startsWith('item')) return [`item:${raw}`]
      return []
    })
  }

  private paragraph(label: string, content: string, x: number, y: number, width: number, color: number = C.muted) {
    makeText(this.chrome, x, y, label, { size: 11, color: C.yellow })
    const body = makeText(this.chrome, x, y + 22, content, { size: 13, color, wordWrap: width, lineHeight: 21 })
    return y + 22 + body.height + 20
  }

  private draw() {
    this.chrome.removeChildren().forEach(child => child.destroy({ children: true }))
    const state = this.state
    const choices = experimentChoices(state)
    const selected = choices.find(choice => choice.id === this.selected) ?? null
    if (!selected) { this.selected = null; this.previewMode = false }
    const preview = selected ? applyExperiment(state, this.action(selected)) : null
    const report = experimentReport(state)
    const frame = experimentFrame(state)
    const previewFrame = preview?.changed ? experimentFrame(preview.state) : frame
    const previewReport = preview?.changed ? experimentReport(preview.state) : null
    const w = this.width, pad = 32, sideW = 332, gap = 26
    const sideX = w - pad - sideW
    const mainW = sideX - gap - pad
    const actions: GameAction[] = []
    const button = (x: number, y: number, width: number, label: string, run: () => void, disabled = false, solid = false) => {
      makeButton(this.chrome, { x, y, w: width, h: 39, label, size: 12, variant: solid ? 'solid' : 'outline', onTap: run }).setEnabled(!disabled)
      actions.push({ label, run, disabled })
    }

    button(pad, 22, 158, word('experiment.ui.back'), () => this.back())
    if (this.kind !== 'reduction') {
      const labKind = this.kind
      button(pad + 170, 22, 168, word('experiment.ui.guided'), () => this.game.switch(game => new LabScene(game, labKind)))
    }
    button(382, 22, 110, word('experiment.ui.undo'), () => this.seek(-1), this.session.active.cursor === 0)
    button(502, 22, 110, word('experiment.ui.redo'), () => this.seek(1), this.session.active.cursor === this.session.active.actions.length)
    button(622, 22, 120, word('experiment.ui.pin'), () => this.pin())
    if (this.session.comparison) button(752, 22, 145, word('experiment.ui.swap'), () => this.swap())
    button(w - pad - 282, 22, 136, word('experiment.ui.editInput'), () => this.toggleInput(!this.inputOpen))
    button(w - pad - 136, 22, 136, word('experiment.ui.alternate'), () => this.alternate())
    makeText(this.chrome, pad, 77, word('experiment.ui.kicker'), { size: 11, family: MONO, color: C.yellow })
    makeText(this.chrome, pad, 100, word(`experiment.kinds.${this.kind}`), { size: 29, color: C.ink })
    kinds.forEach((kind, index) => button(pad + index * ((w - pad * 2 - 24) / 4 + 8), 151,
      (w - pad * 2 - 24) / 4, word(`experiment.kinds.${kind}`), () => this.switchKind(kind), false, kind === this.kind))
    if (this.kind !== 'reduction' && loadLabSave()[this.kind]) makeText(this.chrome, pad, 197, word('experiment.ui.legacyNote'), { size: 11, color: C.faint, wordWrap: mainW })

    const viewY = 218
    const maxFrameH = Math.max(this.view.minimumHeight(frame, mainW - 20, 'graph', true),
      ...choices.map(choice => {
        const result = applyExperiment(state, this.action(choice))
        return result.changed ? this.previewView.minimumHeight(experimentFrame(result.state), mainW - 20, 'graph', true) : 0
      }))
    const viewH = Math.max(385, maxFrameH + 55)
    const showPreview = !!selected && this.previewMode
    makePanel(this.chrome, pad, viewY, mainW, viewH, { alpha: 0.91, stroke: showPreview ? C.yellow : C.border })
    if (showPreview) {
      const dashes = new Graphics()
      for (let x = pad + 6; x < pad + mainW - 6; x += 19) {
        dashes.moveTo(x, viewY + 2).lineTo(Math.min(x + 9, pad + mainW - 6), viewY + 2)
        dashes.moveTo(x, viewY + viewH - 2).lineTo(Math.min(x + 9, pad + mainW - 6), viewY + viewH - 2)
      }
      for (let dy = viewY + 6; dy < viewY + viewH - 6; dy += 19) {
        dashes.moveTo(pad + 2, dy).lineTo(pad + 2, Math.min(dy + 9, viewY + viewH - 6))
        dashes.moveTo(pad + mainW - 2, dy).lineTo(pad + mainW - 2, Math.min(dy + 9, viewY + viewH - 6))
      }
      dashes.stroke({ width: 1, color: C.yellow, alpha: 0.58 })
      this.chrome.addChild(dashes)
    }
    makeText(this.chrome, pad + 15, viewY + 12, word(showPreview ? 'experiment.ui.preview' : 'experiment.ui.current'), {
      size: 11, family: MONO, color: showPreview ? C.yellow : C.blue,
    })
    if (selected) {
      button(pad + mainW - 258, viewY + 7, 120, word('experiment.ui.showCurrent'), () => { this.previewMode = false; this.draw() }, false, !showPreview)
      button(pad + mainW - 131, viewY + 7, 120, word('experiment.ui.showPreview'), () => { this.previewMode = true; this.draw() }, false, showPreview)
    }
    const targetChoices = new Map<string, ExperimentChoice>()
    for (const choice of choices) for (const target of this.target(choice, state, true)) if (!targetChoices.has(target)) targetChoices.set(target, choice)
    this.view.container.visible = !showPreview
    this.view.setInteraction([...targetChoices.keys()], target => {
      const choice = targetChoices.get(target)
      if (choice) this.select(choice)
    }, selected ? this.target(selected, state) : this.feedback?.targets?.flatMap(target => this.target({ id: '', key: '', action: { type: '' }, targets: [target] }, state)) ?? [], this.feedback?.tone === 'bad')
    this.view.container.position.set(pad + 10, viewY + 45)
    this.view.update(frame, mainW - 20, viewH - 55, 'graph', true)
    this.previewView.container.visible = showPreview
    if (selected) {
      this.previewView.setInteraction([...targetChoices.keys()], target => {
        const choice = targetChoices.get(target)
        if (choice) this.select(choice)
      }, this.target(selected, preview!.state))
      this.previewView.container.position.set(pad + 10, viewY + 45)
      this.previewView.update(previewFrame, mainW - 20, viewH - 55, 'graph', true)
    }

    let y = viewY + viewH + 17

    const choicePages = Math.max(1, Math.ceil(choices.length / pageSize))
    this.page = Math.min(this.page, choicePages - 1)
    makeText(this.chrome, pad, y, word('experiment.ui.choose'), { size: 11, family: MONO, color: C.yellow })
    makeText(this.chrome, pad + mainW, y, word('experiment.ui.page', { n: this.page + 1, total: choicePages }), { size: 11, family: MONO, color: C.muted, anchorX: 1 })
    y += 26
    const rowW = (mainW - 12) / 2
    choices.slice(this.page * pageSize, this.page * pageSize + pageSize).forEach((choice, index) => {
      button(pad + (index % 2) * (rowW + 12), y + Math.floor(index / 2) * 47, rowW,
        word(choice.key, choice.vars), () => this.select(choice), false, selected?.id === choice.id)
    })
    y += Math.ceil(Math.min(pageSize, choices.length - this.page * pageSize) / 2) * 47 + 5
    if (choicePages > 1) {
      button(pad, y, 118, word('experiment.ui.previousPage'), () => { this.page = (this.page - 1 + choicePages) % choicePages; this.draw() })
      button(pad + mainW - 118, y, 118, word('experiment.ui.nextPage'), () => { this.page = (this.page + 1) % choicePages; this.draw() })
      y += 52
    }
    const choicesBottom = y

    let sideY = viewY
    sideY = this.paragraph(word('experiment.ui.selected'), selected ? word(selected.key, selected.vars) : word('experiment.ui.noneSelected'), sideX, sideY, sideW, selected ? C.ink : C.faint)
    this.amountControl.hidden = selected?.action.type !== 'augment'
    if (!this.amountControl.hidden) {
      this.amountControl.style.left = `${sideX}px`
      this.amountControl.style.top = `${sideY}px`
      this.amountControl.style.width = `${sideW}px`
      this.amountInput.max = String(this.bottleneck())
      this.amountInput.value = String(this.amount)
      sideY += 54
    }
    sideY = this.paragraph(word('experiment.ui.impact'), selected ? factText(preview!.feedback) : word('experiment.ui.impactPrompt'), sideX, sideY, sideW, preview ? toneColor(preview.feedback.tone) : C.muted)
    if (selected) {
      const note = makeText(this.chrome, sideX, sideY, word('experiment.ui.previewNoCost'), { size: 11, color: C.faint, wordWrap: sideW, lineHeight: 17 })
      sideY += note.height + 16
    }
    button(sideX, sideY, 176, word('experiment.ui.execute'), () => this.execute(), !selected, true)
    button(sideX + 186, sideY, sideW - 186, word('experiment.ui.cancel'), () => { this.selected = null; this.previewMode = false; this.draw() }, !selected)
    sideY += 65
    if (this.feedback && !showPreview) sideY = this.paragraph(word('experiment.ui.lastAction'), factText(this.feedback), sideX, sideY, sideW, toneColor(this.feedback.tone))
    const shownState = showPreview && preview?.changed ? preview.state : state
    const shownReport = showPreview && previewReport ? previewReport : report
    const shownFeasibility = showPreview && preview && !preview.changed ? preview.feedback : shownReport.feasibility
    sideY = this.paragraph(word(showPreview ? 'experiment.ui.previewSummary' : 'experiment.ui.currentSummary'), factText(shownReport.summary), sideX, sideY, sideW)
    const formulaY = sideY
    const formula = experimentFormula(shownState)
      .replaceAll('←', String.raw`\leftarrow `)
      .replaceAll('→', String.raw`\to `)
    this.math?.update(formula, experimentReading(shownState), sideX, formulaY, sideW, !this.inputOpen, word(showPreview ? 'experiment.ui.previewMath' : 'course.mathState'))
    sideY += Math.max(142, (this.math?.element.offsetHeight ?? 130) + 14)
    sideY = this.paragraph(word(showPreview ? 'experiment.ui.previewFeasibility' : 'experiment.ui.feasibility'), factText(shownFeasibility), sideX, sideY, sideW, toneColor(shownFeasibility.tone))
    sideY = this.paragraph(word(showPreview ? 'experiment.ui.previewStrategy' : 'experiment.ui.strategy'), factText(shownReport.strategy), sideX, sideY, sideW, toneColor(shownReport.strategy.tone))
    sideY = this.paragraph(word(showPreview ? 'experiment.ui.previewConclusion' : 'experiment.ui.conclusion'), factText(shownReport.conclusion), sideX, sideY, sideW, toneColor(shownReport.conclusion.tone))
    makeText(this.chrome, sideX, sideY, word('experiment.ui.cost'), { size: 11, color: C.yellow })
    sideY += 25
    for (const [cost, value] of Object.entries(state.costs)) {
      const delta = showPreview && preview?.changed ? (preview.state.costs[cost] ?? value) - value : 0
      makeText(this.chrome, sideX, sideY, `${word(`experiment.cost.${cost}`)}  ${value}${delta ? ` · ${word('experiment.ui.estimatedDelta', { n: delta })}` : ''}`, { size: 12, color: C.muted, wordWrap: sideW })
      sideY += 21
    }
    button(sideX, sideY + 4, sideW, this.evidenceOpen ? word('experiment.ui.hideEvidence') : word('experiment.ui.showEvidence'), () => { this.evidenceOpen = !this.evidenceOpen; this.draw() })
    sideY += 54
    let mainBottom = choicesBottom
    if (this.evidenceOpen) {
      const evidenceY = choicesBottom + 18
      const panel = makePanel(this.chrome, pad, evidenceY, mainW, 1, { alpha: 0.88 })
      makeText(this.chrome, pad + 15, evidenceY + 14, word('experiment.ui.evidenceTitle'), { size: 11, color: C.yellow })
      let evidenceBottom = evidenceY + 42
      for (const evidence of shownReport.evidence) {
        const body = makeText(this.chrome, pad + 15, evidenceBottom, factText(evidence), { size: 13, color: toneColor(evidence.tone), wordWrap: mainW - 30, lineHeight: 21 })
        evidenceBottom += body.height + 15
      }
      mainBottom = evidenceBottom + 2
      panel.clear().roundRect(pad, evidenceY, mainW, mainBottom - evidenceY, 3).fill({ color: C.panel, alpha: 0.88 }).stroke({ width: 1, color: C.border })
    }

    const bottomY = Math.max(mainBottom + 18, sideY + 12)
    const historyPanel = makePanel(this.chrome, pad, bottomY, w - pad * 2, 1, { alpha: 0.88 })
    makeText(this.chrome, pad + 15, bottomY + 13, word('experiment.ui.timeline', { n: this.session.active.cursor, total: this.session.active.actions.length, attempts: this.session.attempts }), { size: 12, family: MONO, color: C.blue })
    let historyBottom = bottomY + 45
    if (this.session.comparison) {
      const baseline = experimentSessionState(this.session, true)
      const baselineReport = experimentReport(baseline)
      const a = this.session.comparison
      const b = this.session.active
      const inputKeys = [...new Set([...Object.keys(a.input), ...Object.keys(b.input)])].sort()
      const inputDiff = inputKeys.filter(key => a.input[key] !== b.input[key])
      const sameInput = a.variant === b.variant && inputDiff.length === 0
      const fieldNames = new Map(experimentFields(state).map(field => [field.id, word(field.key, field.vars)]))
      const diffText = [
        ...(a.variant === b.variant ? [] : [`${word('experiment.ui.variant')}: ${a.variant + 1}→${b.variant + 1}`]),
        ...inputDiff.map(key => `${fieldNames.get(key) ?? key}: ${a.input[key] ?? '—'}→${b.input[key] ?? '—'}`),
      ].join('  ·  ')
      const compareX = pad + 15, compareW = w - pad * 2 - 30
      let compareY = bottomY + 42
      const inputTitle = makeText(this.chrome, compareX, compareY, word(sameInput ? 'experiment.ui.sameInput' : 'experiment.ui.differentInput'), { size: 12, color: sameInput ? C.blue : C.yellow, wordWrap: compareW, lineHeight: 19 })
      compareY += inputTitle.height + 5
      const policyNotice = makeText(this.chrome, compareX, compareY, word('experiment.ui.comparisonPolicy'), { size: 11, color: C.faint, wordWrap: compareW, lineHeight: 18 })
      compareY += policyNotice.height + 7
      if (diffText) {
        const differences = makeText(this.chrome, compareX, compareY, diffText, { size: 11, color: C.muted, wordWrap: compareW, lineHeight: 18 })
        compareY += differences.height + 7
      }
      const conclusion = makeText(this.chrome, compareX, compareY, `${word('experiment.ui.baselineConclusion')}: ${factText(baselineReport.conclusion)}`, { size: 11, color: toneColor(baselineReport.conclusion.tone), wordWrap: compareW, lineHeight: 18 })
      compareY += conclusion.height + 5
      const overview = makeText(this.chrome, compareX, compareY, `A: ${factText(baselineReport.summary)}  /  B: ${factText(report.summary)}`, { size: 11, color: C.faint, wordWrap: compareW, lineHeight: 18 })
      compareY += overview.height + 10
      makeText(this.chrome, compareX, compareY, word('experiment.ui.costComparison'), { size: 11, color: C.yellow })
      compareY += 22
      const costKeys = [...new Set([...Object.keys(baseline.costs), ...Object.keys(state.costs)])].sort()
      const costW = (compareW - 24) / 3
      for (let index = 0; index < costKeys.length; index += 3) {
        let rowHeight = 0
        for (let col = 0; col < 3 && index + col < costKeys.length; col++) {
          const key = costKeys[index + col]
          const costText = makeText(this.chrome, compareX + col * (costW + 12), compareY,
            `${word(`experiment.cost.${key}`)}  A ${baseline.costs[key] ?? 0} → B ${state.costs[key] ?? 0}`, { size: 11, color: C.muted, wordWrap: costW, lineHeight: 17 })
          rowHeight = Math.max(rowHeight, costText.height)
        }
        compareY += rowHeight + 5
      }
      historyBottom = Math.max(historyBottom, compareY + 15)
    } else {
      const prompt = makeText(this.chrome, pad + 15, bottomY + 43, word('experiment.ui.pinPrompt'), { size: 12, color: C.faint, wordWrap: w - pad * 2 - 30, lineHeight: 19 })
      historyBottom = Math.max(historyBottom, prompt.y + prompt.height + 15)
    }
    historyPanel.clear().roundRect(pad, bottomY, w - pad * 2, historyBottom - bottomY, 3).fill({ color: C.panel, alpha: 0.88 }).stroke({ width: 1, color: C.border })

    this.size.height = Math.max(1100, historyBottom + 22)
    this.inputForm.style.left = `${sideX}px`
    this.inputForm.style.top = '72px'
    this.inputForm.style.width = `${sideW}px`
    this.game.app.canvas.dataset.experiment = JSON.stringify({
      kind: this.kind, steps: this.session.active.cursor, total: this.session.active.actions.length,
      attempts: this.session.attempts, preview: selected?.id ?? null,
      comparison: !!this.session.comparison, activeId: this.session.active.id,
      comparisonId: this.session.comparison?.id ?? null,
      variant: state.variant, verified: state.verified,
      policy: state.policy, costs: state.costs,
      reportkeys: [report.feasibility.key, report.strategy.key, report.conclusion.key, ...report.evidence.map(item => item.key)],
    })
    this.game.setDescription(`${word(`experiment.kinds.${this.kind}`)}. ${factText(report.feasibility)}. ${factText(report.strategy)}. ${factText(report.conclusion)}. ${factText(report.summary)}`)
    this.game.setActions(actions)
    this.game.updateLayout()
  }

  destroy() {
    this.disposed = true
    this.game.app.canvas.removeEventListener('pointerdown', this.focusCanvas, true)
    this.game.app.canvas.tabIndex = this.previousTabIndex
    delete this.game.app.canvas.dataset.experiment
    this.inputForm.removeEventListener('submit', this.applyInput)
    this.inputForm.remove()
    this.amountInput.removeEventListener('change', this.changeAmount)
    this.amountControl.remove()
    window.removeEventListener('keydown', this.keyHandler)
    this.math?.destroy()
    this.view.destroy()
    this.previewView.destroy()
    this.container.destroy({ children: true })
  }
}
