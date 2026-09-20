import { useCallback, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, Check, ChevronDown, ChevronRight, CircleDashed, Copy, Download,
  Loader2, Play, Save, Square,
} from 'lucide-react'
import type { Job, Recipe, RecipeField } from '@/lib/types'
import { createJob, finalOutput, jobTokens, runPipeline } from '@/lib/engine'
import { STEP_KIND_META } from '@/lib/recipes'
import { useActiveModel, useWorkbench } from '@/lib/store'
import { Badge, Button, Card, Input, Label, SectionTitle, Select, Textarea } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { copyText, cx, downloadText, uid } from '@/lib/utils'

function defaultBrief(recipe: Recipe): Record<string, string> {
  return Object.fromEntries(recipe.fields.map((f) => [f.key, f.defaultValue ?? '']))
}

function BriefField({
  field,
  value,
  onChange,
}: {
  field: RecipeField
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div>
      <Label required={field.required} hint={field.hint}>{field.label}</Label>
      {field.type === 'textarea' ? (
        <Textarea value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'select' ? (
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>
      ) : (
        <Input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}

const STATUS_ICON = {
  queued: <CircleDashed size={14} className="text-muted" />,
  running: <Loader2 size={14} className="animate-spin" style={{ color: 'var(--series-1)' }} />,
  succeeded: <Check size={14} style={{ color: 'var(--status-good)' }} />,
  failed: <AlertTriangle size={14} style={{ color: 'var(--status-critical)' }} />,
  skipped: <CircleDashed size={14} className="text-muted opacity-50" />,
}

function StepCard({ step, recipe, expanded, onToggle }: {
  step: Job['steps'][number]
  recipe: Recipe
  expanded: boolean
  onToggle: () => void
}) {
  const meta = STEP_KIND_META[step.kind]
  const definition = recipe.steps.find((s) => s.id === step.id)

  return (
    <Card className={cx('overflow-hidden', step.status === 'running' && 'ring-1')}>
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-plane focus-ring"
      >
        <span className="shrink-0">{STATUS_ICON[step.status]}</span>
        <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: meta.color }} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[13px] font-medium text-ink">{step.name}</span>
            <Badge color={meta.color}>{meta.label}</Badge>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted">{definition?.desc}</span>
        </span>
        {step.status === 'succeeded' && (
          <span className="tabular hidden shrink-0 text-[11px] text-muted sm:block">
            {step.tokensOut} tok · {(step.ms / 1000).toFixed(1)}s
          </span>
        )}
        {expanded ? <ChevronDown size={15} className="shrink-0 text-muted" /> : <ChevronRight size={15} className="shrink-0 text-muted" />}
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 hairline">
          {step.error && (
            <p className="mb-2 rounded-xl px-3 py-2 text-xs" style={{ background: 'color-mix(in srgb, var(--status-critical) 10%, transparent)', color: 'var(--status-critical)' }}>
              {step.error}
            </p>
          )}
          {step.output ? (
            <Markdown content={step.output} />
          ) : (
            <p className="text-xs text-muted">
              {step.status === 'running' ? '生成中…' : step.status === 'skipped' ? '前序步骤失败，已跳过' : '尚未运行'}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

export function Studio() {
  const [params, setParams] = useSearchParams()
  const recipes = useWorkbench((s) => s.recipes)
  const assets = useWorkbench((s) => s.assets)
  const saveJob = useWorkbench((s) => s.saveJob)
  const addArtifact = useWorkbench((s) => s.addArtifact)
  const model = useActiveModel()

  const recipeId = params.get('recipe') ?? recipes[0]?.id
  const recipe = recipes.find((r) => r.id === recipeId) ?? recipes[0]

  const [briefs, setBriefs] = useState<Record<string, Record<string, string>>>({})
  const [job, setJob] = useState<Job | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const brief = briefs[recipe.id] ?? defaultBrief(recipe)
  const running = job?.status === 'running'

  const missing = useMemo(
    () => recipe.fields.filter((f) => f.required && !brief[f.key]?.trim()).map((f) => f.label),
    [recipe, brief],
  )

  const setField = (key: string, value: string) =>
    setBriefs((prev) => ({ ...prev, [recipe.id]: { ...brief, [key]: value } }))

  const snapshot = useCallback(
    (source: Job) => ({ ...source, steps: source.steps.map((s) => ({ ...s })) }),
    [],
  )

  const run = async () => {
    if (missing.length || running) return
    const controller = new AbortController()
    abortRef.current = controller
    setSaved(false)

    const ctx = { brief, assets, model, signal: controller.signal }
    const fresh = createJob(recipe, ctx)
    setJob(snapshot(fresh))
    setExpanded(new Set([fresh.steps[0].id]))

    const finished = await runPipeline(
      recipe,
      ctx,
      (event) => {
        setJob(snapshot(fresh))
        if (event.type === 'step:start') setExpanded((prev) => new Set(prev).add(event.stepId))
      },
      fresh,
    )

    setJob(snapshot(finished))
    saveJob(snapshot(finished))
    abortRef.current = null
  }

  const stop = () => abortRef.current?.abort()

  const output = job ? finalOutput(job) : ''
  const tokens = job ? jobTokens(job) : { input: 0, output: 0 }

  const saveToLibrary = () => {
    if (!job || !output) return
    addArtifact({
      id: uid('art'),
      jobId: job.id,
      recipeId: recipe.id,
      recipeName: recipe.name,
      title: brief[recipe.fields[0].key]?.slice(0, 40) || recipe.name,
      content: output,
      createdAt: Date.now(),
      starred: false,
      tags: [recipe.category],
    })
    setSaved(true)
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 p-5 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
      {/* ── 输入：需求 ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <SectionTitle title="① 选择配方" hint="配方决定了这次产出走哪条流水线" />
          <Select
            value={recipe.id}
            onChange={(e) => {
              setParams({ recipe: e.target.value })
              setJob(null)
            }}
          >
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">{recipe.summary}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {recipe.outputs.map((o) => (
              <Badge key={o}>{o}</Badge>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col p-4">
          <SectionTitle title="② 填写需求" hint="平台按这份需求驱动整条流水线" />
          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-1">
            {recipe.fields.map((field) => (
              <BriefField key={field.key} field={field} value={brief[field.key] ?? ''} onChange={(v) => setField(field.key, v)} />
            ))}
          </div>

          <div className="mt-4 border-t pt-3 hairline">
            {missing.length > 0 && (
              <p className="mb-2 text-[11px] text-muted">还需填写：{missing.join('、')}</p>
            )}
            {running ? (
              <Button variant="danger" className="w-full" icon={<Square size={14} />} onClick={stop}>
                停止运行
              </Button>
            ) : (
              <Button variant="primary" className="w-full" icon={<Play size={14} />} disabled={missing.length > 0} onClick={run}>
                开始生成
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* ── 运作逻辑：流水线 ───────────────────────────────────────── */}
      <div className="flex min-h-0 flex-col">
        <SectionTitle
          title="③ 运作逻辑"
          hint={`${recipe.steps.length} 个步骤顺序执行，上一步的产出作为下一步的输入`}
          action={
            job && (
              <span className="tabular text-[11px] text-muted">
                输入 {tokens.input} tok · 输出 {tokens.output} tok
              </span>
            )
          }
        />
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {(job?.steps ?? recipe.steps.map((s) => ({
            id: s.id, name: s.name, kind: s.kind, status: 'queued' as const, output: '', tokensIn: 0, tokensOut: 0, ms: 0,
          }))).map((step) => (
            <StepCard
              key={step.id}
              step={step}
              recipe={recipe}
              expanded={expanded.has(step.id)}
              onToggle={() =>
                setExpanded((prev) => {
                  const next = new Set(prev)
                  next.has(step.id) ? next.delete(step.id) : next.add(step.id)
                  return next
                })
              }
            />
          ))}
        </div>
      </div>

      {/* ── 产出 ───────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-col">
        <SectionTitle
          title="④ 产出物"
          hint={job?.status === 'succeeded' ? '可保存进产出库或直接导出' : '流水线跑完后在此查看成品'}
        />
        <Card className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {output ? (
              <Markdown content={output} />
            ) : (
              <p className="py-10 text-center text-xs text-muted">
                {running ? '正在产出…' : '还没有产出物'}
              </p>
            )}
          </div>
          {output && !running && (
            <div className="flex gap-2 border-t px-4 py-3 hairline">
              <Button size="sm" variant="primary" icon={<Save size={13} />} onClick={saveToLibrary} disabled={saved}>
                {saved ? '已入库' : '存入产出库'}
              </Button>
              <Button size="sm" icon={<Copy size={13} />} onClick={() => copyText(output)}>复制</Button>
              <Button size="sm" icon={<Download size={13} />} onClick={() => downloadText(`${recipe.name}.md`, output)}>
                导出
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
