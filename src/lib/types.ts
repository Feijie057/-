/** 平台的领域模型：需求(Brief) → 配方(Recipe) → 运行(Job) → 产出(Artifact) */

export type FieldType = 'text' | 'textarea' | 'select' | 'tags' | 'number'

/** 一个配方对外暴露的输入字段（即「需求表单」的一格） */
export interface RecipeField {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  hint?: string
  options?: string[]
  required?: boolean
  defaultValue?: string
}

/** 流水线步骤的语义分类，决定它在画布上的配色与图标 */
export type StepKind = 'plan' | 'retrieve' | 'generate' | 'refine' | 'validate' | 'format'

export interface RecipeStep {
  id: string
  name: string
  kind: StepKind
  /** 这一步在做什么，展示给用户看 */
  desc: string
  /** 提示词模板，支持 {{字段名}} 与 {{steps.步骤id}} 占位 */
  prompt: string
  temperature: number
}

export interface Recipe {
  id: string
  name: string
  category: string
  summary: string
  /** 产出物名称，例如「标题 × 5」「正文」 */
  outputs: string[]
  fields: RecipeField[]
  steps: RecipeStep[]
  builtin: boolean
  updatedAt: number
}

export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped'

export interface JobStep {
  id: string
  name: string
  kind: StepKind
  status: RunStatus
  output: string
  tokensIn: number
  tokensOut: number
  ms: number
  error?: string
}

export interface Job {
  id: string
  recipeId: string
  recipeName: string
  brief: Record<string, string>
  status: RunStatus
  steps: JobStep[]
  createdAt: number
  finishedAt?: number
  modelId: string
  error?: string
}

export interface Artifact {
  id: string
  jobId: string
  recipeId: string
  recipeName: string
  title: string
  content: string
  createdAt: number
  starred: boolean
  tags: string[]
}

export type AssetKind = 'brand' | 'reference' | 'glossary'

export interface Asset {
  id: string
  name: string
  kind: AssetKind
  content: string
  updatedAt: number
}

export type ProviderKind = 'mock' | 'anthropic' | 'openai'

export interface ModelConfig {
  id: string
  label: string
  provider: ProviderKind
  model: string
  baseUrl?: string
  apiKey?: string
  enabled: boolean
}

export interface RunContext {
  brief: Record<string, string>
  assets: Asset[]
  model: ModelConfig
  signal?: AbortSignal
}
