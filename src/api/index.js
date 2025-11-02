/**
 * API centralisée - Point d'entrée unique pour toutes les interactions Supabase
 *
 * Utilisation dans les stores :
 * ```js
 * import { propertiesApi, paymentsApi, tenantsApi } from '@/api'
 *
 * const result = await propertiesApi.getProperties(userId)
 * if (result.success) {
 *   // Utiliser result.data
 * } else {
 *   // Gérer result.message
 * }
 * ```
 */

export * as propertiesApi from './properties'
export * as paymentsApi from './payments'
export * as tenantsApi from './tenants'
export { analyticsApi } from './analytics'
