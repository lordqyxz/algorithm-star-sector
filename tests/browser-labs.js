async (page, plans, url = 'http://127.0.0.1:4173/') => {
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  await page.addInitScript(()=>{const previous=window.__PIXI_APP_INIT__;window.__PIXI_APP_INIT__=app=>{previous?.(app);window.__labApp=app}})
  await page.goto(url)
  await page.setViewportSize({width:1280,height:1100})
  await page.locator('.game-accessible-actions button').first().waitFor({state:'attached'})
  await page.evaluate(()=>{localStorage.removeItem('algorithmia-labs-v1');localStorage.removeItem('algorithmia-lab-exposure-v2')})
  const click=async label=>page.locator('.game-accessible-actions button').filter({hasText:label}).filter({hasNot:page.locator('[disabled]')}).all().then(async buttons=>{
    const exact=[];for(const button of buttons)if(await button.textContent()===label)exact.push(button)
    if(exact.length!==1)throw Error(`Ambiguous/missing ${label}`)
    await exact[0].evaluate(node=>{if(node.disabled)throw Error('Disabled action');node.click()})
  })
  const state=()=>page.locator('canvas[data-lab]').evaluate(canvas=>JSON.parse(canvas.dataset.lab))
  const bounds=async()=>{
    await page.evaluate(async()=>{
      await new Promise(requestAnimationFrame)
      const hits=window.__auditText(window.__labApp)
      if(hits.length)throw Error(JSON.stringify({labTextBounds:hits.slice(0,5)}))
      const canvas=document.querySelector('canvas[data-lab]'),b=JSON.parse(canvas.dataset.layoutBounds)
      if(b.controlsTop<b.sidebarBottom+10||b.controlsTop<b.evidenceBottom+10)throw Error('Lab control/text overlap')
      if([...document.querySelectorAll('.formula-layer:not([hidden]) .formula-equation')].some(e=>e.scrollWidth>e.clientWidth+2))throw Error('Lab formula overflow')
      if(/\{[a-zA-Z][a-zA-Z0-9_]*\}/.test(document.querySelector('.game-accessible-description').textContent))throw Error('Unresolved lab copy')
    })
  }
  await click('互动操练')
  await page.locator('.formula-layer .katex').first().waitFor()
  let commands=0,wrongActions=0,hints=0
  for(const kind of ['dijkstra','knapsack','maxflow']) {
    const defaultParameter=kind==='dijkstra'?4:kind==='knapsack'?7:2
    const plan=plans[`${kind}:0:${defaultParameter}`]
    await click(plan.title)
    await click('演示')
    let current=await state()
    if(current.variant!==0||current.mode!=='demo')throw Error('Wrong demo input')
    for(const step of plan.steps){await click('下一步 [→]');commands++}
    current=await state()
    if(!current.complete||current.result!==plan.value)throw Error(`${kind}: bad demo result`)
    await click('操练')
    const first=plan.steps[0]
    await click(first.label);await click('撤销一步 [←]')
    if((await state()).steps!==0)throw Error('Undo did not restore command state')
    const checkedPhases=new Set()
    for(const step of plan.steps) {
      const before=await state()
      if(!checkedPhases.has(step.phase)) {
        if(step.wrong){await click(step.wrong);const after=await state();if(after.steps!==before.steps||after.phase!==before.phase||after.errors!==before.errors+1)throw Error('Invalid action changed the model');wrongActions++}
        await click('提示');await click('进一步提示');hints+=2
        checkedPhases.add(step.phase)
        await bounds()
      }
      await click(step.label);commands++
      await bounds()
    }
    current=await state()
    if(!current.complete||current.result!==plan.value)throw Error(`${kind}: bad practice result`)
    const assisted=await page.evaluate(kind=>JSON.parse(localStorage.getItem('algorithmia-labs-v1'))[kind],kind)
    if(!assisted.assisted||assisted.independent)throw Error('Practice masqueraded as independent')
    await click('增加参数')
    current=await state()
    if(current.complete||current.parameter!==defaultParameter+1||current.steps!==0)throw Error('Parameter did not create a new problem')
    const changed=plans[`${kind}:0:${defaultParameter+1}`]
    for(const step of changed.steps){await click(step.label);commands++}
    if((await state()).result!==changed.value)throw Error('Parameter change used stale answer')
    await click('挑战')
    current=await state()
    if(current.variant!==1)throw Error('Challenge reused demonstration input')
    const challenge=plans[`${kind}:1:${defaultParameter}`]
    let exposed=false
    for(const step of challenge.steps){
      if(!exposed&&step.wrong){await click(step.wrong);wrongActions++;exposed=true}
      await click(step.label);commands++
    }
    const revealed=await page.evaluate(kind=>JSON.parse(localStorage.getItem('algorithmia-labs-v1'))[kind],kind)
    if(!exposed||revealed.independent||!revealed.assisted||revealed.last.hints!==0||revealed.last.errors===0)throw Error('Answer-revealing error earned independent status')
    const exposure=await page.evaluate(({kind,parameter})=>JSON.parse(localStorage.getItem('algorithmia-lab-exposure-v2'))[`v2:${kind}:1:${parameter}`],{kind,parameter:defaultParameter})
    if(!exposure?.exposed||!exposure?.completed)throw Error('Challenge judgement was not permanently exposed')
    await click('操练');await click('挑战')
    if(!(await state()).exposed)throw Error('Mode switch washed challenge exposure')
    await click('重新操练 [R]')
    for(const step of challenge.steps){await click(step.label);commands++;await bounds()}
    if((await state()).result!==challenge.value)throw Error('Challenge answer mismatch')
    const replayed=await page.evaluate(kind=>JSON.parse(localStorage.getItem('algorithmia-labs-v1'))[kind],kind)
    if(replayed.independentV2)throw Error('Restart washed exposed judgement into independent completion')
    await click('增加参数')
    const fresh=plans[`${kind}:1:${defaultParameter+1}`]
    if((await state()).parameter!==defaultParameter+1)throw Error('Did not reach a fresh challenge instance')
    for(const step of fresh.steps){await click(step.label);commands++;await bounds()}
    if((await state()).result!==fresh.value)throw Error('Fresh challenge answer mismatch')
    const independent=await page.evaluate(kind=>JSON.parse(localStorage.getItem('algorithmia-labs-v1'))[kind],kind)
    if(!independent.independentV2||independent.independentMetricsV2?.judgementVersion!==2||independent.independentMetricsV2?.hints!==0||independent.independentMetricsV2?.errors!==0)throw Error('Missing honest version-2 independent completion')
    if(kind==='dijkstra'){
      const best=JSON.stringify(independent.independentMetricsV2)
      await click('操练');await click('提示')
      for(const step of plan.steps){await click(step.label);commands++}
      const later=await page.evaluate(kind=>JSON.parse(localStorage.getItem('algorithmia-labs-v1'))[kind],kind)
      if(JSON.stringify(later.independentMetricsV2)!==best||later.assistedMetrics.hints!==1)throw Error('Assisted completion overwrote independent metrics')
    }
    const beforeLeave=await state()
    await page.getByRole('button',{name:'星域总览',exact:true}).click()
    await page.locator('.game-accessible-actions button').first().waitFor({state:'attached'})
    await click('互动操练')
    await click(plan.title)
    const restored=await state()
    if(!restored.complete||restored.variant!==beforeLeave.variant||restored.mode!==beforeLeave.mode||restored.result!==beforeLeave.result)throw Error('Saved commands did not restore the same lab')
  }
  await page.getByRole('button',{name:'航行日志',exact:true}).click()
  const log=await page.locator('.voyage-log').textContent()
  if(!log.includes('互动学习记录')||(log.match(/挑战无提示完成/g)??[]).length!==3)throw Error('Log lost independent participation records')
  await page.waitForTimeout(400)
  if(errors.length)throw Error(errors.join(';'))
  return {labs:3,modes:3,commands,wrongActions,hints,parameterChanges:3,restored:3,errors}
}
