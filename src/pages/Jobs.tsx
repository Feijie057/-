import { useState } from 'react'
import { AlertTriangle, Check, CircleDashed, Trash2 } from 'lucide-react'
import { useWorkbench } from '@/lib/store'
import { STEP_KIND_META } from '@/lib/recipes'
import { jobTokens } from '@/lib/engine'
import { Badge, Button, Card, Empty, Modal, SectionTitle } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { formatTime } from '@/lib/utils'

const STATUS_META = {
  succeeded: { label: '成功', color: 'var(--status-good)', icon: <Check size={11} /> },
  failed: { label: '失败', color: 'var(--status-critical)', icon: <AlertTriangle size={11} /> },
  running: { label: '运行中', color: 'var(--series-1)', icon: <CircleDashed size={11} /> },
  queued: { label: '排队', color: 'var(--text-muted)', icon: <CircleDashed size={11} /> },
  skipped: { label: '跳过', color: 'var(--text-muted)', icon: <CircleDashed size={11} /> },
} as const

export function Jobs() {
  const jobs = useWorkbench((s) => s.jobs)
  const deleteJob = useWorkbench((s) => s.deleteJob)
  const clearJobs = useWorkbench((s) => s.clearJobs)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = jobs.find((j) => j.id === openId) ?? null

  return (
    <div className="mx-auto max-w-[1000px] p-5">
      <SectionTitle
        title="运行记录"
        hint="每次流水线运行的完整轨迹，可逐步回看中间产物，用于定位是哪一环出了问题。"
        action={jobs.length > 0 && <Button size="sm" icon={<Trash2 size={13} />} onClick={clearJobs}>清空</Button>}
      />

      {jobs.length === 0 ? (
        <Empty title="还没有运行记录" hint="在创作台跑一次流水线，这里就会留下完整轨迹。" />
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const meta = STATUS_META[job.status]
            const tokens = jobTokens(job)
            const seconds = job.finishedAt ? ((job.finishedAt - job.createdAt) / 1000).toFixed(1) : '—'
            return (
              <Card key={job.id} className="flex flex-wrap items-center gap-3 p-3.5">
                <Badge color={meta.color}>{meta.icon}{meta.label}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink">{job.recipeName}</p>
                  <p className="truncate text-[11px] text-muted">
                    {formatTime(job.createdAt)} · {seconds}s · {tokens.input + tokens.output} tok
                    {job.error ? ` · ${job.error}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {job.steps.map((step) => (
                    <span
                      key={step.id}
                      title={`${step.name}：${STATUS_META[step.status].label}`}
                      className="h-1.5 w-6 rounded-full"
                      style={{
                        background: step.status === 'succeeded'
                          ? STEP_KIND_META[step.kind].color
                          : step.status === 'failed'
                            ? 'var(--status-critical)'
                            : 'var(--baseline)',
                      }}
                    />
                  ))}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" onClick={() => setOpenId(job.id)}>详情</Button>
                  <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => deleteJob(job.id)} aria-label="删除" />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={Boolean(open)} wide title={open ? `${open.recipeName} · 运行详情` : ''} onClose={() => setOpenId(null)}>
        {open && (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-2">本次需求</p>
              <div className="space-y-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--plane)' }}>
                {Object.entries(open.brief).filter(([, v]) => v).map(([key, value]) => (
                  <p key={key} className="text-[11px] leading-relaxed text-ink-2">
                    <span className="text-muted">{key}：</span>{value}
                  </p>
                ))}
              </div>
            </div>
            {open.steps.map((step) => (
              <div key={step.id}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="h-3.5 w-1 rounded-full" style={{ background: STEP_KIND_META[step.kind].color }} />
                  <p className="text-xs font-medium text-ink">{step.name}</p>
                  <Badge color={STATUS_META[step.status].color}>{STATUS_META[step.status].label}</Badge>
                  <span className="tabular text-[10px] text-muted">{step.tokensOut} tok · {(step.ms / 1000).toFixed(1)}s</span>
                </div>
                {step.output ? (
                  <div className="rounded-xl border px-3 py-2 hairline"><Markdown content={step.output} /></div>
                ) : (
                  <p className="text-[11px] text-muted">{step.error ?? '无输出'}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
