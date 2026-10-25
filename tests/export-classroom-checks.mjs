import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { classroomSources, classroomUnits } from '../src/game/classroom.ts'
import { courseMissions } from '../src/game/sim.ts'
import { zh } from '../src/game/locale.ts'

mkdirSync('.playwright-cli', { recursive: true })
mkdirSync('/tmp/sector-ppt-work/screenshots', { recursive: true })
const catalog = courseMissions.map(mission => ({ id: mission.id, title: zh.course.missions[mission.id].title, chapter: zh.course.chapters[mission.chapter].title }))
const units = classroomUnits.map(unit => ({ ...unit, title: zh.classroom.units[unit.id].title }))
const options = { url: process.env.SITE_URL || 'http://127.0.0.1:4173/', width: Number(process.env.VIEWPORT_WIDTH || 1440) }
const audit = `window.__auditText = (${readFileSync('tests/browser-text-bounds.js', 'utf8')});`
writeFileSync('.playwright-cli/classroom-checks.generated.js', `async page => { await page.addInitScript({content: ${JSON.stringify(audit)}}); return (${readFileSync('tests/browser-classroom.js', 'utf8')})(page, ${JSON.stringify(catalog)}, ${JSON.stringify(units)}, ${JSON.stringify(classroomSources)}, ${JSON.stringify(options)}); }`)
