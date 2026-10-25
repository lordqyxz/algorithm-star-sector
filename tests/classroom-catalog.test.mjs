import test from 'node:test'
import assert from 'node:assert/strict'
import { classroomSources, classroomUnits } from '../src/game/classroom.ts'
import { courseMissions } from '../src/game/sim.ts'
import { zh } from '../src/game/locale.ts'

test('classroom route cites all supplied sources without inventing chapter 12', () => {
  assert.equal(classroomSources.length, 18)
  assert.equal(classroomSources.reduce((n, source) => n + source.pages, 0), 674)
  assert.equal(classroomUnits.length, 17)
  assert.deepEqual(classroomUnits.filter(unit => unit.number !== null).map(unit => unit.number), [1,2,3,4,5,6,7,8,9,10,11,13,14,15,16])
  const sources = new Map(classroomSources.map(source => [source.id, source]))
  const missions = new Map(courseMissions.map(mission => [mission.id, mission]))
  for (const unit of classroomUnits) {
    assert.ok(zh.classroom.units[unit.id]?.title)
    assert.ok(zh.classroom.units[unit.id]?.note)
    const source = sources.get(unit.sourceId)
    assert.ok(source)
    assert.equal(new Set(unit.missions.map(ref => ref.id)).size, unit.missions.length)
    for (const ref of unit.missions) {
      assert.ok(missions.has(ref.id), `${unit.id}: missing ${ref.id}`)
      assert.ok(ref.pages.length && ref.pages.every(page => Number.isInteger(page) && page > 0 && page <= source.pages))
      assert.ok(['core','extension'].includes(ref.emphasis))
    }
  }
})

test('every classroom addition has honest provenance and dense renderable snapshots', () => {
  const additions = courseMissions.filter(mission => mission.sources.includes('classroom'))
  assert.equal(additions.length, 26)
  for (const mission of additions) {
    assert.deepEqual(mission.sources, ['classroom'])
    assert.ok(classroomUnits.some(unit => unit.missions.some(ref => ref.id === mission.id)), mission.id)
    for (const variant of [0,1]) for (const frame of mission.trace(variant)) {
      for (const collection of [frame.items, frame.output, frame.nodes, ...(frame.groups ?? []).map(group => group.items)]) {
        if (!collection) continue
        for (let i=0; i<collection.length; i++) {
          assert.ok(collection[i]?.id, `${mission.id}: empty slot ${i}`)
          assert.notEqual(collection[i].value, undefined, mission.id)
        }
      }
    }
  }
})
