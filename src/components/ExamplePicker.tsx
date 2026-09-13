export type ExampleOption = {
  id: string
  label: string
  detail: string
}

type ExamplePickerProps = {
  examples: readonly ExampleOption[]
  value: string
  onChange: (id: string) => void
}

export function ExamplePicker({ examples, value, onChange }: ExamplePickerProps) {
  return <section className="example-picker" aria-label="选择演示样例">
    <div className="example-picker-heading">
      <div><p className="eyebrow">INPUT LAB</p><strong>换一组输入再看一次</strong></div>
      <span>{examples.find(example => example.id === value)?.detail}</span>
    </div>
    <div className="example-picker-options" role="group" aria-label="演示样例">
      {examples.map(example => <button type="button" key={example.id} className={`example-option ${example.id === value ? 'active' : ''}`} aria-pressed={example.id === value} onClick={() => onChange(example.id)}><span>{example.label}</span><small>{example.detail}</small></button>)}
    </div>
  </section>
}
