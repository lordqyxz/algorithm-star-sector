import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { Game } from './app'
import { t } from '../locale'

/** A typeset measurement overlay owned and disposed by the Pixi scene, with native MathML. */
export class FormulaView {
  readonly element = document.createElement('div')
  private reference = document.createElement('div')
  private state = document.createElement('div')
  private previous = ['', '']

  constructor(game: Game) {
    this.element.className = 'formula-layer'
    const referenceLabel = document.createElement('div')
    referenceLabel.className = 'formula-label'
    referenceLabel.textContent = t('course.mathReference')
    const stateLabel = document.createElement('div')
    stateLabel.className = 'formula-label'
    stateLabel.textContent = t('course.mathState')
    this.reference.className = this.state.className = 'formula-equation'
    this.element.append(referenceLabel, this.reference, stateLabel, this.state)
    game.mountOverlay(this.element)
  }

  update(reference: string, state: string, x: number, y: number, width: number, visible: boolean) {
    this.element.hidden = !visible
    if (!visible) return
    this.element.style.left = `${x}px`
    this.element.style.top = `${y}px`
    this.element.style.width = `${width}px`
    const options = { displayMode: true, output: 'htmlAndMathml' as const, throwOnError: true, trust: false, strict: 'error' as const }
    if (reference !== this.previous[0]) katex.render(reference, this.reference, options)
    if (state !== this.previous[1]) katex.render(state, this.state, options)
    this.previous = [reference, state]
  }

  destroy() { this.element.remove() }
}
