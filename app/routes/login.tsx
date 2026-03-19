import { Form, redirect, useActionData } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
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
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-lg p-8">
          <h1 className="font-serif text-2xl text-foreground mb-2">Fraga Ventures</h1>
          <p className="text-muted-foreground text-sm mb-8">Ops Dashboard</p>

          <Form method="post" className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-foreground mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
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
