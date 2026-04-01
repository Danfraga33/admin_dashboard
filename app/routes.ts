import { type RouteConfig, index, route, layout } from '@react-router/dev/routes'

export default [
  route('login', 'routes/login.tsx'),
  route('logout', 'routes/logout.tsx'),
  layout('routes/_protected.tsx', [
    index('routes/_protected.home.tsx'),
    route('content/planner', 'routes/_protected.content.planner.tsx'),
    route('content/metrics', 'routes/_protected.content.metrics.tsx'),
    route('content/todos', 'routes/_protected.content.todos.tsx'),
    route('business/saas', 'routes/_protected.business.saas.tsx'),
    route('deals/buy-box', 'routes/_protected.deals.buy-box.tsx'),
    route('deals/pipeline', 'routes/_protected.deals.pipeline.tsx'),
    route('finance/private-wealth', 'routes/_protected.finance.private-wealth.tsx'),
    route('finance/flowchart', 'routes/_protected.finance.flowchart.tsx'),
    route('finance/investment-flowchart', 'routes/_protected.finance.investment-flowchart.tsx'),
    route('finance/accounting', 'routes/_protected.finance.accounting.tsx'),
  ]),
] satisfies RouteConfig
