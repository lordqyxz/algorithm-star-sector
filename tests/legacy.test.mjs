import test from 'node:test'
import assert from 'node:assert/strict'
import { gameLevels } from '../src/game/levels.ts'
import { canExecute, executeCommand, initialExecuteState, foldExecute, initProgram, programStep, initProbe, probeAt, initMerge, mergePick } from '../src/game/sim.ts'

test('every original execute variant completes at its stated optimum and replays/undoes its command log', () => {
  for (const level of gameLevels.filter(level => level.kind === 'execute')) for (const variant of level.variants) {
    let state = initialExecuteState(variant)
    const commands = []
    let guard = 300
    while (!state.done && guard--) {
      const type = !state.held ? 'pick' : state.hole === 0 || state.verdict === 'less-equal' ? 'drop' : state.verdict === 'greater' ? 'shift' : 'compare'
      assert.ok(canExecute(state, type))
      commands.push({ type })
      state = executeCommand(state, { type })
    }
    assert.ok(state.done, variant.id)
    assert.deepEqual(state.cells.map(cell => cell.value), [...variant.cells].sort((a, b) => a - b))
    assert.equal(state.moves, variant.par.moves)
    assert.equal(state.compares, variant.par.compares)
    assert.deepEqual(foldExecute(variant, commands), state)
    assert.notDeepEqual(foldExecute(variant, commands.slice(0, -1)), state)
    assert.equal(initialExecuteState(variant).moves, 0)
  }
})

test('the original command, probe and merge missions retain their complete path', () => {
  const command = gameLevels.find(level => level.kind === 'command')
  let ps = initProgram()
  for (let i = 0; i < 200 && !ps.finished; i++) ps = programStep(command.variants[0], command.cards, ps).ps
  assert.ok(ps.finished)
  const probe = gameLevels.find(level => level.kind === 'probe')
  const input = probe.variants[0]
  let state = initProbe(input.cells)
  while (!state.done) state = probeAt(input.cells, input.target, state, Math.floor((state.low + state.high) / 2))
  assert.ok(state.found)
  assert.ok(state.attempts.length <= probe.par.probes)
  const merge = gameLevels.find(level => level.kind === 'merge')
  let ms = initMerge(merge.variants[0].cells)
  while (!ms.done) {
    const side = !ms.right.length || (ms.left.length && ms.left[0].value <= ms.right[0].value) ? 'left' : 'right'
    const result = mergePick(ms, side)
    assert.ok(result.ok)
    ms = result.state
  }
  assert.equal(ms.attempts, merge.par.attempts)
  assert.deepEqual(ms.out.map(item => item.value), [...merge.variants[0].cells].sort((a, b) => a - b))
})
