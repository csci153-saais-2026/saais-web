import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  InlineMarkdownToken,
  MarkdownBlock,
} from '@/routes/docs/markdown-blocks'

function plainTextFromTokens(tokens: readonly InlineMarkdownToken[]): string {
  return tokens.map((token) => token.value).join('')
}

function InlineTokens({
  tokens,
}: {
  readonly tokens: readonly InlineMarkdownToken[]
}) {
  return (
    <>
      {tokens.map((token, idx) => {
        if (token.kind === 'code') {
          return (
            <code
              key={idx}
              className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-code text-foreground"
            >
              {token.value}
            </code>
          )
        }
        if (token.kind === 'strong') {
          return (
            <strong key={idx} className="font-semibold text-foreground">
              {token.value}
            </strong>
          )
        }
        return <React.Fragment key={idx}>{token.value}</React.Fragment>
      })}
    </>
  )
}

/**
 * Safe semantic renderer for allowlisted Markdown AST blocks using SAAIS typography,
 * forest code specimens, and responsive stack-tables (zero raw HTML injection).
 */
function NestedList({ list }: { list: { readonly ordered: boolean; readonly items: readonly import('./markdown-blocks').MarkdownListItem[] } }) {
  const Tag = list.ordered ? 'ol' : 'ul'
  return <Tag className={list.ordered ? 'list-decimal pl-6' : 'list-disc pl-6'}>{list.items.map((item, i) => <li key={i}><InlineTokens tokens={item.tokens} />{item.children.map((child, j) => <NestedList key={j} list={child} />)}</li>)}</Tag>
}

export function MarkdownDocumentView({
  blocks,
}: {
  readonly blocks: readonly MarkdownBlock[]
}) {
  return (
    <div className="grid gap-4">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <h2
                  key={index}
                  id={block.id}
                  className="font-heading text-display-m font-bold text-foreground"
                >
                  {block.text}
                </h2>
              )
            }
            if (block.level === 2) {
              return (
                <h2
                  key={index}
                  id={block.id}
                  className="mt-6 scroll-mt-6 border-b border-border pb-2.5 font-heading text-[22px] leading-tight font-bold tracking-tight text-foreground"
                >
                  {block.text}
                </h2>
              )
            }
            return (
              <h3
                key={index}
                id={block.id}
                className="mt-4 scroll-mt-6 text-heading font-semibold text-foreground"
              >
                {block.text}
              </h3>
            )
          }

          case 'paragraph':
            return (
              <p key={index} className="max-w-[70ch] text-body text-muted-foreground">
                <InlineTokens tokens={block.tokens} />
              </p>
            )

          case 'code':
            return (
              <pre
                key={index}
                className="overflow-x-auto rounded-md bg-forest-deep px-4 py-3.5 font-mono text-code leading-relaxed whitespace-pre text-accent"
              >
                <code data-language={block.language}>{block.code}</code>
              </pre>
            )

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul'
            return (
              <ListTag
                key={index}
                className={
                  block.ordered
                    ? 'max-w-[70ch] list-decimal space-y-2 pl-6 text-body text-muted-foreground'
                    : 'max-w-[70ch] list-disc space-y-2 pl-6 text-body text-muted-foreground'
                }
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <InlineTokens tokens={item.tokens} />
                    {item.children.map((child, childIndex) => (
                      <NestedList key={childIndex} list={child} />
                    ))}
                  </li>
                ))}
              </ListTag>
            )
          }

          case 'table': {
            const headerLabels = block.headers.map(plainTextFromTokens)
            return (
              <div
                key={index}
                className="overflow-hidden rounded-md border border-border bg-card"
              >
                <Table responsive>
                  <TableHeader className="bg-secondary">
                    <TableRow>
                      {block.headers.map((headerTokens, colIndex) => (
                        <TableHead
                          key={colIndex}
                          className="px-4 text-kicker text-muted-2 uppercase"
                        >
                          <InlineTokens tokens={headerTokens} />
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {block.rows.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cellTokens, cellIndex) => (
                          <TableCell
                            key={cellIndex}
                            label={headerLabels[cellIndex]}
                            className="px-4 py-row align-top text-cell whitespace-normal"
                          >
                            <InlineTokens tokens={cellTokens} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          }
        }
      })}
    </div>
  )
}
