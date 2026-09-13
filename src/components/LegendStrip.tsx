export type LegendItem = { label: string; tone: 'focus' | 'key' | 'pivot' | 'sorted' | 'target' | 'muted' }

const legendLabels: Record<LegendItem['tone'], string> = {
  focus: '当前处理',
  key: '暂存的键',
  pivot: '主元/分界',
  sorted: '已确定',
  target: '目标/候选',
  muted: '已排除',
}

/**
 * Persistent semantic-color legend (Toptal / sorting.at pattern): the same tone
 * always means the same thing across lessons, and the legend doubles as the
 * colorblind-safe second cue because it carries the word.
 */
export function LegendStrip({ items, label = '颜色语义' }: { items: readonly LegendItem[]; label?: string }) {
  return <div className="legend-strip" role="list" aria-label={label}>
    {items.map(item => <span className="legend-item" role="listitem" key={item.tone}><i className={`data-cell legend-dot ${item.tone}`} aria-hidden="true" />{item.label ?? legendLabels[item.tone]}</span>)}
  </div>
}
