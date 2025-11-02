import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePropertiesStore } from './propertiesStore'
import { useToastStore } from './toastStore'
import { PROPERTY_STATUS, PAYMENT_STATUS } from '@/utils/constants'

/**
 * Store Pinia pour gérer les locataires
 * Synchronisé avec propertiesStore pour maintenir la cohérence
 */
export const useTenantsStore = defineStore('tenants', () => {
  const propertiesStore = usePropertiesStore()

  /**
   * Computed : Liste des locataires extraits des propriétés
   * Chaque locataire inclut les informations du bien associé
   */
  const tenants = computed(() => {
    try {
      const filtered = propertiesStore.properties.filter(
        p =>
          p && p.tenant !== null && p.tenant !== undefined && p.status === PROPERTY_STATUS.OCCUPIED
      )

      const mapped = filtered
        .map(property => {
          // Vérifie que property.tenant existe avant d'accéder à ses propriétés
          if (!property.tenant) {
            console.warn('⚠️ Property has tenant null but passed filter:', property)
            return null
          }

          return {
            id: property.tenant.id || property.id, // Utilise l'ID du locataire (UUID) si disponible, sinon l'ID du bien
            propertyId: property.id,
            name: property.tenant.name,
            property: property.name,
            propertyCity: property.city,
            entryDate: property.tenant.entryDate,
            exitDate: property.tenant.exitDate || null,
            rent: property.rent,
            status: property.tenant.status || PAYMENT_STATUS.ON_TIME
          }
        })
        .filter(t => t !== null) // Supprime les valeurs null

      // Debug en développement
      if (import.meta.env.DEV && mapped.length === 0 && propertiesStore.properties.length > 0) {
        console.warn('⚠️ Aucun locataire trouvé dans les propriétés:', {
          totalProperties: propertiesStore.properties.length,
          propertiesWithTenants: propertiesStore.properties.filter(p => p.tenant !== null).length,
          occupiedProperties: propertiesStore.properties.filter(
            p => p.status === PROPERTY_STATUS.OCCUPIED
          ).length,
          properties: propertiesStore.properties.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            hasTenant: p.tenant !== null && p.tenant !== undefined
          }))
        })
      }

      return mapped
    } catch (error) {
      console.error('❌ Erreur dans computed tenants:', error)
      return []
    }
  })

  /**
   * Ajoute un nouveau locataire à un bien existant
   * @param {Object} tenantData - Données du locataire à ajouter
   * @returns {Promise<Object>} Le bien mis à jour
   */
  const addTenant = async tenantData => {
    const toast = useToastStore()

    try {
      // Trouve le bien correspondant par son ID (UUID maintenant)
      let property = null

      if (tenantData.propertyId) {
        property = propertiesStore.properties.find(p => p.id === tenantData.propertyId)
      } else if (tenantData.property) {
        property = propertiesStore.properties.find(p => p.name === tenantData.property)
      }

      if (property) {
        // Met à jour le bien avec le nouveau locataire via Supabase
        await propertiesStore.updateProperty(property.id, {
          status: PROPERTY_STATUS.OCCUPIED,
          tenant: {
            name: tenantData.name,
            entryDate: tenantData.entryDate,
            exitDate: tenantData.exitDate || null,
            rent: Number(tenantData.rent),
            status: tenantData.status || PAYMENT_STATUS.ON_TIME
          }
        })

        toast.success(`Locataire "${tenantData.name}" ajouté avec succès`)
        return property
      } else {
        const errorMsg = 'Bien non trouvé pour le locataire'
        console.warn(errorMsg, tenantData.property)
        toast.error(errorMsg)
        return null
      }
    } catch (error) {
      toast.error(`Erreur lors de l'ajout du locataire : ${error.message}`)
      throw error
    }
  }

  /**
   * Met à jour un locataire existant
   * @param {string} tenantId - ID UUID du locataire (tenant.id)
   * @param {Object} updates - Données à mettre à jour
   */
  const updateTenant = async (tenantId, updates) => {
    const toast = useToastStore()

    try {
      // Trouve le locataire dans la liste
      const tenant = tenants.value.find(t => t.id === tenantId)

      if (tenant && tenant.propertyId) {
        const property = propertiesStore.properties.find(p => p.id === tenant.propertyId)

        if (property && property.tenant) {
          await propertiesStore.updateProperty(property.id, {
            tenant: {
              ...property.tenant,
              ...updates
            }
          })

          toast.success('Locataire mis à jour avec succès')
        }
      }
    } catch (error) {
      toast.error(`Erreur lors de la mise à jour : ${error.message}`)
      throw error
    }
  }

  /**
   * Supprime un locataire (libère le bien)
   * @param {string} tenantId - ID UUID du locataire (tenant.id)
   */
  const removeTenant = async tenantId => {
    const toast = useToastStore()

    try {
      // Trouve le locataire dans la liste
      const tenant = tenants.value.find(t => t.id === tenantId)

      if (tenant && tenant.propertyId) {
        await propertiesStore.updateProperty(tenant.propertyId, {
          status: PROPERTY_STATUS.VACANT,
          tenant: null
        })

        toast.success('Locataire supprimé avec succès')
      }
    } catch (error) {
      toast.error(`Erreur lors de la suppression : ${error.message}`)
      throw error
    }
  }

  /**
   * Computed : Locataires à jour
   */
  const onTimeTenants = computed(() =>
    tenants.value.filter(t => t.status === PAYMENT_STATUS.ON_TIME)
  )

  /**
   * Computed : Locataires en retard
   */
  const lateTenants = computed(() => tenants.value.filter(t => t.status === PAYMENT_STATUS.LATE))

  /**
   * Computed : Total des loyers des locataires
   */
  const totalTenantsRent = computed(() => tenants.value.reduce((sum, t) => sum + (t.rent || 0), 0))

  return {
    // State (computed)
    tenants,
    // Actions
    addTenant,
    updateTenant,
    removeTenant,
    // Getters
    onTimeTenants,
    lateTenants,
    totalTenantsRent
  }
})
