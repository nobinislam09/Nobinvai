import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, Info, Lightbulb } from 'lucide-react';
import { sanitizeUrl } from '../utils/blogHelpers';
import { ResilientImage } from './ResilientImage';

interface ArticleRendererProps {
  content: string;
  enableDropCap?: boolean;
}

type BlockNode =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'callout'; variant: 'NOTE' | 'TIP' | 'WARNING'; lines: string[] }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'image'; alt: string; url: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'hr' };

/**
 * Parses inline markdown syntax (**bold**, *italic*, `code`, [label](url)) safely into React nodes.
 */
function renderInlineText(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIdx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${tokenIdx++}`;

    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key} className="font-semibold text-neutral-900 dark:text-neutral-50">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={key}
          className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.86em] text-neutral-800 dark:border-[#242730] dark:bg-[#191C22] dark:text-neutral-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const label = linkMatch[1];
        const safeHref = sanitizeUrl(linkMatch[2], false);
        if (safeHref) {
          const isExternal = /^https?:\/\//i.test(safeHref);
          nodes.push(
            <a
              key={key}
              href={safeHref}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="font-medium text-blue-700 underline decoration-blue-700/35 underline-offset-4 transition-colors hover:decoration-blue-700 dark:text-blue-400 dark:decoration-blue-400/40 dark:hover:decoration-blue-400"
            >
              {label}
            </a>
          );
        } else {
          nodes.push(label);
        }
      } else {
        nodes.push(token);
      }
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/**
 * Parses clean long-form Markdown blocks into structured AST nodes.
 */
function parseMarkdownBlocks(markdown: string): BlockNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      blocks.push({ type: 'code', language, code: codeLines.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 3, text: trimmed.slice(4).trim() });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      const text = trimmed.startsWith('## ') ? trimmed.slice(3).trim() : trimmed.slice(2).trim();
      blocks.push({ type: 'heading', level: 2, text });
      i += 1;
      continue;
    }

    // Standalone image: ![alt](url)
    const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
    if (imageMatch) {
      blocks.push({
        type: 'image',
        alt: imageMatch[1].trim(),
        url: imageMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // Blockquote or Callout (> [!NOTE], > [!TIP], > [!WARNING])
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      const firstLine = quoteLines[0] || '';
      const calloutMatch = /^\[!(NOTE|TIP|WARNING)\]\s*(.*)$/i.exec(firstLine);
      if (calloutMatch) {
        const variant = calloutMatch[1].toUpperCase() as 'NOTE' | 'TIP' | 'WARNING';
        const rest = [calloutMatch[2], ...quoteLines.slice(1)].filter((l) => l.trim().length > 0);
        blocks.push({ type: 'callout', variant, lines: rest });
      } else {
        blocks.push({ type: 'blockquote', lines: quoteLines.filter(Boolean) });
      }
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    // Paragraph (collect consecutive non-block lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim()) &&
      !/^!\[([^\]]*)\]\(([^)]+)\)$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join(' ') });
    }
  }

  return blocks;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  };

  return (
    <div className="my-7 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100/80 dark:border-[#242730] dark:bg-[#14161B]">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 dark:border-[#242730]">
        <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[32px] items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          aria-label="Copy code block"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13.5px] leading-relaxed text-neutral-800 dark:text-neutral-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Renders long-form technical essays with comfortable measure, drop caps,
 * hairline-framed callouts, figure captions, and copyable code blocks.
 */
export function ArticleRenderer({ content, enableDropCap = false }: ArticleRendererProps) {
  const blocks = parseMarkdownBlocks(content);
  let firstParagraphSeen = false;
  let figureCount = 0;

  if (blocks.length === 0) {
    return (
      <p className="text-base italic text-neutral-500 dark:text-neutral-400">
        Start writing your article body to preview it here.
      </p>
    );
  }

  return (
    <div className="space-y-6 text-[17px] leading-[1.78] text-neutral-800 dark:text-neutral-200">
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        switch (block.type) {
          case 'heading':
            if (block.level === 2) {
              return (
                <h2
                  key={key}
                  className="pt-6 font-serif text-2xl font-semibold tracking-tight text-neutral-950 sm:text-[1.75rem] dark:text-neutral-50"
                >
                  {block.text}
                </h2>
              );
            }
            return (
              <h3
                key={key}
                className="pt-3 font-serif text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
              >
                {block.text}
              </h3>
            );

          case 'paragraph': {
            const isOpening = enableDropCap && !firstParagraphSeen;
            firstParagraphSeen = true;
            return (
              <p
                key={key}
                className={
                  isOpening
                    ? 'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-5xl first-letter:font-semibold first-letter:leading-none first-letter:text-neutral-950 dark:first-letter:text-neutral-50'
                    : undefined
                }
              >
                {renderInlineText(block.text, key)}
              </p>
            );
          }

          case 'code':
            return <CodeBlock key={key} language={block.language} code={block.code} />;

          case 'callout': {
            const meta =
              block.variant === 'WARNING'
                ? { label: 'Caution', Icon: AlertTriangle }
                : block.variant === 'TIP'
                  ? { label: 'Engineering Tip', Icon: Lightbulb }
                  : { label: 'Note', Icon: Info };

            const IconComponent = meta.Icon;

            return (
              <aside
                key={key}
                className="my-7 rounded-lg border border-neutral-200 bg-neutral-100/70 px-5 py-4 dark:border-[#242730] dark:bg-[#14161B]"
              >
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-neutral-700 dark:text-neutral-300">
                  <IconComponent className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  <span>{meta.label}</span>
                </div>
                <div className="space-y-2 text-[15.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {block.lines.map((line, lineIdx) => (
                    <p key={`${key}-c-${lineIdx}`}>{renderInlineText(line, `${key}-c-${lineIdx}`)}</p>
                  ))}
                </div>
              </aside>
            );
          }

          case 'blockquote':
            return (
              <blockquote
                key={key}
                className="my-8 border-y border-neutral-200 py-5 font-serif text-xl italic leading-relaxed text-neutral-900 sm:text-2xl dark:border-[#242730] dark:text-neutral-100"
              >
                {block.lines.map((line, lineIdx) => (
                  <p key={`${key}-q-${lineIdx}`}>{renderInlineText(line, `${key}-q-${lineIdx}`)}</p>
                ))}
              </blockquote>
            );

          case 'image': {
            figureCount += 1;
            const safeSrc = sanitizeUrl(block.url, true);
            return (
              <figure key={key} className="my-8">
                <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-[#242730] dark:bg-[#14161B]">
                  <ResilientImage
                    src={safeSrc ?? ''}
                    alt={block.alt || `Figure ${figureCount}`}
                    fallbackLabel={block.alt || `Figure ${figureCount}`}
                    className="h-auto w-full object-cover"
                    aspectClassName="aspect-[4/3]"
                  />
                </div>
                {block.alt && (
                  <figcaption className="mt-2.5 text-xs italic text-neutral-500 dark:text-neutral-400">
                    Fig. {figureCount} — {block.alt}
                  </figcaption>
                )}
              </figure>
            );
          }

          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
              <ListTag
                key={key}
                className={`space-y-2.5 pl-6 ${
                  block.ordered ? 'list-decimal' : 'list-disc'
                } marker:text-neutral-400 dark:marker:text-neutral-500`}
              >
                {block.items.map((item, itemIdx) => (
                  <li key={`${key}-li-${itemIdx}`} className="pl-1">
                    {renderInlineText(item, `${key}-li-${itemIdx}`)}
                  </li>
                ))}
              </ListTag>
            );
          }

          case 'hr':
            return (
              <hr
                key={key}
                className="my-8 border-0 border-t border-neutral-200 dark:border-[#242730]"
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
