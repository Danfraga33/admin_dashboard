import { useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Undo2,
  Redo2,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { markdownToHtml } from '~/lib/markdown-to-html'

const proseClasses =
  'max-w-none focus:outline-none ' +
  '[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-wide [&_h1]:mt-6 [&_h1]:mb-2 ' +
  '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-wide [&_h2]:mt-6 [&_h2]:mb-2 ' +
  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 ' +
  '[&_p]:leading-loose [&_p]:my-3 ' +
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 ' +
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground ' +
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 ' +
  '[&_code]:bg-muted/40 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] ' +
  '[&_pre]:bg-muted/40 [&_pre]:rounded-md [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-sm ' +
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 ' +
  '[&_hr]:border-border [&_hr]:my-4 [&_strong]:font-semibold [&_em]:italic'

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer',
        'text-muted-foreground hover:text-foreground hover:bg-muted/40',
        active && 'bg-muted/60 text-foreground',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent',
      )}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
      <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
    </div>
  )
}

export function RichEditor({
  name,
  defaultValue = '',
  placeholder,
  className,
  minHeight = 'min-h-[40vh]',
}: {
  name: string
  defaultValue?: string
  placeholder?: string
  className?: string
  minHeight?: string
}) {
  const initialHtml = markdownToHtml(defaultValue)
  const [html, setHtml] = useState(initialHtml)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, HTMLAttributes: { rel: 'noreferrer', target: '_blank' } },
      }),
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? '' : editor.getHTML()),
    editorProps: {
      attributes: {
        class: cn(proseClasses, minHeight, 'px-4 py-3'),
      },
    },
  })

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-md border border-border bg-input', className)}>
      {editor && <Toolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} data-placeholder={placeholder} />
      </div>
      <input type="hidden" name={name} value={html} />
    </div>
  )
}

// Read-only render of stored note HTML (or legacy markdown) for the view modal.
export function RichContent({ content }: { content: string }) {
  const html = markdownToHtml(content)
  return (
    <div
      className={cn(proseClasses, 'text-lg text-foreground')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
