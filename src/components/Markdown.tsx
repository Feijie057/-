import { Fragment, type ReactNode } from 'react'

/**
 * 轻量 Markdown 渲染：覆盖模型产出常用的标题、列表、表格、引用、分隔线与行内强调。
 * 只渲染文本节点，不执行任何 HTML，避免把模型输出当成标记注入页面。
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let cursor = 0
  let match: RegExpExecArray | null
  let index = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    const token = match[0]
    const key = `${keyPrefix}-i${index++}`
    if (token.startsWith('**')) {
      nodes.push(<strong key={key} className="font-semibold text-ink">{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="rounded px-1 py-0.5 text-[0.85em]" style={{ background: 'var(--plane)' }}>
          {token.slice(1, -1)}
        </code>,
      )
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    cursor = match.index + token.length
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

const splitRow = (line: string) =>
  line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())

export function Markdown({ content }: { content: string }) {
  const lines = content.split('\n')
  const blocks: ReactNode[] = []
  let listBuffer: string[] = []
  let ordered = false

  const flushList = (key: string) => {
    if (!listBuffer.length) return
    const items = listBuffer
    listBuffer = []
    const Tag = ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag key={key} className={ordered ? 'my-2 list-decimal space-y-1 pl-5' : 'my-2 list-disc space-y-1 pl-5'}>
        {items.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed text-ink-2">{inline(item, `${key}-${i}`)}</li>
        ))}
      </Tag>,
    )
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const key = `b${i}`

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      const nextOrdered = Boolean(numbered)
      if (listBuffer.length && nextOrdered !== ordered) flushList(`${key}-flush`)
      ordered = nextOrdered
      listBuffer.push((bullet ?? numbered)![1])
      continue
    }
    flushList(`${key}-flush`)

    // 表格：表头行 + 分隔行 + 数据行
    if (line.includes('|') && /^\s*\|?[\s|:-]+\|[\s|:-]*$/.test(lines[i + 1] ?? '')) {
      const header = splitRow(line)
      const rows: string[][] = []
      let cursor = i + 2
      while (cursor < lines.length && lines[cursor].includes('|')) {
        rows.push(splitRow(lines[cursor]))
        cursor++
      }
      blocks.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border hairline">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: 'var(--plane)' }}>
                {header.map((cell, c) => (
                  <th key={c} className="border-b px-3 py-2 text-left text-xs font-semibold text-ink-2 hairline">
                    {inline(cell, `${key}-h${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b px-3 py-2 align-top text-ink-2 hairline">
                      {inline(cell, `${key}-r${r}c${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      i = cursor - 1
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const sizes = ['text-lg', 'text-base', 'text-sm', 'text-sm']
      blocks.push(
        <p key={key} className={`mb-1.5 mt-4 font-semibold text-ink ${sizes[level - 1]}`}>
          {inline(heading[2], key)}
        </p>,
      )
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      blocks.push(
        <blockquote key={key} className="my-2 border-l-2 pl-3 text-sm text-ink-2" style={{ borderColor: 'var(--baseline)' }}>
          {inline(line.replace(/^\s*>\s?/, ''), key)}
        </blockquote>,
      )
      continue
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={key} className="my-4 border-t hairline" />)
      continue
    }

    if (!line.trim()) {
      blocks.push(<div key={key} className="h-2" />)
      continue
    }

    blocks.push(
      <p key={key} className="my-1.5 text-sm leading-relaxed text-ink-2">
        {inline(line, key)}
      </p>,
    )
  }
  flushList('tail')

  return <div className="markdown">{blocks.map((block, i) => <Fragment key={i}>{block}</Fragment>)}</div>
}
