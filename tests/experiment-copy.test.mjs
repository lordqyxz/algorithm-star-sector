import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { createExperiment, experimentKinds, experimentChoices, applyExperiment, experimentReport, experimentFields, experimentFormula, experimentReading, experimentFrame } from '../src/game/sim.ts'
import { t } from '../src/game/locale.ts'

const checkFact = fact => {
  assert.doesNotThrow(() => t(fact.key, fact.vars), fact.key)
  assert.doesNotMatch(t(fact.key, fact.vars), /\{[a-zA-Z]+\}/, fact.key)
}
test('all four experimental mechanisms expose localized facts and real, parseable input/state relations', () => {
  let samples = 0
  for (const kind of experimentKinds) for (const variant of [0,1]) {
    let states = [createExperiment(kind, variant)]
    for (let depth=0;depth<3;depth++) {
      const next = []
      for (const state of states) {
        samples++
        for (const field of experimentFields(state)) checkFact(field)
        const report = experimentReport(state)
        for (const fact of [report.feasibility,report.strategy,report.conclusion,report.summary,...report.evidence]) checkFact(fact)
        assert.doesNotThrow(() => katex.renderToString(experimentFormula(state), {throwOnError:true,strict:'error'}),`${kind}: formula`)
        assert.doesNotThrow(() => katex.renderToString(experimentReading(state), {throwOnError:true,strict:'error'}),`${kind}: diagram readings`)
        const frame=experimentFrame(state)
        const ids=new Set(frame.nodes?.map(node=>node.id)??[])
        for(const node of frame.nodes??[])assert.ok(node.x>=0&&node.x<=1&&node.y>=0&&node.y<=1,`${kind}: coordinates`)
        for(const edge of frame.edges??[])assert.ok(ids.has(edge.from)&&ids.has(edge.to),`${kind}: edge endpoint`)
        if(frame.matrix){assert.equal(frame.matrix.values.length,frame.matrix.rows.length);for(const row of frame.matrix.values)assert.equal(row.length,frame.matrix.columns.length)}
        for(const choice of experimentChoices(state)){
          checkFact(choice)
          const before=structuredClone(state)
          const result=applyExperiment(state,choice.action)
          checkFact(result.feedback)
          assert.deepEqual(state,before,`${kind}: preview mutated authority`)
          if(result.changed)next.push(result.state)
        }
      }
      states = next.filter((_,i)=>i%Math.max(1,Math.floor(next.length/35))===0).slice(0,35)
    }
  }
  assert.ok(samples>150)
})
