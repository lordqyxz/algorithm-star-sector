import { Brain, Footprints, Scale } from 'lucide-react'
import { PredictionPrompt } from '@/components/PredictionPrompt'

export type DesignContrast = { alternative: string; whyNot: string }

export type DesignInsight = {
  /** 关键观察：这个算法之所以成立，依赖的那一个事实。 */
  observation: string
  /** 设计取舍：换一种设计会失去/得到什么。 */
  contrasts?: DesignContrast[]
  /** 迁移检查：把这一招带走的小问题。 */
  transfer?: { prompt: string; options: string[]; answer: number; explanation: string }
}

/**
 * 设计思路面板：课件与游戏共用的"为什么这样设计"模块。
 * 固定三段：关键观察 → 换个设计会怎样 → 带走这一招（迁移题）。
 */
export function DesignNotes({ insight }: { insight: DesignInsight }) {
  return <section className="design-notes" aria-label="设计思路">
    <div className="design-notes-heading"><Brain size={15} aria-hidden="true" />设计思路：为什么这样设计</div>
    <div className="design-block">
      <b><span className="design-no">01</span>关键观察</b>
      <p>{insight.observation}</p>
    </div>
    {insight.contrasts && insight.contrasts.length > 0 ? (
      <div className="design-block">
        <b><span className="design-no">02</span>换个设计会怎样</b>
        <div className="design-contrasts">
          {insight.contrasts.map(contrast => <div className="design-contrast" key={contrast.alternative}>
            <b><Scale size={13} aria-hidden="true" />若改用 {contrast.alternative}</b>
            <p>{contrast.whyNot}</p>
          </div>)}
        </div>
      </div>
    ) : null}
    {insight.transfer ? (
      <div className="design-block">
        <b><span className="design-no">03</span><Footprints size={14} aria-hidden="true" />带走这一招</b>
        <PredictionPrompt {...insight.transfer} />
      </div>
    ) : null}
  </section>
}
