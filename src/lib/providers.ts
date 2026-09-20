import type { ModelConfig, StepKind } from './types'
import { estimateTokens } from './utils'

export interface GenerateArgs {
  prompt: string
  temperature: number
  system?: string
  kind: StepKind
  signal?: AbortSignal
  onDelta?: (chunk: string) => void
}

export interface GenerateResult {
  text: string
  tokensIn: number
  tokensOut: number
}

export class ProviderError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message)
    this.name = 'ProviderError'
  }
}

/* ── 本地模拟引擎 ──────────────────────────────────────────────────────────
   未配置任何真实模型时使用，保证平台离线可完整走通「输入 → 运作 → 产出」。
   它按步骤类型生成结构化的占位产出，形状与真实输出一致。            */

const MOCK_BLUEPRINTS: Record<StepKind, (seed: string) => string> = {
  plan: (seed) => `**一句话主张**
${seed}——把复杂的事做成一件顺手的事。

**三个切入点**
1. 现状里最让人烦的那一步是什么，先把它说清楚
2. 换一种做法之后，一天里具体省下了哪些动作
3. 谁最先受益，他们的第一反应是什么

**支撑材料**
- 场景描写 ×2（早晨与临近下班各一个）
- 可量化的对比 ×1（需人工补实际数据）
- 用户原话引用 ×1（需人工补访谈素材）`,

  retrieve: (seed) => `**可用上下文**
- 品牌调性：克制、具体、不夸张；避免「颠覆」「革命」一类的大词
- 术语口径：统一使用「工作台」而非「控制台」；「产出物」而非「成品件」
- 相关素材：与「${seed}」相关的历史稿件 3 篇，其中 1 篇的开头结构可复用

**约束**
- 禁止出现绝对化表述与未经证实的对比
- 数字一律保留来源，无来源的以「约」表述并标注待核`,

  generate: (seed) => `${seed}

先说结论：真正卡住人的从来不是工具不够多，而是每次都要从零开始想「这次该怎么开头」。

**一、把重复的部分交出去**
同一类内容，八成的结构是固定的。固定的部分应该被沉淀成模板，而不是每次重新决定。你需要保留判断力的地方，其实只有那两三个真正因项目而异的选择。

**二、让每一步都留下痕迹**
一次产出不该是一个黑箱。拆解、调取、生成、校验，每一步的中间结果都应该可查、可改、可回退——这样出了问题才知道是哪一环。

**三、把校验放在产出之前**
合规和事实核查如果放在最后，改起来的成本最高。放到流水线里，它就只是一道自动执行的关卡。

最后一件事：先跑通一个最小的闭环，再谈扩展。`,

  refine: () => `**修订说明**
- 删去 4 处套话（「众所周知」「在当今时代」等）
- 3 处抽象表述改为具体描写
- 开头重写，把结论提前，结尾落到一个具体动作上

**修订稿**
真正卡住人的，从来不是工具不够多。

同一类内容，八成的结构其实是固定的——固定的部分应该被沉淀成模板，而不是每次从零开始想「这次该怎么开头」。你需要保留判断力的地方，只有那两三个真正因项目而异的选择。

把校验放到产出之前，合规和事实核查就不再是返工，而只是流水线上的一道关卡。

先跑通一个最小的闭环，再谈扩展。`,

  validate: () => `**校验结果：2 项待修订**

| 级别 | 位置 | 问题 | 建议 |
| --- | --- | --- | --- |
| 待修订 | 第 2 段 | 「效果最好」属绝对化表述 | 改为「在我们的测试场景中表现更稳定」 |
| 待修订 | 结尾 | 「一定能」构成效果承诺 | 改为「通常可以」并补充前提条件 |
| 提示 | 全文 | 出现 1 处未标注来源的数字 | 补来源，或改为区间表述 |

事实性内容仍需人工复核，模型校验只覆盖表述风险。`,

  format: () => `## 成品

**标题候选**
1. 通勤三年，我把这件事彻底交出去了
2. 别再从零开始写开头了
3. 一条流水线，把重复的八成固化下来

**正文（终稿）**
真正卡住人的，从来不是工具不够多，而是每次都要重新决定「这次该怎么开头」。

同一类内容，八成的结构是固定的。把固定的部分沉淀成配方，需要判断力的地方就只剩那两三个真正因项目而异的选择。每一步的中间结果都留痕，出了问题才知道是哪一环。合规与事实核查放进流水线，它就只是一道自动执行的关卡，而不是交付前的返工。

先跑通一个最小的闭环，再谈扩展。

**话题标签**
#内容生产 #工作流 #效率工具 #AI 写作 #团队协作

**配图建议**
- 图 1：流水线六个步骤的示意，强调「可回退」
- 图 2：同一份需求产出多平台版本的对照

---

**交付清单**
- 正文终稿（已应用校验意见）
- 标题候选 × 3
- 话题标签 / 关键词
- 配图或配套素材建议

**待人工确认**
- 文中数字的来源
- 是否需要补充免责声明`,
}

function mockText(kind: StepKind, prompt: string): string {
  const seed =
    prompt
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('**'))
      .slice(-1)[0]
      ?.slice(0, 40) || '本次主题'
  return MOCK_BLUEPRINTS[kind](seed)
}

async function mockGenerate(args: GenerateArgs): Promise<GenerateResult> {
  const text = mockText(args.kind, args.prompt)
  const chunkSize = 14
  for (let i = 0; i < text.length; i += chunkSize) {
    if (args.signal?.aborted) throw new DOMException('已取消', 'AbortError')
    await new Promise((r) => setTimeout(r, 24))
    args.onDelta?.(text.slice(i, i + chunkSize))
  }
  return {
    text,
    tokensIn: estimateTokens(args.prompt),
    tokensOut: estimateTokens(text),
  }
}

/* ── 真实服务商 ──────────────────────────────────────────────────────────── */

async function readSSE(
  response: Response,
  onEvent: (payload: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) throw new ProviderError('响应中没有可读取的流')
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    if (signal?.aborted) {
      await reader.cancel()
      throw new DOMException('已取消', 'AbortError')
    }
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data:')) onEvent(trimmed.slice(5).trim())
    }
  }
}

async function anthropicGenerate(cfg: ModelConfig, args: GenerateArgs): Promise<GenerateResult> {
  const base = cfg.baseUrl?.replace(/\/$/, '') || 'https://api.anthropic.com'
  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    signal: args.signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey ?? '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: 4096,
      temperature: args.temperature,
      stream: true,
      system: args.system,
      messages: [{ role: 'user', content: args.prompt }],
    }),
  })
  if (!res.ok) throw new ProviderError(`Anthropic 返回 ${res.status}`, await res.text())

  let text = ''
  let tokensIn = 0
  let tokensOut = 0
  await readSSE(
    res,
    (payload) => {
      if (payload === '[DONE]') return
      try {
        const evt = JSON.parse(payload)
        if (evt.type === 'content_block_delta' && evt.delta?.text) {
          text += evt.delta.text
          args.onDelta?.(evt.delta.text)
        }
        if (evt.type === 'message_start') tokensIn = evt.message?.usage?.input_tokens ?? 0
        if (evt.type === 'message_delta') tokensOut = evt.usage?.output_tokens ?? tokensOut
      } catch {
        /* 忽略心跳与非 JSON 行 */
      }
    },
    args.signal,
  )
  return {
    text,
    tokensIn: tokensIn || estimateTokens(args.prompt),
    tokensOut: tokensOut || estimateTokens(text),
  }
}

async function openaiGenerate(cfg: ModelConfig, args: GenerateArgs): Promise<GenerateResult> {
  const base = cfg.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1'
  const messages = args.system
    ? [{ role: 'system', content: args.system }, { role: 'user', content: args.prompt }]
    : [{ role: 'user', content: args.prompt }]
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal: args.signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${cfg.apiKey ?? ''}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: args.temperature,
      stream: true,
      messages,
    }),
  })
  if (!res.ok) throw new ProviderError(`模型服务返回 ${res.status}`, await res.text())

  let text = ''
  await readSSE(
    res,
    (payload) => {
      if (payload === '[DONE]') return
      try {
        const evt = JSON.parse(payload)
        const delta: string | undefined = evt.choices?.[0]?.delta?.content
        if (delta) {
          text += delta
          args.onDelta?.(delta)
        }
      } catch {
        /* 忽略非 JSON 行 */
      }
    },
    args.signal,
  )
  return { text, tokensIn: estimateTokens(args.prompt), tokensOut: estimateTokens(text) }
}

export function generate(cfg: ModelConfig, args: GenerateArgs): Promise<GenerateResult> {
  switch (cfg.provider) {
    case 'anthropic':
      return anthropicGenerate(cfg, args)
    case 'openai':
      return openaiGenerate(cfg, args)
    default:
      return mockGenerate(args)
  }
}

export const PROVIDER_LABEL: Record<ModelConfig['provider'], string> = {
  mock: '本地模拟',
  anthropic: 'Anthropic',
  openai: 'OpenAI 兼容',
}
