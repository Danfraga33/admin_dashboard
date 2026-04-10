import { redirect } from 'react-router'

export function loader() {
  return redirect('/content/planner')
}

export default function Home() {
  return null
}
