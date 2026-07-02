function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inlineMd(text: string) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
}

// Converts the markdown subset our legacy notes use into HTML for Tiptap.
// Detects existing HTML by a leading block tag and passes it through untouched.
export function markdownToHtml(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^<(p|h[1-6]|ul|ol|blockquote|pre|div|hr)\b/i.test(trimmed)) return trimmed

  const lines = trimmed.split('\n')
  const out: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inCode = false
  const codeBuf: string[] = []

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.trim().startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`)
        codeBuf.length = 0
        inCode = false
      } else {
        closeList()
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeBuf.push(raw)
      continue
    }

    if (!line.trim()) {
      closeList()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      out.push(`<h${level}>${inlineMd(heading[2])}</h${level}>`)
      continue
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      closeList()
      out.push('<hr>')
      continue
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      if (listType !== 'ul') {
        closeList()
        out.push('<ul>')
        listType = 'ul'
      }
      out.push(`<li>${inlineMd(bullet[1])}</li>`)
      continue
    }

    const ordered = line.match(/^\s*\d+\.\s+(.*)$/)
    if (ordered) {
      if (listType !== 'ol') {
        closeList()
        out.push('<ol>')
        listType = 'ol'
      }
      out.push(`<li>${inlineMd(ordered[1])}</li>`)
      continue
    }

    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      closeList()
      out.push(`<blockquote><p>${inlineMd(quote[1])}</p></blockquote>`)
      continue
    }

    closeList()
    out.push(`<p>${inlineMd(line)}</p>`)
  }

  closeList()
  if (inCode && codeBuf.length) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`)
  }
  return out.join('')
}
