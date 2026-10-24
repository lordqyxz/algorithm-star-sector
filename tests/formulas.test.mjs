import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { courseMissions } from '../src/game/sim.ts'
import { missionFormula, stateFormula } from '../src/game/core/formulas.ts'

const parseMath = (source, label) => {
  assert.ok(source.length > 0, `${label}: formula should not be empty`)
  assert.doesNotThrow(() => katex.renderToString(source, { output: 'mathml', throwOnError: true, trust: false, strict: 'error' }), label)
}

test('every mission reference formula and frame readout parses in strict KaTeX mode', () => {
  assert.equal(courseMissions.length, 104)
  for (const mission of courseMissions) for (const variant of [0, 1]) {
    for (const [index, frame] of mission.trace(variant).entries()) {
      parseMath(missionFormula(mission.id, frame), `${mission.id}/${variant}/reference`)
      parseMath(stateFormula(frame), `${mission.id}/${variant}/frame-${index}`)
    }
  }
})

test('matrix readout uses the selected cell value from the visible table', () => {
  const frame = { op: 'update', formula: 'cell update', counters: {}, matrix: { rows: ['r0','r1'], columns: ['c0','c1'], values: [[4, 17],[8, 29]], active: [1, 0] } }
  const source = stateFormula(frame)
  assert.ok(source.includes('r1') && source.includes('c0'), 'readout follows displayed row and column labels')
  assert.match(source, /8/)
  parseMath(source, 'selected cell')
})

test('state readout reports only current counters or visible collection size', () => {
  assert.equal(stateFormula({ op: 'visit', formula: '', counters: { comparisons: 7, moves: 3, ignored: 4 }, items: [] }), String.raw`\mathrm{comparisons}=7,\quad \mathrm{moves}=3,\quad \mathrm{ignored}=4`)
  assert.equal(stateFormula({ op: 'visit', formula: '', counters: {}, items: [{ id: 'x', value: 9 }] }), String.raw`n=1`)
})
