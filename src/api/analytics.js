import { supabase } from '@/lib/supabaseClient'
import { withErrorHandling } from '@/utils/apiErrorHandler'

/**
 * API centralisée pour les analytics
 * Toutes les interactions avec les données analytiques passent par ici
 */

/**
 * Récupère toutes les données analytiques d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {Object} options - Options de période { currentStart, currentEnd, previousStart, previousEnd }
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: Error }
 */
export async function getAnalytics(userId, options = {}) {
  if (!userId) {
    return { success: false, message: 'User ID requis' }
  }

  return withErrorHandling(async () => {
    // 1️⃣ Récupère les paiements de l'utilisateur (via la vue pour avoir due_date)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments_view')
      .select('amount, due_date, status, properties(id, name)')
      .eq('user_id', userId)
      .order('due_date', { ascending: false })

    if (paymentsError) {
      return { data: null, error: paymentsError }
    }

    // 2️⃣ Récupère les propriétés de l'utilisateur
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name, status, rent')
      .eq('user_id', userId)

    if (propertiesError) {
      return { data: null, error: propertiesError }
    }

    // Retourne les données brutes pour que le store calcule les métriques
    // (le store a la logique de calcul des métriques)
    return {
      data: {
        payments: payments || [],
        properties: properties || [],
        options
      },
      error: null
    }
  }, 'getAnalytics')
}

// Export de l'objet API (compatibilité avec les autres APIs)
export const analyticsApi = {
  getAnalytics
}
