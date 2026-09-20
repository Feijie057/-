import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, FileText, Layers, Sparkles } from 'lucide-react'
import { useWorkbench } from '@/lib/store'
import { STEP_KIND_META } from '@/lib/recipes'
import { Badge, Button, Card, Empty, SectionTitle } from '@/components/ui'
import { BarChart, type Bar } from '@/components/BarChart'
import { relativeTime } from '@/lib/utils'

function StatTile({ label, value, unit, hint, icon }: {
  label: string
  value: number | string
  unit?: string
  hint?: string
  icon: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none text-ink">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-muted">{hint}</p>}
    </Card>
  )
}

/** 近 14 天的产出量，按天聚合 */
function dailySeries(timestamps: number[]): Bar[] {
  const days: Bar[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let offset = 13; offset >= 0; offset--) {
    const start = today.getTime() - offset * 86400000
    const end = start + 86400000
    days.push({
      label: `${new Date(start).getMonth() + 1}/${new Date(start).getDate()}`,
      value: timestamps.filter((ts) => ts >= start && ts < end).length,
    })
  }
  return days
}

export function Dashboard() {
  const navigate = useNavigate()
  const recipes = useWorkbench((s) => s.recipes)
  const jobs = useWorkbench((s) => s.jobs)
  const artifacts = useWorkbench((s) => s.artifacts)

  const succeeded = jobs.filter((j) => j.status === 'succeeded').length
  const successRate = jobs.length ? Math.round((succeeded / jobs.length) * 100) : 0
  const avgSeconds = succeeded
    ? Math.round(
        jobs
          .filter((j) => j.status === 'succeeded' && j.finishedAt)
          .reduce((sum, j) => sum + (j.finishedAt! - j.createdAt), 0) / succeeded / 100,
      ) / 10
    : 0

  const series = dailySeries(artifacts.map((a) => a.createdAt))

  return (
    <div className="mx-auto max-w-[1180px] space-y-6 p-5">
      {/* 平台主张：输入 → 运作 → 产出 */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <Badge color="var(--series-1)"><Sparkles size={12} />AI 内容生成平台</Badge>
            <h2 className="mt-3 text-xl font-semibold leading-snug text-ink">
              输入一份需求，产出一件成品
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              平台把每一类内容固化成一条可复用的流水线：需求拆解 → 资产调取 → 内容生成 → 润色 → 合规校验 → 成品打包。
              中间每一步都可查、可改、可回退。
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" icon={<Sparkles size={14} />} onClick={() => navigate('/studio')}>
                进入创作台
              </Button>
              <Button onClick={() => navigate('/recipes')}>浏览配方库</Button>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
            {Object.entries(STEP_KIND_META).map(([key, meta], index) => (
              <div key={key} className="flex items-center gap-2.5 rounded-xl border px-3 py-2 hairline">
                <span className="tabular w-4 text-[10px] text-muted">{String(index + 1).padStart(2, '0')}</span>
                <span className="h-3.5 w-1 rounded-full" style={{ background: meta.color }} />
                <span className="text-xs font-medium text-ink">{meta.label}</span>
                <span className="hidden text-[11px] text-muted sm:inline">{meta.hint}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="累计产出" value={artifacts.length} unit="件" icon={<FileText size={14} />} hint="产出库中的成品数量" />
        <StatTile label="运行次数" value={jobs.length} unit="次" icon={<Layers size={14} />} hint={`成功 ${succeeded} 次`} />
        <StatTile label="成功率" value={successRate} unit="%" icon={<CheckCircle2 size={14} />} hint="流水线完整跑通的比例" />
        <StatTile label="平均耗时" value={avgSeconds || '—'} unit={avgSeconds ? '秒' : ''} icon={<Clock size={14} />} hint="单次流水线端到端" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <SectionTitle title="近 14 天产出量" hint="按成品入库日期统计，悬停查看具体数值" />
          <BarChart data={series} unit=" 件" />
        </Card>

        <Card className="p-5">
          <SectionTitle
            title="最近产出"
            action={<Link to="/library" className="text-xs text-muted hover:text-ink">全部<ArrowRight size={11} className="inline" /></Link>}
          />
          {artifacts.length === 0 ? (
            <Empty
              title="还没有产出"
              hint="到创作台选一个配方，填一份需求，跑完就会出现在这里。"
              action={<Button size="sm" variant="primary" onClick={() => navigate('/studio')}>去创作台</Button>}
            />
          ) : (
            <ul className="space-y-1.5">
              {artifacts.slice(0, 6).map((artifact) => (
                <li key={artifact.id}>
                  <Link to="/library" className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-plane focus-ring">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{artifact.title}</span>
                      <span className="block truncate text-[11px] text-muted">{artifact.recipeName}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">{relativeTime(artifact.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div>
        <SectionTitle title="常用配方" hint="点开直接进入创作台并带上该配方" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.slice(0, 6).map((recipe) => (
            <Link
              key={recipe.id}
              to={`/studio?recipe=${recipe.id}`}
              className="card group p-4 transition hover:-translate-y-0.5 focus-ring"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-medium text-ink">{recipe.name}</p>
                <Badge>{recipe.category}</Badge>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{recipe.summary}</p>
              <div className="mt-3 flex items-center gap-1">
                {recipe.steps.map((step) => (
                  <span key={step.id} className="h-1 flex-1 rounded-full" style={{ background: STEP_KIND_META[step.kind].color }} title={step.name} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
