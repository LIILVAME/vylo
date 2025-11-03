import { supabase } from '@/lib/supabaseClient'
import { withErrorHandling } from '@/utils/apiErrorHandler'

/**
 * API centralisée pour les propriétés
 * Toutes les interactions avec la table properties passent par ici
 */

/**
 * Récupère toutes les propriétés d'un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} { success: boolean, data?: Array, error?: Error }
 */
export async function getProperties(userId) {
  if (!userId) {
    return { success: false, message: 'User ID requis' }
  }

  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        *,
        tenants (*)
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    return { data, error }
  }, 'getProperties')
}

/**
 * Récupère une propriété par son ID
 * @param {string} propertyId - ID de la propriété
 * @param {string} userId - ID de l'utilisateur (pour la sécurité)
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: Error }
 */
export async function getPropertyById(propertyId, userId) {
  if (!propertyId || !userId) {
    return { success: false, message: 'Property ID et User ID requis' }
  }

  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('properties')
      .select(
        `
        *,
        tenants (*)
      `
      )
      .eq('id', propertyId)
      .eq('user_id', userId)
      .single()

    return { data, error }
  }, 'getPropertyById')
}

/**
 * Crée une nouvelle propriété
 * @param {Object} propertyData - Données de la propriété
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: Error }
 */
export async function createProperty(propertyData, userId) {
  if (!userId) {
    return { success: false, message: 'User ID requis' }
  }

  // Validation du format UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    return {
      success: false,
      message: 'ID utilisateur invalide. Veuillez vous reconnecter.',
      error: new Error('Invalid user ID format')
    }
  }

  // Timeout augmenté à 12s pour les créations (peuvent être plus lentes)
  // Si un tenant doit être créé après, le timeout total peut être jusqu'à ~20s
  const timeout = 12000

  return withErrorHandling(
    async () => {
      const { data, error } = await supabase
        .from('properties')
        .insert([
          {
            name: propertyData.name,
            address: propertyData.address || '',
            city: propertyData.city,
            rent: Number(propertyData.rent),
            status: propertyData.status || 'vacant',
            user_id: userId
          }
        ])
        .select()
        .single()

      return { data, error }
    },
    'createProperty',
    { timeout }
  )
}

/**
 * Met à jour une propriété existante
 * @param {string} propertyId - ID de la propriété
 * @param {Object} updates - Données à mettre à jour
 * @param {string} userId - ID de l'utilisateur (pour la sécurité)
 * @returns {Promise<Object>} { success: boolean, data?: Object, error?: Error }
 */
export async function updateProperty(propertyId, updates, userId) {
  if (!propertyId || !userId) {
    return { success: false, message: 'Property ID et User ID requis' }
  }

  return withErrorHandling(async () => {
    // Prépare les données de mise à jour
    const updateData = {
      ...updates
    }

    // Convertit le loyer en nombre si présent
    if (updateData.rent !== undefined) {
      updateData.rent = Number(updateData.rent)
    }

    // Supprime les champs non autorisés
    delete updateData.id
    delete updateData.user_id
    delete updateData.created_at

    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId)
      .eq('user_id', userId)
      .select()
      .single()

    return { data, error }
  }, 'updateProperty')
}

/**
 * Supprime une propriété
 * @param {string} propertyId - ID de la propriété
 * @param {string} userId - ID de l'utilisateur (pour la sécurité)
 * @returns {Promise<Object>} { success: boolean, error?: Error }
 */
export async function deleteProperty(propertyId, userId) {
  if (!propertyId || !userId) {
    return { success: false, message: 'Property ID et User ID requis' }
  }

  return withErrorHandling(async () => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId)
      .eq('user_id', userId)

    return { data: null, error }
  }, 'deleteProperty')
}
