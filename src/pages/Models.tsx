import { useState } from 'react'
import { AlertTriangle, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import type { ModelConfig, ProviderKind } from '@/lib/types'
import { generate, PROVIDER_LABEL } from '@/lib/providers'
import { useWorkbench } from '@/lib/store'
import { Badge, Button, Card, Input, Label, Modal, SectionTitle, Select } from '@/components/ui'
import { cx, uid } from '@/lib/utils'

const PRESETS: Record<ProviderKind, { baseUrl: string; model: string; hint: string }> = {
  mock: { baseUrl: '', model: 'nvwa-sim-1', hint: '离线可用，产出为结构化占位内容，用于跑通流程。' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-5', hint: '直连 Anthropic Messages API，需浏览器直连开关。' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', hint: '任何兼容 /chat/completions 的服务都可接入。' },
}

type ProbeState = 'idle' | 'testing' | 'ok' | 'fail'

export function Models() {
  const models = useWorkbench((s) => s.models)
  const activeModelId = useWorkbench((s) => s.activeModelId)
  const upsertModel = useWorkbench((s) => s.upsertModel)
  const deleteModel = useWorkbench((s) => s.deleteModel)
  const setActiveModel = useWorkbench((s) => s.setActiveModel)

  const [draft, setDraft] = useState<ModelConfig | null>(null)
  const [probe, setProbe] = useState<Record<string, ProbeState>>({})
  const [probeError, setProbeError] = useState<Record<string, string>>({})

  const test = async (model: ModelConfig) => {
    setProbe((p) => ({ ...p, [model.id]: 'testing' }))
    try {
      await generate(model, { prompt: '回复两个字：可用', temperature: 0, kind: 'plan' })
      setProbe((p) => ({ ...p, [model.id]: 'ok' }))
    } catch (error) {
      setProbe((p) => ({ ...p, [model.id]: 'fail' }))
      setProbeError((e) => ({ ...e, [model.id]: error instanceof Error ? error.message : '连接失败' }))
    }
  }

  return (
    <div className="mx-auto max-w-[900px] p-5">
      <SectionTitle
        title="模型接入"
        hint="流水线的每一步都由当前选中的模型执行。密钥仅保存在本地浏览器，不会发往任何第三方。"
        action={
          <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setDraft({
            id: uid('mdl'), label: '', provider: 'openai', model: PRESETS.openai.model,
            baseUrl: PRESETS.openai.baseUrl, apiKey: '', enabled: true,
          })}>
            添加模型
          </Button>
        }
      />

      <div className="space-y-2.5">
        {models.map((model) => {
          const state = probe[model.id] ?? 'idle'
          const isActive = model.id === activeModelId
          return (
            <Card key={model.id} className={cx('p-4', isActive && 'ring-1')} style={isActive ? { borderColor: 'var(--series-1)' } : undefined}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-ink">{model.label}</p>
                    <Badge color={model.provider === 'mock' ? 'var(--series-4)' : 'var(--series-1)'}>
                      {PROVIDER_LABEL[model.provider]}
                    </Badge>
                    {isActive && <Badge color="var(--status-good)"><Check size={11} />使用中</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {model.model}
                    {model.baseUrl ? ` · ${model.baseUrl}` : ''}
                    {model.provider !== 'mock' && !model.apiKey ? ' · 未配置密钥' : ''}
                  </p>
                  {state === 'fail' && (
                    <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: 'var(--status-critical)' }}>
                      <AlertTriangle size={11} />{probeError[model.id]}
                    </p>
                  )}
                  {state === 'ok' && (
                    <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: 'var(--status-good)' }}>
                      <Check size={11} />连接正常
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <Button size="sm" onClick={() => test(model)} disabled={state === 'testing'}
                    icon={state === 'testing' ? <Loader2 size={12} className="animate-spin" /> : undefined}>
                    测试
                  </Button>
                  {!isActive && <Button size="sm" onClick={() => setActiveModel(model.id)}>设为当前</Button>}
                  <Button size="sm" onClick={() => setDraft({ ...model })}>编辑</Button>
                  {models.length > 1 && (
                    <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => deleteModel(model.id)} aria-label="删除" />
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal
        open={Boolean(draft)}
        title={draft?.label ? `编辑「${draft.label}」` : '添加模型'}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>取消</Button>
            <Button variant="primary" disabled={!draft?.label.trim() || !draft?.model.trim()} onClick={() => {
              if (draft) upsertModel(draft)
              setDraft(null)
            }}>
              保存
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-3.5">
            <div>
              <Label required>显示名称</Label>
              <Input value={draft.label} placeholder="例：主力写作模型" onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </div>
            <div>
              <Label hint={PRESETS[draft.provider].hint}>服务商</Label>
              <Select
                value={draft.provider}
                onChange={(e) => {
                  const provider = e.target.value as ProviderKind
                  setDraft({ ...draft, provider, ...PRESETS[provider] })
                }}
              >
                {(Object.keys(PRESETS) as ProviderKind[]).map((provider) => (
                  <option key={provider} value={provider}>{PROVIDER_LABEL[provider]}</option>
                ))}
              </Select>
            </div>
            {draft.provider !== 'mock' && (
              <>
                <div>
                  <Label required>模型 ID</Label>
                  <Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
                </div>
                <div>
                  <Label>接口地址</Label>
                  <Input value={draft.baseUrl ?? ''} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
                </div>
                <div>
                  <Label hint="仅写入当前浏览器的 localStorage；生产环境建议改由后端代理转发。">API Key</Label>
                  <Input type="password" value={draft.apiKey ?? ''} placeholder="sk-…" onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} />
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
