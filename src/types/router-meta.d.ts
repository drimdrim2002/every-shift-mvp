import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    accessStateView?: 'pending' | 'rejected'
    requiresAuth?: boolean
    requiresOrgContext?: boolean
    requiredOrgRole?: 'admin'
  }
}

export {}
