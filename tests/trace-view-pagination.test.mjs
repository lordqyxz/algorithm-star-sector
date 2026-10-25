import test from 'node:test'
import assert from 'node:assert/strict'
import { TraceView } from '../src/game/core/trace-view.ts'

const button = (view, caption) => {
  const find = (node) => {
    if (node.children?.some((child) => child.text === caption)) return node
    for (const child of node.children ?? []) {
      const found = find(child)
      if (found) return found
    }
    return null
  }
  return find(view.container)
}

test('matrix pagination exposes every cell when both axes overflow', () => {
  for (const [rowCount, colCount, width, height] of [[10, 20, 480, 250], [7, 11, 360, 240]]) {
    const view = new TraceView()
    const rows = Array.from({ length: rowCount }, (_, i) => `r${i}`)
    const columns = Array.from({ length: colCount }, (_, i) => `c${i}`)
    view.update({
      op: 'visit', formula: '', counters: {},
      matrix: { rows, columns, values: rows.map((_, r) => columns.map((_, c) => r * colCount + c)) },
    }, width, height)
    assert.ok(view.matrixHit.maxRow > 0 && view.matrixHit.maxCol > 0)
    const seen = new Set()
    const positions = []
    let pages = 0
    while (true) {
      const { row, col } = view.matrixScroll
      positions.push({ row, col })
      const visibleRows = rowCount - view.matrixHit.maxRow
      const visibleCols = colCount - view.matrixHit.maxCol
      for (let r = row; r < Math.min(rowCount, row + visibleRows); r++)
        for (let c = col; c < Math.min(colCount, col + visibleCols); c++)
          seen.add(`${r}:${c}`)
      pages++
      const next = button(view, '›')
      if (next?.eventMode !== 'static') break
      assert.ok(pages < rowCount * colCount, 'pagination must finish')
      next.emit('pointertap')
    }
    assert.equal(seen.size, rowCount * colCount, 'every matrix cell must be reachable')
    for (let i = positions.length - 2; i >= 0; i--) {
      const previous = button(view, '‹')
      assert.equal(previous?.eventMode, 'static')
      previous.emit('pointertap')
      assert.deepEqual(view.matrixScroll, positions[i], 'Prev must exactly reverse Next, including the clamped final page')
    }
    assert.deepEqual(view.matrixScroll, { row: 0, col: 0 })
    view.destroy()
  }
})
