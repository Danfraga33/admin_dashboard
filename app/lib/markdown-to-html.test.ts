import { describe, it, expect } from 'vitest'
import { markdownToHtml } from './markdown-to-html'

describe('markdownToHtml', () => {
  it('returns empty string for blank input', () => {
    expect(markdownToHtml('')).toBe('')
    expect(markdownToHtml('   \n  ')).toBe('')
  })

  it('passes existing HTML through untouched', () => {
    const html = '<p>already <strong>html</strong></p>'
    expect(markdownToHtml(html)).toBe(html)
    expect(markdownToHtml('<h2>Heading</h2><p>body</p>')).toBe('<h2>Heading</h2><p>body</p>')
  })

  it('wraps plain lines in paragraphs', () => {
    expect(markdownToHtml('hello world')).toBe('<p>hello world</p>')
  })

  it('converts headings h1-h3', () => {
    expect(markdownToHtml('# One')).toBe('<h1>One</h1>')
    expect(markdownToHtml('## Two')).toBe('<h2>Two</h2>')
    expect(markdownToHtml('### Three')).toBe('<h3>Three</h3>')
  })

  it('converts inline bold, italic, code, links', () => {
    expect(markdownToHtml('**b**')).toBe('<p><strong>b</strong></p>')
    expect(markdownToHtml('a *i* b')).toBe('<p>a <em>i</em> b</p>')
    expect(markdownToHtml('`x`')).toBe('<p><code>x</code></p>')
    expect(markdownToHtml('[t](https://e.com)')).toBe('<p><a href="https://e.com">t</a></p>')
  })

  it('converts bullet lists', () => {
    expect(markdownToHtml('- a\n- b')).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('converts ordered lists', () => {
    expect(markdownToHtml('1. a\n2. b')).toBe('<ol><li>a</li><li>b</li></ol>')
  })

  it('closes a list when followed by a paragraph', () => {
    expect(markdownToHtml('- a\n\nafter')).toBe('<ul><li>a</li></ul><p>after</p>')
  })

  it('converts blockquotes and horizontal rules', () => {
    expect(markdownToHtml('> quote')).toBe('<blockquote><p>quote</p></blockquote>')
    expect(markdownToHtml('---')).toBe('<hr>')
  })

  it('converts fenced code blocks and escapes their contents', () => {
    expect(markdownToHtml('```\nconst x = 1 < 2\n```')).toBe(
      '<pre><code>const x = 1 &lt; 2</code></pre>',
    )
  })

  it('escapes raw angle brackets in prose', () => {
    expect(markdownToHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>')
  })

  it('handles a mixed document', () => {
    const md = '# Title\n\nIntro **bold**\n\n- one\n- two\n\n> note'
    expect(markdownToHtml(md)).toBe(
      '<h1>Title</h1><p>Intro <strong>bold</strong></p><ul><li>one</li><li>two</li></ul><blockquote><p>note</p></blockquote>',
    )
  })
})
