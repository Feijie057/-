import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import type { Recipe, RecipeStep, StepKind } from '@/lib/types'
import { STEP_KIND_META } from '@/lib/recipes'
import { useWorkbench } from '@/lib/store'
import { Badge, Button, Card, Input, Label, Modal, SectionTitle, Select, Textarea } from '@/components/ui'
import { uid } from '@/lib/utils'

const KINDS = Object.keys(STEP_KIND_META) as StepKind[]

function blankRecipe(): Recipe {
  return {
    id: uid('rcp'),
    name: '新配方',
    category: '自定义',
    summary: '描述这条流水线解决什么内容需求。',
    outputs: ['成品'],
    builtin: false,
    updatedAt: Date.now(),
    fields: [
      { key: 'topic', label: '主题', type: 'text', required: true, placeholder: '这次要产出什么' },
      { key: 'audience', label: '目标人群', type: 'text', placeholder: '写给谁看' },
    ],
    steps: [
      { id: 'plan', name: '需求拆解', kind: 'plan', temperature: 0.3, desc: '把需求翻译成内容策略。', prompt: '针对主题「{{topic}}」，面向「{{audience}}」，给出内容策略要点。' },
      { id: 'draft', name: '内容生成', kind: 'generate', temperature: 0.8, desc: '产出内容主体。', prompt: '根据策略写出完整内容。\n\n策略：\n{{steps.plan}}' },
      { id: 'pack', name: '成品打包', kind: 'format', temperature: 0.3, desc: '排版为可交付物。', prompt: '把内容整理为可直接使用的成品。\n\n{{steps.draft}}' },
    ],
  }
}

function StepEditor({ step, editable, onChange, onRemove }: {
  step: RecipeStep
  editable: boolean
  onChange: (next: RecipeStep) => void
  onRemove: () => void
}) {
  const meta = STEP_KIND_META[step.kind]
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: meta.color }} />
        <Input
          value={step.name}
          disabled={!editable}
          onChange={(e) => onChange({ ...step, name: e.target.value })}
          className="flex-1 !py-1.5 text-[13px] font-medium"
        />
        <Select
          value={step.kind}
          disabled={!editable}
          onChange={(e) => onChange({ ...step, kind: e.target.value as StepKind })}
          className="!w-24 !py-1.5 text-xs"
        >
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>{STEP_KIND_META[kind].label}</option>
          ))}
        </Select>
        {editable && (
          <button onClick={onRemove} className="rounded-lg p-1.5 text-muted transition hover:bg-plane focus-ring" aria-label="删除步骤">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="mt-2.5">
        <Label>步骤说明</Label>
        <Input value={step.desc} disabled={!editable} onChange={(e) => onChange({ ...step, desc: e.target.value })} className="text-xs" />
      </div>

      <div className="mt-2.5">
        <Label hint="{{字段名}} 取需求表单的值，{{steps.步骤id}} 取前序步骤的输出">提示词模板</Label>
        <Textarea
          value={step.prompt}
          disabled={!editable}
          onChange={(e) => onChange({ ...step, prompt: e.target.value })}
          className="min-h-[110px] font-mono text-[11px] leading-relaxed"
        />
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <Label>发散度 {step.temperature.toFixed(1)}</Label>
        <input
          type="range" min={0} max={1} step={0.1}
          value={step.temperature}
          disabled={!editable}
          onChange={(e) => onChange({ ...step, temperature: Number(e.target.value) })}
          className="flex-1 accent-[var(--series-1)]"
        />
        <span className="shrink-0 text-[11px] text-muted">步骤 id：{step.id}</span>
      </div>
    </Card>
  )
}

export function Recipes() {
  const navigate = useNavigate()
  const recipes = useWorkbench((s) => s.recipes)
  const upsertRecipe = useWorkbench((s) => s.upsertRecipe)
  const deleteRecipe = useWorkbench((s) => s.deleteRecipe)
  const restoreBuiltins = useWorkbench((s) => s.restoreBuiltins)
  const [draft, setDraft] = useState<Recipe | null>(null)

  const editable = Boolean(draft && !draft.builtin)

  const duplicate = (recipe: Recipe) => {
    const copy: Recipe = {
      ...recipe,
      id: uid('rcp'),
      name: `${recipe.name}（副本）`,
      builtin: false,
      updatedAt: Date.now(),
      steps: recipe.steps.map((s) => ({ ...s })),
      fields: recipe.fields.map((f) => ({ ...f })),
    }
    upsertRecipe(copy)
    setDraft(copy)
  }

  return (
    <div className="mx-auto max-w-[1180px] p-5">
      <SectionTitle
        title="配方库"
        hint="一个配方 = 一份需求表单 + 一条流水线。平台的「运作逻辑」都写在这里。"
        action={
          <div className="flex gap-2">
            <Button size="sm" icon={<RotateCcw size={13} />} onClick={restoreBuiltins}>恢复内置</Button>
            <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => {
              const created = blankRecipe()
              upsertRecipe(created)
              setDraft(created)
            }}>
              新建配方
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe) => (
          <Card key={recipe.id} className="flex flex-col p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-ink">{recipe.name}</p>
              <Badge color={recipe.builtin ? undefined : 'var(--series-3)'}>
                {recipe.builtin ? recipe.category : '自定义'}
              </Badge>
            </div>
            <p className="mt-1.5 flex-1 text-[11px] leading-relaxed text-muted">{recipe.summary}</p>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-1">
                {recipe.steps.map((step) => (
                  <span key={step.id} className="h-1 flex-1 rounded-full" style={{ background: STEP_KIND_META[step.kind].color }} title={`${step.name}（${STEP_KIND_META[step.kind].label}）`} />
                ))}
              </div>
              <p className="text-[10px] text-muted">
                {recipe.fields.length} 个输入字段 · {recipe.steps.length} 个步骤 · 产出 {recipe.outputs.join('、')}
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="primary" icon={<Sparkles size={12} />} onClick={() => navigate(`/studio?recipe=${recipe.id}`)}>
                使用
              </Button>
              <Button size="sm" onClick={() => setDraft({ ...recipe, steps: recipe.steps.map((s) => ({ ...s })) })}>
                查看逻辑
              </Button>
              <Button size="sm" variant="ghost" icon={<Copy size={12} />} onClick={() => duplicate(recipe)} aria-label="复制为自定义" />
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(draft)}
        wide
        title={draft ? `${draft.name} · 流水线` : ''}
        onClose={() => setDraft(null)}
        footer={
          draft && (
            <>
              {!draft.builtin && (
                <Button
                  variant="ghost"
                  icon={<Trash2 size={13} />}
                  onClick={() => { deleteRecipe(draft.id); setDraft(null) }}
                >
                  删除配方
                </Button>
              )}
              {draft.builtin && (
                <Button icon={<Copy size={13} />} onClick={() => duplicate(draft)}>复制后编辑</Button>
              )}
              <Button variant="primary" onClick={() => {
                if (draft && !draft.builtin) upsertRecipe({ ...draft, updatedAt: Date.now() })
                setDraft(null)
              }}>
                {editable ? '保存' : '关闭'}
              </Button>
            </>
          )
        }
      >
        {draft && (
          <div className="space-y-4">
            {draft.builtin && (
              <p className="rounded-xl px-3 py-2 text-[11px] text-ink-2" style={{ background: 'var(--plane)' }}>
                内置配方为只读。点「复制后编辑」生成一份可改的副本。
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>配方名称</Label>
                <Input value={draft.name} disabled={!editable} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div>
                <Label>分类</Label>
                <Input value={draft.category} disabled={!editable} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>一句话说明</Label>
              <Input value={draft.summary} disabled={!editable} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            </div>

            <div>
              <Label hint="这些字段会渲染成创作台左侧的需求表单">需求表单字段</Label>
              <div className="flex flex-wrap gap-1.5">
                {draft.fields.map((field) => (
                  <Badge key={field.key}>
                    {field.label}
                    <span className="text-muted">·{field.key}</span>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>流水线步骤（顺序执行）</Label>
                {editable && (
                  <Button size="sm" icon={<Plus size={12} />} onClick={() => setDraft({
                    ...draft,
                    steps: [...draft.steps, {
                      id: `s${draft.steps.length + 1}`,
                      name: '新步骤', kind: 'generate', temperature: 0.7,
                      desc: '这一步做什么', prompt: '{{steps.' + draft.steps[draft.steps.length - 1].id + '}}',
                    }],
                  })}>
                    添加步骤
                  </Button>
                )}
              </div>
              <div className="space-y-2.5">
                {draft.steps.map((step, index) => (
                  <StepEditor
                    key={step.id}
                    step={step}
                    editable={editable}
                    onChange={(next) => setDraft({
                      ...draft,
                      steps: draft.steps.map((s, i) => (i === index ? next : s)),
                    })}
                    onRemove={() => setDraft({ ...draft, steps: draft.steps.filter((_, i) => i !== index) })}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
