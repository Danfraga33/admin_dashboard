import { Form, redirect, useActionData } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { Sparkles } from 'lucide-react'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  const { data: { session } } = await supabase.auth.getSession()
  if (session) throw redirect('/', { headers: responseHeaders })
  return null
}

export async function action({ request }: ActionFunctionArgs) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  const formData = await request.formData()
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))

  let signInError: string | null = null
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) signInError = error.message
  } catch {
    signInError = 'Unable to reach the authentication service. Please try again.'
  }

  if (signInError) return { error: signInError }

  throw redirect('/', { headers: responseHeaders })
}

export default function Login() {
  const actionData = useActionData<typeof action>()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="leading-tight">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Daniel</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Personal OS</p>
            </div>
          </div>

          <Form method="post" className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-foreground mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm text-foreground mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {actionData?.error && (
              <p className="text-destructive-foreground text-sm">{actionData.error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Sign in
            </button>
          </Form>
        </div>
      </div>
    </div>
  )
}
