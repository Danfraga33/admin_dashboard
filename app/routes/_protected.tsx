import { Outlet, redirect } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireSession } from '~/lib/session.server'
import { Sidebar } from '~/components/sidebar'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireSession(request)
  return null
}

export default function ProtectedLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
