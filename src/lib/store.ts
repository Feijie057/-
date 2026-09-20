import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Artifact, Asset, Job, ModelConfig, Recipe } from './types'
import { BUILTIN_RECIPES } from './recipes'
import { uid } from './utils'

export type Theme = 'light' | 'dark' | 'system'

const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'mdl_mock',
    label: '本地模拟引擎',
    provider: 'mock',
    model: 'nvwa-sim-1',
    enabled: true,
  },
]

const DEFAULT_ASSETS: Asset[] = [
  {
    id: uid('ast'),
    name: '品牌语气',
    kind: 'brand',
    content:
      '克制、具体、可验证。多用动词与场景描写，少用形容词堆叠。不使用「颠覆」「革命性」「行业第一」等大词；对不确定的事实使用「约」「在我们的测试中」等限定表述。',
    updatedAt: Date.now(),
  },
  {
    id: uid('ast'),
    name: '术语口径',
    kind: 'glossary',
    content:
      '统一使用「工作台」而非「控制台」；「配方」指一条可复用的内容流水线；「产出物」指流水线最终交付的成品；对外文案中不出现内部代号。',
    updatedAt: Date.now(),
  },
]

interface WorkbenchState {
  recipes: Recipe[]
  jobs: Job[]
  artifacts: Artifact[]
  assets: Asset[]
  models: ModelConfig[]
  activeModelId: string
  theme: Theme
  sidebarCollapsed: boolean

  upsertRecipe: (recipe: Recipe) => void
  deleteRecipe: (id: string) => void
  restoreBuiltins: () => void

  saveJob: (job: Job) => void
  deleteJob: (id: string) => void
  clearJobs: () => void

  addArtifact: (artifact: Artifact) => void
  updateArtifact: (id: string, patch: Partial<Artifact>) => void
  deleteArtifact: (id: string) => void

  upsertAsset: (asset: Asset) => void
  deleteAsset: (id: string) => void

  upsertModel: (model: ModelConfig) => void
  deleteModel: (id: string) => void
  setActiveModel: (id: string) => void

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
}

/** 按 id 就地替换，不存在则追加到最前 */
function upsertBy<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((entry) => entry.id === item.id)
  if (index === -1) return [item, ...list]
  const next = [...list]
  next[index] = item
  return next
}

export const useWorkbench = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      recipes: BUILTIN_RECIPES,
      jobs: [],
      artifacts: [],
      assets: DEFAULT_ASSETS,
      models: DEFAULT_MODELS,
      activeModelId: DEFAULT_MODELS[0].id,
      theme: 'system',
      sidebarCollapsed: false,

      upsertRecipe: (recipe) => set({ recipes: upsertBy(get().recipes, recipe) }),
      deleteRecipe: (id) =>
        set({ recipes: get().recipes.filter((r) => r.id !== id || r.builtin) }),
      restoreBuiltins: () =>
        set({
          recipes: [
            ...BUILTIN_RECIPES,
            ...get().recipes.filter((r) => !BUILTIN_RECIPES.some((b) => b.id === r.id)),
          ],
        }),

      saveJob: (job) => set({ jobs: upsertBy(get().jobs, job).slice(0, 200) }),
      deleteJob: (id) => set({ jobs: get().jobs.filter((j) => j.id !== id) }),
      clearJobs: () => set({ jobs: [] }),

      addArtifact: (artifact) => set({ artifacts: [artifact, ...get().artifacts] }),
      updateArtifact: (id, patch) =>
        set({
          artifacts: get().artifacts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }),
      deleteArtifact: (id) => set({ artifacts: get().artifacts.filter((a) => a.id !== id) }),

      upsertAsset: (asset) => set({ assets: upsertBy(get().assets, asset) }),
      deleteAsset: (id) => set({ assets: get().assets.filter((a) => a.id !== id) }),

      upsertModel: (model) => set({ models: upsertBy(get().models, model) }),
      deleteModel: (id) => {
        const models = get().models.filter((m) => m.id !== id)
        set({
          models,
          activeModelId:
            get().activeModelId === id ? (models[0]?.id ?? '') : get().activeModelId,
        })
      },
      setActiveModel: (id) => set({ activeModelId: id }),

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
    }),
    {
      name: 'nvwa-workbench',
      version: 1,
      partialize: (state) => ({
        recipes: state.recipes,
        jobs: state.jobs,
        artifacts: state.artifacts,
        assets: state.assets,
        models: state.models,
        activeModelId: state.activeModelId,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    },
  ),
)

export function useActiveModel(): ModelConfig {
  const models = useWorkbench((s) => s.models)
  const activeModelId = useWorkbench((s) => s.activeModelId)
  return models.find((m) => m.id === activeModelId) ?? models[0] ?? DEFAULT_MODELS[0]
}
