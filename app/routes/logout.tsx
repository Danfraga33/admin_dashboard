import { redirect } from 'react-router'
import type { ActionFunctionArgs } from 'react-router'
import { createSupabaseServerClient } from '~/lib/supabase.server'

export async function action({ request }: ActionFunctionArgs) {
  const responseHeaders = new Headers()
  const supabase = createSupabaseServerClient(request, responseHeaders)
  await supabase.auth.signOut()
  throw redirect('/login', { headers: responseHeaders })
}

export async function loader() {
  throw redirect('/')
}
