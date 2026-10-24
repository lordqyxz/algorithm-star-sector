import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { courseMissions } from '../src/game/sim.ts'
import { zh } from '../src/game/locale.ts'

const catalog = courseMissions.map(mission => {
  const copy = zh.course.missions[mission.id]
  const transfer = copy.theory?.transfer
  return {
    id: mission.id,
    title: copy.title,
    chapter: zh.course.chapters[mission.chapter].title,
    answer: copy.prediction.options[copy.prediction.answer],
    wrongAnswer: copy.prediction.options[(copy.prediction.answer + 1) % copy.prediction.options.length],
    transferAnswer: transfer?.options[transfer.answer],
    wrongTransfer: transfer?.options[(transfer.answer + 1) % transfer.options.length],
    frames: [mission.trace(0).length, mission.trace(1).length],
  }
})
mkdirSync('.playwright-cli', { recursive: true })
writeFileSync('.playwright-cli/catalog.json', JSON.stringify(catalog))
const mobile = process.argv.includes('mobile')
writeFileSync(`.playwright-cli/browser-checks${mobile ? '.mobile' : ''}.generated.js`, `async page => (${readFileSync('tests/browser-checks.js', 'utf8')})(page, ${JSON.stringify(catalog)}, ${JSON.stringify(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 })})`)
if (process.argv.includes('--layout')) {
  const options = { url: process.env.SITE_URL || 'http://127.0.0.1:4173/', width: Number(process.env.VIEWPORT_WIDTH || 1280) }
  const audit = `window.__auditText = (${readFileSync('tests/browser-text-bounds.js', 'utf8')});`
  writeFileSync('.playwright-cli/browser-layout-audit.generated.js', `async page => { await page.addInitScript({content: ${JSON.stringify(audit)}}); return (${readFileSync('tests/browser-layout-audit.js', 'utf8')})(page, ${JSON.stringify(catalog)}, ${JSON.stringify(options)}); }`)
}
console.log(`${catalog.length} missions exported for browser verification`)
