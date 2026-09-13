import { useEffect } from 'react'

/**
 * 算法王国游戏框架 · 输入层
 * 把键盘事件映射为游戏命令；输入框聚焦时自动让位，语义控件不受影响。
 */
export function useGameKeys(bindings: readonly { key: string; run: () => void }[]) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      const binding = bindings.find(item => item.key.toLowerCase() === event.key.toLowerCase())
      if (binding) {
        event.preventDefault()
        binding.run()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [bindings])
}
