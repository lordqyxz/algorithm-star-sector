import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const audit = Function(`return (${readFileSync(new URL('./browser-text-bounds.js', import.meta.url), 'utf8')})`)()
const rect = (x, y, w, h) => ({ minX: x, minY: y, maxX: x + w, maxY: y + h })
function fixture(boxes, maskBox = rect(0, 0, 100, 100)) {
  const stage = { children: [] }
  const mask = { getBounds: () => rect(0, 0, 0, 0), getLocalBounds: () => maskBox, toGlobal: ({ x, y }) => ({ x: x + 10, y: y + 20 }) }
  const group = { mask, parent: stage, children: [] }
  group.children = boxes.map(([text, box]) => ({ text, style: {}, getBounds: () => box, parent: group }))
  stage.children = [group]
  return { stage, render() {} }
}

test('text audit detects overlap inside a Graphics mask whose global bounds are empty', () => {
  const hits = audit(fixture([['flow', rect(20, 30, 30, 15)], ['residual', rect(25, 30, 60, 15)]]))
  assert.equal(hits.length, 1)
  assert.equal(hits[0].a, 'flow')
  assert.equal(hits[0].b, 'residual')
})

test('text audit reports partial and fully clipped text without negative intersection dimensions', () => {
  for (const box of [rect(5, 30, 20, 15), rect(150, 150, 20, 15)]) {
    const [hit] = audit(fixture([['label', box]]))
    assert.equal(hit.clipped.text, 'label')
    assert.ok(hit.clipped.visible.w >= 0 && hit.clipped.visible.h >= 0)
  }
  assert.deepEqual(audit(fixture([['label', rect(20, 30, 20, 15)]])), [])
})
