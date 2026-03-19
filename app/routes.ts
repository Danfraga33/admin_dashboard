import { type RouteConfig, index, route, layout } from '@react-router/dev/routes'

export default [
  route('login', 'routes/login.tsx'),
  route('logout', 'routes/logout.tsx'),
  layout('routes/_protected.tsx', [
    index('routes/_protected.home.tsx'),
    route('content/planner', 'routes/_protected.content.planner.tsx'),
    route('content/metrics', 'routes/_protected.content.metrics.tsx'),
    route('content/todos', 'routes/_protected.content.todos.tsx'),
    route('business/pipeline', 'routes/_protected.business.pipeline.tsx'),
    route('business/entities', 'routes/_protected.business.entities.tsx'),
    route('business/cash', 'routes/_protected.business.cash.tsx'),
    route('business/saas', 'routes/_protected.business.saas.tsx'),
  ]),
] satisfies RouteConfig
