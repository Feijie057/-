import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Asset, AssetKind } from '@/lib/types'
import { useWorkbench } from '@/lib/store'
import { Badge, Button, Card, Empty, Input, Label, Modal, SectionTitle, Select, Textarea } from '@/components/ui'
import { relativeTime, uid } from '@/lib/utils'

const KIND_META: Record<AssetKind, { label: string; color: string; hint: string }> = {
  brand: { label: '品牌调性', color: 'var(--series-1)', hint: '语气、用词偏好、表达边界' },
  glossary: { label: '术语口径', color: 'var(--series-3)', hint: '统一说法，避免同义词乱用' },
  reference: { label: '参考资料', color: 'var(--series-2)', hint: '产品事实、历史稿件、素材片段' },
}

export function Assets() {
  const assets = useWorkbench((s) => s.assets)
  const upsertAsset = useWorkbench((s) => s.upsertAsset)
  const deleteAsset = useWorkbench((s) => s.deleteAsset)
  const [draft, setDraft] = useState<Asset | null>(null)

  return (
    <div className="mx-auto max-w-[1180px] p-5">
      <SectionTitle
        title="品牌资产"
        hint="这里的内容会作为长期上下文注入流水线的每一步，约束所有产出。"
        action={
          <Button size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setDraft({
            id: uid('ast'), name: '', kind: 'brand', content: '', updatedAt: Date.now(),
          })}>
            新增资产
          </Button>
        }
      />

      {assets.length === 0 ? (
        <Empty title="还没有品牌资产" hint="加入品牌语气与术语口径后，所有配方的产出都会自动对齐同一套表达规范。" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const meta = KIND_META[asset.kind]
            return (
              <Card key={asset.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium text-ink">{asset.name}</p>
                  <Badge color={meta.color}>{meta.label}</Badge>
                </div>
                <p className="mt-2 line-clamp-4 flex-1 text-[11px] leading-relaxed text-muted">{asset.content}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-muted">{relativeTime(asset.updatedAt)}更新</span>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => setDraft({ ...asset })}>编辑</Button>
                    <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={() => deleteAsset(asset.id)} aria-label="删除" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={Boolean(draft)}
        title={draft?.name ? `编辑「${draft.name}」` : '新增品牌资产'}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>取消</Button>
            <Button
              variant="primary"
              disabled={!draft?.name.trim() || !draft?.content.trim()}
              onClick={() => {
                if (draft) upsertAsset({ ...draft, updatedAt: Date.now() })
                setDraft(null)
              }}
            >
              保存
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-3.5">
            <div>
              <Label required>名称</Label>
              <Input value={draft.name} placeholder="例：品牌语气" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <Label hint={KIND_META[draft.kind].hint}>类型</Label>
              <Select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as AssetKind })}>
                {(Object.keys(KIND_META) as AssetKind[]).map((kind) => (
                  <option key={kind} value={kind}>{KIND_META[kind].label}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label required>内容</Label>
              <Textarea
                value={draft.content}
                className="min-h-[180px]"
                placeholder="用陈述句写清规则，模型会逐条遵守"
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
