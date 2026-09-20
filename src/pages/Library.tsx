import { useMemo, useState } from 'react'
import { Copy, Download, Search, Star, Trash2 } from 'lucide-react'
import { useWorkbench } from '@/lib/store'
import { Badge, Button, Card, Empty, Input, SectionTitle, Select } from '@/components/ui'
import { Markdown } from '@/components/Markdown'
import { copyText, cx, downloadText, relativeTime } from '@/lib/utils'

export function LibraryPage() {
  const artifacts = useWorkbench((s) => s.artifacts)
  const updateArtifact = useWorkbench((s) => s.updateArtifact)
  const deleteArtifact = useWorkbench((s) => s.deleteArtifact)

  const [query, setQuery] = useState('')
  const [recipeFilter, setRecipeFilter] = useState('all')
  const [starredOnly, setStarredOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const recipeNames = useMemo(
    () => [...new Set(artifacts.map((a) => a.recipeName))],
    [artifacts],
  )

  const visible = artifacts.filter((a) => {
    if (starredOnly && !a.starred) return false
    if (recipeFilter !== 'all' && a.recipeName !== recipeFilter) return false
    if (!query.trim()) return true
    const needle = query.trim().toLowerCase()
    return a.title.toLowerCase().includes(needle) || a.content.toLowerCase().includes(needle)
  })

  const selected = visible.find((a) => a.id === selectedId) ?? visible[0] ?? null

  if (artifacts.length === 0) {
    return (
      <div className="mx-auto max-w-[1180px] p-5">
        <SectionTitle title="产出库" hint="所有跑通的成品都会沉淀在这里" />
        <Empty title="产出库是空的" hint="在创作台跑完一条流水线后，点「存入产出库」即可归档成品。" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-[1180px] flex-col p-5">
      <SectionTitle title="产出库" hint={`共 ${artifacts.length} 件成品`} />

      {/* 过滤器统一排成一行，置于内容之上 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索标题或正文" className="pl-8" />
        </div>
        <Select value={recipeFilter} onChange={(e) => setRecipeFilter(e.target.value)} className="!w-auto">
          <option value="all">全部配方</option>
          {recipeNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </Select>
        <Button
          size="sm"
          variant={starredOnly ? 'primary' : 'secondary'}
          icon={<Star size={13} />}
          onClick={() => setStarredOnly((v) => !v)}
        >
          仅看收藏
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="min-h-0 space-y-1.5 overflow-y-auto pr-1">
          {visible.map((artifact) => (
            <button
              key={artifact.id}
              onClick={() => setSelectedId(artifact.id)}
              className={cx(
                'card w-full p-3 text-left transition focus-ring',
                selected?.id === artifact.id ? 'ring-1' : 'hover:bg-plane',
              )}
              style={selected?.id === artifact.id ? { borderColor: 'var(--series-1)' } : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 text-[13px] leading-snug text-ink">{artifact.title}</span>
                {artifact.starred && <Star size={13} className="shrink-0" style={{ fill: 'var(--series-4)', color: 'var(--series-4)' }} />}
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <Badge>{artifact.recipeName}</Badge>
                <span className="text-[10px] text-muted">{relativeTime(artifact.createdAt)}</span>
              </div>
            </button>
          ))}
          {visible.length === 0 && <p className="py-8 text-center text-xs text-muted">没有匹配的成品</p>}
        </div>

        {selected && (
          <Card className="flex min-h-0 flex-col">
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3 hairline">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{selected.title}</p>
                <p className="text-[11px] text-muted">{selected.recipeName} · {relativeTime(selected.createdAt)}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="ghost" icon={<Star size={13} />} onClick={() => updateArtifact(selected.id, { starred: !selected.starred })} aria-label="收藏" />
                <Button size="sm" variant="ghost" icon={<Copy size={13} />} onClick={() => copyText(selected.content)} aria-label="复制" />
                <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => downloadText(`${selected.title}.md`, selected.content)} aria-label="导出" />
                <Button size="sm" variant="ghost" icon={<Trash2 size={13} />} onClick={() => { deleteArtifact(selected.id); setSelectedId(null) }} aria-label="删除" />
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <Markdown content={selected.content} />
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
