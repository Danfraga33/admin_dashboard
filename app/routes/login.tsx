import { Form, redirect, useActionData, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { Loader2, Sparkles } from 'lucide-react'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) throw redirect('/', { headers: responseHeaders })
  } catch (error) {
    if (error instanceof Response) throw error
    if (!isNetworkError(error)) throw error
  }
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
    if (error) signInError = isNetworkError(error) ? NETWORK_ERROR_MESSAGE : error.message
  } catch (error) {
    signInError = isNetworkError(error) ? NETWORK_ERROR_MESSAGE : 'Sign in failed. Please try again.'
  }

  if (signInError) return { error: signInError }

  throw redirect('/', { headers: responseHeaders })
}

const NETWORK_ERROR_MESSAGE =
  'Unable to reach the authentication service. Please try again in a moment.'

function isNetworkError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const { name, status, message } = error as {
    name?: string
    status?: number
    message?: string
  }
  return (
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    /fetch failed|network|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(message ?? '')
  )
}

export const meta = () => [{ title: 'Atlas · Sign In' }]

export default function Login() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.formAction === '/login'
  const error = isSubmitting ? null : actionData?.error

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
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
            <fieldset disabled={isSubmitting} className="space-y-4 disabled:opacity-60">
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

              {error && (
                <p role="alert" className="text-destructive-foreground text-sm">{error}</p>
              )}

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </fieldset>
          </Form>
        </div>
      </div>
    </div>
  )
}
