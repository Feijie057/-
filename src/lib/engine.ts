import type { Job, JobStep, Recipe, RunContext } from './types'
import { generate, ProviderError } from './providers'
import { renderTemplate, uid } from './utils'

export type EngineEvent =
  | { type: 'job:start'; job: Job }
  | { type: 'step:start'; stepId: string }
  | { type: 'step:delta'; stepId: string; chunk: string }
  | { type: 'step:done'; stepId: string; step: JobStep }
  | { type: 'step:error'; stepId: string; message: string }
  | { type: 'job:done'; job: Job }
  | { type: 'job:error'; job: Job; message: string }

/** 拼给模型的系统提示：把品牌资产作为长期上下文注入每一步 */
function buildSystemPrompt(ctx: RunContext, recipe: Recipe): string {
  const brand = ctx.assets.filter((a) => a.kind === 'brand')
  const glossary = ctx.assets.filter((a) => a.kind === 'glossary')
  const reference = ctx.assets.filter((a) => a.kind === 'reference')

  const sections = [
    `你正在「女娲工作台」中执行内容配方「${recipe.name}」的一个步骤。只输出这一步要求的内容，不要复述指令，不要加寒暄。`,
  ]
  if (brand.length) sections.push(`【品牌调性】\n${brand.map((a) => `${a.name}：${a.content}`).join('\n')}`)
  if (glossary.length) sections.push(`【术语口径】\n${glossary.map((a) => `${a.name}：${a.content}`).join('\n')}`)
  if (reference.length) sections.push(`【参考资料】\n${reference.map((a) => `${a.name}：${a.content}`).join('\n')}`)
  return sections.join('\n\n')
}

export function createJob(recipe: Recipe, ctx: RunContext): Job {
  return {
    id: uid('job'),
    recipeId: recipe.id,
    recipeName: recipe.name,
    brief: { ...ctx.brief },
    status: 'queued',
    modelId: ctx.model.id,
    createdAt: Date.now(),
    steps: recipe.steps.map<JobStep>((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      status: 'queued',
      output: '',
      tokensIn: 0,
      tokensOut: 0,
      ms: 0,
    })),
  }
}

/**
 * 流水线执行器 —— 平台「运作逻辑」的核心。
 * 步骤顺序执行，每一步的输出写入上下文，供后续步骤以 {{steps.id}} 引用。
 */
export async function runPipeline(
  recipe: Recipe,
  ctx: RunContext,
  emit: (event: EngineEvent) => void,
  job: Job = createJob(recipe, ctx),
): Promise<Job> {
  const system = buildSystemPrompt(ctx, recipe)
  const outputs: Record<string, string> = {}

  job.status = 'running'
  emit({ type: 'job:start', job })

  for (const definition of recipe.steps) {
    const step = job.steps.find((s) => s.id === definition.id)!
    const startedAt = performance.now()
    step.status = 'running'
    step.output = ''
    emit({ type: 'step:start', stepId: step.id })

    const prompt = renderTemplate(definition.prompt, ctx.brief, outputs)

    try {
      const result = await generate(ctx.model, {
        prompt,
        system,
        temperature: definition.temperature,
        kind: definition.kind,
        signal: ctx.signal,
        onDelta: (chunk) => {
          step.output += chunk
          emit({ type: 'step:delta', stepId: step.id, chunk })
        },
      })
      step.output = result.text || step.output
      step.tokensIn = result.tokensIn
      step.tokensOut = result.tokensOut
      step.ms = Math.round(performance.now() - startedAt)
      step.status = 'succeeded'
      outputs[step.id] = step.output
      emit({ type: 'step:done', stepId: step.id, step })
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError'
      const message = aborted
        ? '已取消'
        : error instanceof ProviderError
          ? `${error.message}${error.detail ? `：${error.detail.slice(0, 200)}` : ''}`
          : error instanceof Error
            ? error.message
            : '未知错误'

      step.status = 'failed'
      step.error = message
      step.ms = Math.round(performance.now() - startedAt)
      emit({ type: 'step:error', stepId: step.id, message })

      // 后续步骤依赖当前输出，无法继续，标记为跳过而非失败。
      for (const rest of job.steps) {
        if (rest.status === 'queued') rest.status = 'skipped'
      }
      job.status = 'failed'
      job.error = `步骤「${step.name}」${message}`
      job.finishedAt = Date.now()
      emit({ type: 'job:error', job, message: job.error })
      return job
    }
  }

  job.status = 'succeeded'
  job.finishedAt = Date.now()
  emit({ type: 'job:done', job })
  return job
}

/** 最后一个 format 步骤的输出即成品；没有则取最后一个成功步骤 */
export function finalOutput(job: Job): string {
  const packed = [...job.steps].reverse().find((s) => s.kind === 'format' && s.status === 'succeeded')
  if (packed) return packed.output
  const last = [...job.steps].reverse().find((s) => s.status === 'succeeded')
  return last?.output ?? ''
}

export function jobTokens(job: Job): { input: number; output: number } {
  return job.steps.reduce(
    (acc, s) => ({ input: acc.input + s.tokensIn, output: acc.output + s.tokensOut }),
    { input: 0, output: 0 },
  )
}
