import type { ReactNode } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface Point {
  label: string
  [key: string]: string | number | null
}

export interface Series {
  key: string
  name: string
  color?: string
}

const AXIS = { fontSize: 12, fill: 'var(--muted)' }

function TooltipBox({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
  label?: string
  format: (v: number, key: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-card">
      <div className="mb-1 text-xs font-medium text-muted">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          {payload.length > 1 && <span className="size-2 rounded-full" style={{ background: p.color }} />}
          {payload.length > 1 && <span className="text-ink-2">{p.name}</span>}
          <span className="tnum font-semibold text-ink">{format(Number(p.value), String(p.dataKey))}</span>
        </div>
      ))}
    </div>
  )
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null
  return (
    <div className="mb-2 flex flex-wrap gap-4 text-xs text-ink-2">
      {series.map((s, i) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: s.color ?? `var(--series-${i + 1})` }} />
          {s.name}
        </span>
      ))}
    </div>
  )
}

interface ChartProps {
  data: Point[]
  series: Series[]
  format: (v: number, key: string) => string
  height?: number
  yWidth?: number
  ariaLabel: string
  tickFormat?: (v: number) => string
}

function Frame({ ariaLabel, height, children, series }: { ariaLabel: string; height: number; children: ReactNode; series: Series[] }) {
  return (
    <figure role="img" aria-label={ariaLabel} className="w-full">
      <Legend series={series} />
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </figure>
  )
}

export function LineTrend({ data, series, format, height = 220, yWidth = 44, ariaLabel, tickFormat }: ChartProps) {
  const single = series.length === 1
  return (
    <Frame ariaLabel={ariaLabel} height={height} series={series}>
      <ResponsiveContainer width="100%" height="100%">
        {single ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`fill-${series[0].key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series[0].color ?? 'var(--series-1)'} stopOpacity={0.18} />
                <stop offset="100%" stopColor={series[0].color ?? 'var(--series-1)'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={yWidth} domain={['auto', 'auto']} tickFormatter={tickFormat} />
            <Tooltip content={<TooltipBox format={format} />} cursor={{ stroke: 'var(--line-strong)' }} />
            <Area
              type="monotone"
              dataKey={series[0].key}
              name={series[0].name}
              stroke={series[0].color ?? 'var(--series-1)'}
              strokeWidth={2}
              fill={`url(#fill-${series[0].key})`}
              dot={data.length < 16 ? { r: 3.5, strokeWidth: 2, stroke: 'var(--surface)', fill: series[0].color ?? 'var(--series-1)' } : false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
              connectNulls
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={yWidth} domain={['auto', 'auto']} tickFormatter={tickFormat} />
            <Tooltip content={<TooltipBox format={format} />} cursor={{ stroke: 'var(--line-strong)' }} />
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color ?? `var(--series-${i + 1})`}
                strokeWidth={2}
                dot={data.length < 16 ? { r: 3.5, strokeWidth: 2, stroke: 'var(--surface)', fill: s.color ?? `var(--series-${i + 1})` } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </Frame>
  )
}

export function ColumnTrend({ data, series, format, height = 220, yWidth = 44, ariaLabel, tickFormat, highlightLast }: ChartProps & { highlightLast?: boolean }) {
  const s = series[0]
  return (
    <Frame ariaLabel={ariaLabel} height={height} series={series}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={yWidth} allowDecimals={false} tickFormatter={tickFormat} />
          <Tooltip content={<TooltipBox format={format} />} cursor={{ fill: 'var(--surface-2)' }} />
          <Bar
            dataKey={s.key}
            name={s.name}
            fill={s.color ?? 'var(--series-1)'}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
            shape={
              highlightLast
                ? (props: unknown) => {
                    const p = props as { x: number; y: number; width: number; height: number; index: number }
                    const last = p.index === data.length - 1
                    const h = Math.max(0, p.height)
                    const r = Math.min(4, h)
                    return (
                      <path
                        d={`M${p.x},${p.y + h} V${p.y + r} Q${p.x},${p.y} ${p.x + r},${p.y} H${p.x + p.width - r} Q${p.x + p.width},${p.y} ${p.x + p.width},${p.y + r} V${p.y + h} Z`}
                        fill={s.color ?? 'var(--series-1)'}
                        opacity={last ? 1 : 0.55}
                      />
                    )
                  }
                : undefined
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  )
}

/** Labelled horizontal bars; reads like a table so values never rely on colour. */
export function RankBars({ rows, format }: { rows: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="grid gap-2.5 lg:grid-cols-2 lg:gap-x-10">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[92px_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-ink-2">{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-[var(--series-1)]" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="tnum min-w-16 text-right font-medium">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  )
}
