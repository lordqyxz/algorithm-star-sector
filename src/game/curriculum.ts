import { zh } from './locale'
import { courseMissions } from './sim'
import { loadCourseSave } from './save'

export type ChapterId = keyof typeof zh.course.chapters
export const chapters = Object.keys(zh.course.chapters) as ChapterId[]
export const sources = {
  combined: { code: 'B2011020Y', url: 'https://jwba.ucas.ac.cn/sc/course/courseplan/234252' },
  structures: { code: 'B0911002Y', url: 'https://jwba.ucas.ac.cn/sc/course/courseplan/195087' },
  design: { code: 'B0912009H', url: 'https://jwba.ucas.ac.cn/sc/course/courseplan/291532' },
  advanced: { code: '180086085405P2002Y', url: 'https://jwba.ucas.ac.cn/sc/course/courseplan/294011' },
  ai: { code: '180206085410P2003Y-02', url: 'https://jwba.ucas.ac.cn/sc/course/courseplan/294042' },
} as const

export function missionsIn(chapter: ChapterId) { return courseMissions.filter(mission => mission.chapter === chapter) }
export function completedMissions() {
  const save = loadCourseSave()
  return courseMissions.filter(mission => Object.values(save[mission.id]?.attempts ?? {}).some(record => record?.completedAt)).map(mission => mission.id)
}
