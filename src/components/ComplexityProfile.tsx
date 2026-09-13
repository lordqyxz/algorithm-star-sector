import { Card, CardContent } from '@/components/ui/card'

export type ComplexityTone = 'best' | 'average' | 'worst' | 'method'

export type ComplexityCase = {
  label: string
  complexity: string
  condition: string
  example: string
  explanation: string
  tone: ComplexityTone
}

export type StabilityInfo = {
  status: 'stable' | 'unstable' | 'conditional'
  label: string
  statement: string
  before: string
  after: string
}

export type ComplexityProfileData = {
  title: string
  subtitle: string
  cases: readonly ComplexityCase[]
  footer: string
  stability?: StabilityInfo
}

type ComplexityProfileProps = {
  profile: ComplexityProfileData
}

export function ComplexityProfile({ profile }: ComplexityProfileProps) {
  return <section className="complexity-panel" aria-labelledby="complexity-title">
    <div className="complexity-heading">
      <div>
        <p className="eyebrow">COMPLEXITY MAP</p>
        <h3 id="complexity-title">{profile.title}</h3>
        <p>{profile.subtitle}</p>
      </div>
      <span className="complexity-key">条件 → 复杂度</span>
    </div>
    <div className="complexity-grid">
      {profile.cases.map(item => <Card className={`complexity-case complexity-${item.tone}`} key={item.label}>
        <CardContent>
          <div className="complexity-case-heading"><span>{item.label}</span><strong>{item.complexity}</strong></div>
          <p><b>条件</b>{item.condition}</p>
          <p><b>例子</b><code>{item.example}</code></p>
          <small>{item.explanation}</small>
        </CardContent>
      </Card>)}
    </div>
    {profile.stability && <div className={`stability-card stability-${profile.stability.status}`}>
      <div className="stability-heading"><div><span>STABILITY CHECK</span><strong>{profile.stability.label}</strong></div><b>{profile.stability.status === 'stable' ? '相等键保序' : profile.stability.status === 'unstable' ? '相等键可能换位' : '取决于实现'}</b></div>
      <p>{profile.stability.statement}</p>
      <div className="stability-flow"><code>{profile.stability.before}</code><span>→</span><code>{profile.stability.after}</code></div>
    </div>}
    <div className="complexity-footer"><b>别只背结论</b><span>{profile.footer}</span></div>
  </section>
}
