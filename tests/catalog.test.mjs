import test from 'node:test'
import assert from 'node:assert/strict'
import { courseMissions } from '../src/game/sim.ts'
import { zh } from '../src/game/locale.ts'

const sourceIds = new Set(['combined', 'structures', 'design', 'advanced', 'ai', 'classroom'])
test('every course entry has unique identity, valid provenance and complete localized teaching copy', () => {
  const ids = courseMissions.map(mission => mission.id)
  assert.equal(new Set(ids).size, ids.length, 'duplicate mission identity')
  assert.deepEqual(new Set(Object.keys(zh.course.missions)), new Set(ids), 'orphan or missing mission copy')
  for (const mission of courseMissions) {
    assert.ok(zh.course.chapters[mission.chapter], mission.id)
    assert.ok(mission.sources.length && mission.sources.every(id => sourceIds.has(id)), mission.id)
    const copy = zh.course.missions[mission.id]
    for (const key of ['title', 'objective', 'invariant', 'complexity', 'explanation', 'transfer']) assert.ok(copy[key]?.trim(), `${mission.id}: ${key}`)
    assert.ok(copy.prediction.options.length >= 2)
    assert.ok(copy.prediction.answer >= 0 && copy.prediction.answer < copy.prediction.options.length)
    assert.ok(copy.prediction.explanation.trim())
  }
})

test('every supported input yields replayable, finite, structurally complete snapshots', () => {
  for (const mission of courseMissions) for (const variant of [0, 1]) {
    const frames = mission.trace(variant)
    assert.deepEqual(frames, mission.trace(variant), `${mission.id}: deterministic seed`)
    assert.ok(frames.length >= 3 && frames.length <= 1000, `${mission.id}: useful bounded trace`)
    assert.equal(frames[0].op, 'start', mission.id)
    assert.equal(frames.at(-1).op, 'done', mission.id)
    for (const frame of frames) {
      assert.ok(zh.course.operations[frame.op], `${mission.id}: ${frame.op}`)
      assert.ok(frame.formula.trim(), mission.id)
      for (const value of Object.values(frame.counters)) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${mission.id}: finite counters`)
      const ids = new Set((frame.nodes ?? []).map(node => node.id))
      assert.equal(ids.size, (frame.nodes ?? []).length, `${mission.id}: unique graph identity`)
      for (const node of frame.nodes ?? []) assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y) && node.x >= 0 && node.x <= 1 && node.y >= 0 && node.y <= 1, `${mission.id}: normalized graph coordinates`)
      for (const edge of frame.edges ?? []) assert.ok(ids.has(edge.from) && ids.has(edge.to), `${mission.id}: graph endpoints ${edge.from}→${edge.to}`)
      if (frame.matrix) {
        assert.equal(frame.matrix.rows.length, frame.matrix.values.length, `${mission.id}: matrix rows`)
        for (const row of frame.matrix.values) assert.equal(row.length, frame.matrix.columns.length, `${mission.id}: matrix columns`)
        if (frame.matrix.active) assert.ok(frame.matrix.active[0] >= 0 && frame.matrix.active[0] < frame.matrix.rows.length && frame.matrix.active[1] >= 0 && frame.matrix.active[1] < frame.matrix.columns.length, `${mission.id}: active matrix cell`)
      }
    }
  }
})
