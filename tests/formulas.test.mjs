import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { courseMissions } from '../src/game/sim.ts'
import { calculationFormula, missionFormula, stateFormula } from '../src/game/core/formulas.ts'

const parseMath = (source, label) => {
  assert.ok(source.length > 0, `${label}: formula should not be empty`)
  assert.doesNotThrow(() => katex.renderToString(source, { output: 'mathml', throwOnError: true, trust: false, strict: 'error' }), label)
}

test('every mission reference formula and frame readout parses in strict KaTeX mode', () => {
  assert.equal(courseMissions.length, 130)
  const calculatedMissions = new Set()
  for (const mission of courseMissions) for (const variant of [0, 1]) {
    for (const [index, frame] of mission.trace(variant).entries()) {
      parseMath(missionFormula(mission.id, frame), `${mission.id}/${variant}/reference`)
      parseMath(stateFormula(frame), `${mission.id}/${variant}/frame-${index}`)
      const calculation = calculationFormula(frame)
      if (/\\[a-zA-Z]+/.test(frame.formula))
        assert.notEqual(calculation, null, `${mission.id}/${variant}/calculation-${index}: raw TeX must not be shown as prose`)
      if (calculation !== null) {
        calculatedMissions.add(mission.id)
        parseMath(calculation, `${mission.id}/${variant}/calculation-${index}`)
      }
    }
  }
  for (const id of ['ppt-divide-max-subarray', 'ppt-dp-multistage-longest', 'ppt-graph-bipartite-color', 'ppt-dp-lis', 'ppt-dp-weighted-interval', 'ppt-dp-rod-cutting', 'ppt-divide-market'])
    assert.ok(calculatedMissions.has(id), `${id}: frame calculations should render as TeX`)
})

test('calculation formula normalizes a double-escaped quad without damaging aligned line breaks', () => {
  const frame = (formula) => ({ op: 'update', formula, counters: {} })
  assert.equal(calculationFormula(frame(String.raw`R_n=1;\\quad C_n=2`)), String.raw`R_n=1;\quad C_n=2`)
  const aligned = String.raw`\begin{aligned}a&=1\\\quad b&=2\end{aligned}`
  assert.equal(calculationFormula(frame(aligned)), aligned)
  parseMath(calculationFormula(frame(aligned)), 'aligned newline')
  assert.equal(calculationFormula(frame('Compare two candidates, then keep the larger one.')), null)
})

test('matrix readout uses the selected cell value from the visible table', () => {
  const frame = { op: 'update', formula: 'cell update', counters: {}, matrix: { rows: ['r0','r1'], columns: ['c0','c1'], values: [[4, 17],[8, 29]], active: [1, 0] } }
  const source = stateFormula(frame)
  assert.ok(source.includes('r1') && source.includes('c0'), 'readout follows displayed row and column labels')
  assert.match(source, /8/)
  parseMath(source, 'selected cell')
})

test('state readout reports only current counters or visible collection size', () => {
  assert.equal(stateFormula({ op: 'visit', formula: '', counters: { comparisons: 7, moves: 3, ignored: 4 }, items: [] }), String.raw`\begin{aligned}\mathrm{comparisons}=7\\ \mathrm{moves}=3\\ \mathrm{ignored}=4\end{aligned}`)
  assert.equal(stateFormula({ op: 'visit', formula: '', counters: {}, items: [{ id: 'x', value: 9 }] }), String.raw`n=1`)
})
