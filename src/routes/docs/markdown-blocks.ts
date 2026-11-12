export type InlineMarkdownToken =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'code'; readonly value: string }
  | { readonly kind: 'strong'; readonly value: string }

export type MarkdownBlock =
  | {
      readonly kind: 'heading'
      readonly level: 1 | 2 | 3
      readonly id: string
      readonly text: string
    }
  | {
      readonly kind: 'paragraph'
      readonly tokens: readonly InlineMarkdownToken[]
    }
  | {
      readonly kind: 'code'
      readonly language: string
      readonly code: string
    }
  | {
      readonly kind: 'list'
      readonly ordered: boolean
      readonly items: readonly MarkdownListItem[]
    }
  | {
      readonly kind: 'table'
      readonly headers: readonly (readonly InlineMarkdownToken[])[]
      readonly rows: readonly (readonly (readonly InlineMarkdownToken[])[])[]
    }

export interface MarkdownListItem {
  readonly tokens: readonly InlineMarkdownToken[]
  readonly children: readonly { readonly ordered: boolean; readonly items: readonly MarkdownListItem[] }[]
}

export interface MarkdownSectionHeading {
  readonly id: string
  readonly heading: string
  readonly level: 2 | 3
}

/** Converts a Markdown heading string into a URL-safe section slug. */
export function slugifyHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Parses inline `code` and **bold** spans without raw HTML injection. */
export function tokenizeInlineMarkdown(text: string): InlineMarkdownToken[] {
  const tokens: InlineMarkdownToken[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null = pattern.exec(text)

  while (match !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: 'text', value: text.slice(lastIndex, match.index) })
    }
    const tokenText = match[0]
    if (tokenText.startsWith('`') && tokenText.endsWith('`')) {
      tokens.push({ kind: 'code', value: tokenText.slice(1, -1) })
    } else if (tokenText.startsWith('**') && tokenText.endsWith('**')) {
      tokens.push({ kind: 'strong', value: tokenText.slice(2, -2) })
    }
    lastIndex = match.index + tokenText.length
    match = pattern.exec(text)
  }

  if (lastIndex < text.length) {
    tokens.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return tokens
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableDividerLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return false
  const cells = splitTableRow(trimmed)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

/** Parses curated allowlisted Markdown into safe semantic AST blocks. */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0

  while (index < lines.length) {
    const rawLine = lines[index] ?? ''
    const trimmed = rawLine.trim()

    if (trimmed.length === 0) {
      index += 1
      continue
    }

    // Fenced code blocks close only with a matching or longer bare fence.
    const openingFence = /^(`{3,})([^`]*)$/.exec(trimmed)
    if (openingFence) {
      const language = openingFence[2].trim() || 'text'
      const fenceLength = openingFence[1].length
      const codeLines: string[] = []
      index += 1
      while (index < lines.length) {
        const close = /^(`{3,})\s*$/.exec((lines[index] ?? '').trim())
        if (close && close[1].length >= fenceLength) break
        codeLines.push(lines[index] ?? '')
        index += 1
      }
      if (index < lines.length) index += 1
      blocks.push({ kind: 'code', language, code: codeLines.join('\n') })
      continue
    }

    // Headings (#, ##, ###)
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3
      const text = headingMatch[2].trim()
      blocks.push({
        kind: 'heading',
        level,
        id: slugifyHeading(text),
        text,
      })
      index += 1
      continue
    }

    // GFM tables
    if (
      trimmed.startsWith('|') &&
      index + 1 < lines.length &&
      isTableDividerLine(lines[index + 1] ?? '')
    ) {
      const headers = splitTableRow(trimmed).map(tokenizeInlineMarkdown)
      const rows: InlineMarkdownToken[][][] = []
      index += 2
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('|')) {
        rows.push(splitTableRow(lines[index] ?? '').map(tokenizeInlineMarkdown))
        index += 1
      }
      blocks.push({ kind: 'table', headers, rows })
      continue
    }

    // Preserve indentation and list type for nested items.
    const listLine = (line: string) => /^( *)([-*]|\d+\.)\s+(.+)$/.exec(line)
    const initialItem = listLine(rawLine)
    if (initialItem) {
      const parseList = (indent: number, ordered: boolean): MarkdownListItem[] => {
        const items: { tokens: InlineMarkdownToken[]; children: { ordered: boolean; items: MarkdownListItem[] }[] }[] = []
        while (index < lines.length) {
          const candidate = lines[index] ?? ''
          const match = listLine(candidate)
          if (!match || match[1].length < indent) break
          const currentIndent = match[1].length
          const currentOrdered = /^\d/.test(match[2])
          if (currentIndent > indent) {
            const parent = items[items.length - 1]
            if (!parent) break
            parent.children.push({ ordered: currentOrdered, items: parseList(currentIndent, currentOrdered) })
            continue
          }
          if (currentOrdered !== ordered) break
          items.push({ tokens: tokenizeInlineMarkdown(match[3].trim()), children: [] })
          index += 1
        }
        return items
      }
      const ordered = /^\d/.test(initialItem[2])
      blocks.push({ kind: 'list', ordered, items: parseList(initialItem[1].length, ordered) })
      continue
    }

    // Paragraphs
    const paragraphLines: string[] = []
    while (index < lines.length) {
      const candidate = (lines[index] ?? '').trim()
      if (
        candidate.length === 0 ||
        /^(`{3,})([^`]*)$/.test(candidate) ||
        /^(#{1,3})\s+/.test(candidate) ||
        (candidate.startsWith('|') && index + 1 < lines.length && isTableDividerLine(lines[index + 1] ?? '')) ||
        /^([-*]|\d+\.)\s+/.test(candidate)
      ) {
        break
      }
      paragraphLines.push(candidate)
      index += 1
    }
    if (paragraphLines.length === 0) {
      paragraphLines.push(trimmed)
      index += 1
    }
    if (paragraphLines.length > 0) {
      blocks.push({
        kind: 'paragraph',
        tokens: tokenizeInlineMarkdown(paragraphLines.join(' ')),
      })
    }
  }

  return blocks
}

/** Extracts h2/h3 headings from parsed blocks for sidebar navigation. */
export function extractMarkdownSections(
  blocks: readonly MarkdownBlock[],
): MarkdownSectionHeading[] {
  const sections: MarkdownSectionHeading[] = []
  for (const block of blocks) {
    if (block.kind === 'heading' && (block.level === 2 || block.level === 3)) {
      sections.push({
        id: block.id,
        heading: block.text,
        level: block.level,
      })
    }
  }
  return sections
}
