import { type RouteConfig, index, route, layout } from '@react-router/dev/routes'

export default [
  route('login', 'routes/login.tsx'),
  route('logout', 'routes/logout.tsx'),
  route('api/refresh-events', 'routes/api.refresh-events.tsx'),
  layout('routes/_protected.tsx', [
    index('routes/_protected.home.tsx'),
    route('content', 'routes/_protected.content.tsx'),
    route('content/planner', 'routes/_protected.content.planner.tsx'),
    route('content/metrics', 'routes/_protected.content.metrics.tsx'),
    route('content/todos', 'routes/_protected.content.todos.tsx'),
    route('content/ideas', 'routes/_protected.content.ideas.tsx'),
    route('content/schedule', 'routes/_protected.content.schedule.tsx'),
    route('business/saas', 'routes/_protected.business.saas.tsx'),
    route('investments', 'routes/_protected.investments.tsx'),
    route('projects', 'routes/_protected.projects.tsx'),
    route('ventures', 'routes/_protected.ventures.tsx'),
    route('finance', 'routes/_protected.finance.tsx'),
    route('finance/private-wealth', 'routes/_protected.finance.private-wealth.tsx'),
    route('finance/flowchart', 'routes/_protected.finance.flowchart.tsx'),
    route('finance/investment-flowchart', 'routes/_protected.finance.investment-flowchart.tsx'),
    route('finance/accounting', 'routes/_protected.finance.accounting.tsx'),
    route('notes', 'routes/_protected.notes.tsx'),
    route('fitness', 'routes/_protected.fitness.tsx'),
    route('events', 'routes/_protected.events.tsx'),
    route('resources/saas-events', 'routes/resources.saas-events.tsx'),
  ]),
] satisfies RouteConfig
