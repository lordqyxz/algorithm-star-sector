import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createLab, labChoices, applyLabAction, labIsComplete, labDemoAction, labParameter, labReference } from '../src/game/sim.ts'
import { t, zh } from '../src/game/locale.ts'
const label = choice => {
  const vars = { ...choice.vars }
  if (typeof vars.edge === 'string') { const [id, direction] = vars.edge.split(':'); if (id.length === 2) vars.edge = direction === 'r' ? `${id[1]}→${id[0]}` : `${id[0]}→${id[1]}` }
  return t(choice.key, vars)
}
const plans = {}
for (const kind of ['dijkstra','knapsack','maxflow']) for (const variant of [0,1]) {
  const range=labParameter(kind)
  for (let parameter=range.min;parameter<=range.max;parameter+=range.step) {
    let state=createLab(kind,variant,parameter)
    const steps=[]
    while(!labIsComplete(state)) {
      const action=labDemoAction(state)
      const choices=labChoices(state)
      const chosen=choices.find(choice=>JSON.stringify(choice.action)===JSON.stringify(action))
      if(!chosen) throw new Error(`missing demo choice ${kind}/${state.phase}`)
      const wrong=choices.find(choice=>!applyLabAction(state,choice.action).changed)
      steps.push({label:label(chosen),phase:state.phase,wrong:wrong?label(wrong):null,targets:chosen.targets??[]})
      state=applyLabAction(state,action).state
      if(steps.length>200) throw new Error('unbounded demo')
    }
    plans[`${kind}:${variant}:${parameter}`]={kind,title:zh.lab.kind[kind],variant,parameter,value:labReference(state).value,steps}
  }
}
mkdirSync('.playwright-cli',{recursive:true})
const url=process.env.SITE_URL||'http://127.0.0.1:4173/'
writeFileSync('.playwright-cli/lab-plans.json',JSON.stringify(plans))
const audit = `window.__auditText = (${readFileSync('tests/browser-text-bounds.js','utf8')});`
writeFileSync('.playwright-cli/lab-checks.generated.js',`async page => { await page.addInitScript({content: ${JSON.stringify(audit)}}); return (${readFileSync('tests/browser-labs.js','utf8')})(page,${JSON.stringify(plans)},${JSON.stringify(url)}); }`)
writeFileSync('.playwright-cli/lab-pointer.generated.js',`async page => (${readFileSync('tests/browser-lab-pointer.js','utf8')})(page,${JSON.stringify(url)})`)
console.log(`${Object.keys(plans).length} computed lab input plans exported`)
