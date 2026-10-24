async (page, url='http://127.0.0.1:4173/')=>{
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.addInitScript(()=>{const previous=window.__PIXI_APP_INIT__;window.__PIXI_APP_INIT__=app=>{previous?.(app);window.__labApp=app}});
await page.goto(url);await page.setViewportSize({width:1280,height:1100});await page.evaluate(()=>localStorage.removeItem('algorithmia-labs-v1'));
const actions=page.locator('.game-accessible-actions button');await actions.first().waitFor({state:'attached'});
const click=label=>page.evaluate(label=>{const b=[...document.querySelectorAll('.game-accessible-actions button')].find(b=>b.textContent===label);if(!b||b.disabled)throw Error(`Missing ${label}`);b.click()},label);
const state=()=>page.locator('canvas[data-lab]').evaluate(c=>JSON.parse(c.dataset.lab));
const pointer=async target=>{
const point=await page.evaluate(async target=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);window.__labApp.render();const found=[];const visit=n=>{if(n.label===target&&n.eventMode==='static'){const b=n.getBounds();found.push({x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2})}for(const child of n.children??[])visit(child)};visit(window.__labApp.stage);if(found.length!==1)throw Error(`Expected single hit for ${target}: ${found.length}`);const r=document.querySelector('canvas').getBoundingClientRect();return{x:found[0].x+r.left,y:found[0].y+r.top}},target);
await page.mouse.click(point.x,point.y);await page.waitForTimeout(50)
};
await click('互动操练');await page.locator('.formula-layer .katex').first().waitFor();
await pointer('node:s');if((await state()).steps!==1)throw Error('Graph node pointer did not settle');
await pointer('edge:s:a');if((await state()).steps!==2)throw Error('Graph edge pointer did not relax');await page.keyboard.press('ArrowLeft');if((await state()).steps!==1)throw Error('Canvas keyboard undo did not work');await pointer('edge:s:a');
await page.screenshot({path:'/tmp/sector-lab-dijkstra-operation.png',fullPage:true});
await click('0/1 背包 · 载荷决策');await pointer('cell:1:7');if((await state()).phase!=='dependency')throw Error('Target cell click did not reach dependency');await pointer('cell:0:5');
if((await state()).phase!=='decision')throw Error('DP cell pointer did not select dependency');
await page.waitForTimeout(300);await page.screenshot({path:'/tmp/sector-lab-knapsack-decision.png',fullPage:true});
await click('取当前物品');if((await state()).phase!=='cell')throw Error('DP take decision did not advance');
await click('最大流 · 运力增广');await pointer('edge:s:a');await pointer('edge:a:b');await pointer('edge:b:t');await click('增广 2 单位');
await pointer('edge:s:b');await pointer('edge:b:a');
await page.screenshot({path:'/tmp/sector-lab-flow-reverse.png',fullPage:true});
await pointer('edge:a:t');await click('增广 2 单位');if(!(await state()).complete||(await state()).result!==4)throw Error('Reverse residual path failed');
await page.screenshot({path:'/tmp/sector-lab-flow-complete.png',fullPage:true});
await actions.filter({hasText:'返回课程航线'}).evaluate(b=>b.focus());await page.keyboard.press('Escape');if(await page.locator('canvas[data-lab]').count())throw Error('Escape on native button did not exit');
await page.emulateMedia({reducedMotion:'reduce'});await click('互动操练');await click('Dijkstra · 航路定距');await click('重新操练 [R]');await click('确定 s · d=0');await page.waitForTimeout(350);await page.emulateMedia({reducedMotion:'no-preference'});
if(errors.length)throw Error(errors.join(';'));
return {graphNode:true,graphEdge:true,dpCells:true,reverseResidual:true,keyboardEscape:true,reducedMotion:true,errors}
}
