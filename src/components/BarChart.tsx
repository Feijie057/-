import { useState } from 'react'

export interface Bar {
  label: string
  value: number
}

/**
 * 单系列柱状图：单一系列不配图例（标题已点名），值用悬停读取，
 * 只对最大值做直接标注，网格与基线保持弱化。
 */
export function BarChart({
  data,
  unit = '',
  height = 140,
}: {
  data: Bar[]
  unit?: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const isEmpty = data.every((d) => d.value === 0)
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0)

  return (
    <div className="relative">
      {isEmpty && (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-muted">
          这两周还没有产出记录
        </p>
      )}
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {data.map((bar, i) => {
          const ratio = bar.value / max
          const isHover = hover === i
          return (
            <button
              key={bar.label}
              className="group relative flex h-full flex-1 items-end focus-ring"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${bar.label}：${bar.value}${unit}`}
            >
              <span
                className="w-full rounded-t transition-[filter]"
                style={{
                  height: `${Math.max(ratio * 100, bar.value > 0 ? 3 : 0)}%`,
                  background: 'var(--series-1)',
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  filter: isHover ? 'brightness(1.15)' : undefined,
                }}
              />
              {i === peak && bar.value > 0 && (
                <span className="tabular pointer-events-none absolute inset-x-0 -top-0.5 text-center text-[10px] text-ink-2"
                  style={{ bottom: `calc(${ratio * 100}% + 4px)`, top: 'auto' }}>
                  {bar.value}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-1.5 flex gap-[2px] border-t pt-1.5" style={{ borderColor: 'var(--baseline)' }}>
        {data.map((bar, i) => (
          <span key={bar.label} className="flex-1 truncate text-center text-[10px] text-muted">
            {i % 2 === 0 ? bar.label : ''}
          </span>
        ))}
      </div>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-y-full rounded-lg border px-2.5 py-1.5 text-xs shadow-sm hairline"
          style={{
            background: 'var(--surface-2)',
            left: `${((hover + 0.5) / data.length) * 100}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span className="text-muted">{data[hover].label}　</span>
          <span className="tabular font-medium text-ink">{data[hover].value}{unit}</span>
        </div>
      )}
    </div>
  )
}
