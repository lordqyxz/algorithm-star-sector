async(page,cases,{url='http://127.0.0.1:4173/',width=1280}={})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  await page.addInitScript(()=>{const previous=window.__PIXI_APP_INIT__;window.__PIXI_APP_INIT__=app=>{previous?.(app);window.__experimentApp=app}})
  await page.setViewportSize({width,height:1100});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(url)
  await page.evaluate(()=>{localStorage.removeItem('algorithmia-experiments-v1')})
  await page.getByRole('button',{name:'课程航线',exact:true}).click();await page.locator('.game-accessible-actions button').first().waitFor({state:'attached'})
  const click=label=>page.evaluate(label=>{const button=[...document.querySelectorAll('.game-accessible-actions button')].find(button=>button.textContent===label);if(!button||button.disabled)throw Error(`Unavailable ${label}`);button.click()},label)
  const state=()=>page.locator('canvas[data-experiment]').evaluate(canvas=>JSON.parse(canvas.dataset.experiment))
  const audit=()=>page.evaluate(async()=>{await new Promise(requestAnimationFrame);const hits=window.__auditText(window.__experimentApp);for(const layer of document.querySelectorAll('.formula-layer:not([hidden])'))for(const equation of layer.querySelectorAll('.formula-equation'))if(equation.scrollWidth>equation.clientWidth+2)hits.push({mathOverflow:equation.scrollWidth-equation.clientWidth,text:equation.textContent});if(hits.length)throw Error(JSON.stringify(hits.slice(0,8)));if(document.querySelector('.katex-error'))throw Error('Unrendered mathematics')})
  const choose=async label=>{for(let i=0;i<25;i++){const found=await page.evaluate(label=>{const b=[...document.querySelectorAll('.game-accessible-actions button')].find(b=>b.textContent===label);if(!b)return false;b.click();return true},label);if(found)return;await click('下一组动作')}throw Error(`No paged choice ${label}`)}
  await click('自由实验室');await page.locator('.formula-layer .katex').first().waitFor()
  let commands=0,invalid=0,previews=0,restored=0
  for(const scenario of cases){
    await click(scenario.title)
    if((await state()).variant!==scenario.variant)await click('切换输入组')
    const old=await state();await click('调整输入')
    const form=page.locator('.experiment-input-form');await form.waitFor({state:'visible'})
    for(const [id,value]of Object.entries(scenario.input))await form.locator(`input[name="${id}"]`).fill(String(value))
    if((await state()).steps!==old.steps)throw Error('Draft input mutated current model')
    await form.getByRole('button',{name:'应用并新建分支',exact:true}).click()
    if((await state()).steps!==0)throw Error('Input branch did not start from zero')
    let accepted=0
    for(let index=0;index<scenario.steps.length;index++){
      const step=scenario.steps[index],before=await state()
      await choose(step.label)
      if(step.action.type==='augment'){
        await page.locator('.experiment-amount-control input').fill(String(step.action.amount))
        await page.locator('.experiment-amount-control input').dispatchEvent('change')
      }
      const pending=await state()
      if(pending.steps!==before.steps||JSON.stringify(pending.costs)!==JSON.stringify(before.costs)||pending.attempts!==before.attempts)throw Error(`${scenario.name}: preview changed authority/cost`)
      if(pending.preview!==step.id)throw Error(`${scenario.name}: wrong selected action`)
      previews++;await audit()
      await click('执行所选动作')
      const after=await state();commands++;if(step.changed)accepted++;else invalid++
      if(after.steps!==accepted||after.attempts!==before.attempts+1||JSON.stringify(after.costs)!==JSON.stringify(step.costs)||after.policy!==step.policy||after.verified!==step.verified)throw Error(`${scenario.name}/${index}: model/history mismatch ${JSON.stringify(after)}`)
      if(!step.report.every(key=>after.reportkeys.includes(key)))throw Error(`${scenario.name}: false feedback category`)
      await audit()
      if(index===Math.floor(scenario.steps.length/2)||index===scenario.steps.length-1)await page.screenshot({path:`/tmp/sector-round2/screenshots/${scenario.name}-${index}-${width}.png`,fullPage:true})
    }
    const completed=await state()
    if(completed.steps){await click('后退一步 [←]');if((await state()).total!==completed.total)throw Error('Undo destroyed future');await click('前进一步 [→]')}
    await click('固定 A 对照');const pinned=await state();if(pinned.activeId===pinned.comparisonId)throw Error('Pinned branches alias identity')
    await page.reload();await page.locator('.game-accessible-actions button').first().waitFor({state:'attached'});await click('自由实验室');await click(scenario.title)
    const resumed=await state();if(resumed.steps!==completed.steps||JSON.stringify(resumed.costs)!==JSON.stringify(completed.costs)||resumed.policy!==completed.policy||!resumed.comparison)throw Error(`${scenario.name}: save did not replay`)
    restored++;await audit()
    if(width===1280&&scenario.name==='maxflow-reverse')await page.emulateMedia({reducedMotion:'reduce'})
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(350)
  if(errors.length)throw Error(errors.join('; '))
  return{scenarios:cases.length,commands,previews,invalid,restored,width,errors}
}
