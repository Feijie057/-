import { Download, Trash2, Upload } from 'lucide-react'
import { useWorkbench, type Theme } from '@/lib/store'
import { Button, Card, Label, SectionTitle, Select } from '@/components/ui'
import { downloadText } from '@/lib/utils'

export function Settings() {
  const state = useWorkbench()

  const exportAll = () => {
    const payload = {
      recipes: state.recipes.filter((r) => !r.builtin),
      assets: state.assets,
      artifacts: state.artifacts,
      models: state.models.map((m) => ({ ...m, apiKey: undefined })),
      exportedAt: new Date().toISOString(),
    }
    downloadText('nvwa-workbench-export.json', JSON.stringify(payload, null, 2))
  }

  const importAll = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        data.recipes?.forEach((r: never) => state.upsertRecipe(r))
        data.assets?.forEach((a: never) => state.upsertAsset(a))
        data.models?.forEach((m: never) => state.upsertModel(m))
      } catch {
        alert('导入失败：文件不是有效的导出 JSON')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-4 p-5">
      <SectionTitle title="设置" hint="所有数据保存在当前浏览器，清空缓存会一并丢失，重要内容请先导出。" />

      <Card className="p-4">
        <Label hint="「跟随系统」会随操作系统的明暗偏好切换">外观主题</Label>
        <Select value={state.theme} onChange={(e) => state.setTheme(e.target.value as Theme)}>
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </Select>
      </Card>

      <Card className="p-4">
        <Label hint="导出不包含 API Key，需在新环境重新填写">数据迁移</Label>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button icon={<Download size={14} />} onClick={exportAll}>导出配置与产出</Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border bg-raised px-3.5 py-2 text-sm text-ink transition hover:bg-plane hairline">
            <Upload size={14} />导入
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])}
            />
          </label>
        </div>
      </Card>

      <Card className="p-4">
        <Label hint="仅清除运行记录，配方、资产与产出库保留">清理</Label>
        <Button className="mt-1" icon={<Trash2 size={14} />} onClick={state.clearJobs}>清空运行记录</Button>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-medium text-ink-2">关于</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          女娲工作台 —— 一个把「输入需求 → 运作逻辑 → 产出内容」固化下来的 AI 内容生成工作台。
          流水线执行器在 <code>src/lib/engine.ts</code>，内置配方在 <code>src/lib/recipes.ts</code>，
          模型适配层在 <code>src/lib/providers.ts</code>。
        </p>
      </Card>
    </div>
  )
}
