import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from './authStore'
import { useToastStore } from './toastStore'
import { PROPERTY_STATUS } from '@/utils/constants'
import { propertiesApi } from '@/api'
import { tenantsApi } from '@/api'

/**
 * Store Pinia pour gérer les biens immobiliers
 * Connecté à Supabase pour la persistance et synchronisation en temps réel
 */
export const usePropertiesStore = defineStore(
  'properties',
  () => {
    // State
    const properties = ref([])
    const loading = ref(false)
    const error = ref(null)
    let realtimeChannel = null
    let isRealtimeInitialized = false
    let isRealtimeActive = false // Flag pour désactiver les callbacks lors du cleanup
    let lastFetchTime = 0
    const FETCH_CACHE_MS = 5000 // Cache de 5 secondes pour éviter les requêtes multiples

    /**
     * Récupère toutes les propriétés de l'utilisateur depuis Supabase
     */
    const fetchProperties = async (force = false) => {
      // Vérifie que l'utilisateur est authentifié avant de fetcher
      const authStore = useAuthStore()
      if (!authStore.user) {
        console.warn('fetchProperties: User not authenticated, skipping fetch')
        return
      }

      // Évite les requêtes multiples si déjà en cours
      if (loading.value && !force) {
        return
      }

      // Cache de 5 secondes pour éviter les requêtes trop fréquentes
      const now = Date.now()
      if (!force && now - lastFetchTime < FETCH_CACHE_MS && properties.value.length > 0) {
        return
      }

      loading.value = true
      error.value = null

      const result = await propertiesApi.getProperties(authStore.user.id)

      if (result.success && result.data) {
        lastFetchTime = Date.now()

        // Transforme les données Supabase pour correspondre au format attendu
        properties.value = result.data.map(prop => ({
          id: prop.id,
          name: prop.name,
          address: prop.address || '',
          city: prop.city,
          status: prop.status,
          rent: Number(prop.rent),
          tenant:
            prop.tenants && prop.tenants.length > 0
              ? {
                  id: prop.tenants[0].id,
                  name: prop.tenants[0].name,
                  entryDate: prop.tenants[0].entry_date,
                  exitDate: prop.tenants[0].exit_date || null,
                  rent: Number(prop.tenants[0].rent),
                  status: prop.tenants[0].status || 'on_time'
                }
              : null,
          image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400' // Image par défaut
        }))
      } else {
        error.value = result.message || 'Erreur lors de la récupération des biens'

        // Si erreur réseau et qu'on a des données en cache, les utiliser
        const { useConnectionStore } = await import('@/stores/connectionStore')
        const { useToastStore } = await import('@/stores/toastStore')
        const connectionStore = useConnectionStore()
        const toastStore = useToastStore()

        if (!connectionStore.isOnline && properties.value.length > 0) {
          // Affiche un toast informatif mais continue avec les données du cache
          if (toastStore) {
            toastStore.info('⚠️ Données locales affichées (connexion perdue)')
          }
        }
      }

      loading.value = false
    }

    /**
     * Ajoute un nouveau bien dans Supabase
     * @param {Object} propertyData - Données du bien à ajouter
     * @returns {Object} Le bien créé avec son ID
     */
    const addProperty = async propertyData => {
      loading.value = true
      error.value = null

      try {
        const authStore = useAuthStore()
        const toastStore = useToastStore()
        if (!authStore.user) {
          throw new Error('User not authenticated')
        }

        // Optimistic UI : Ajoute temporairement le bien à la liste
        const optimisticProperty = {
          id: `temp-${Date.now()}`, // ID temporaire
          ...propertyData,
          tenant: propertyData.tenant || null,
          image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'
        }
        const oldProperties = [...properties.value]
        properties.value.unshift(optimisticProperty)

        // Crée le bien via l'API
        const result = await propertiesApi.createProperty(propertyData, authStore.user.id)

        if (!result.success) {
          // Revert l'optimistic update
          properties.value = oldProperties
          error.value = result.message
          loading.value = false
          throw new Error(result.message)
        }

        const data = result.data

        // Remplace le bien temporaire par le vrai bien retourné par l'API
        const tempIndex = properties.value.findIndex(p => p.id === optimisticProperty.id)
        if (tempIndex !== -1) {
          properties.value[tempIndex] = {
            id: data.id,
            name: data.name,
            address: data.address || '',
            city: data.city,
            status: data.status,
            rent: Number(data.rent),
            tenant:
              data.tenants && data.tenants.length > 0
                ? {
                    id: data.tenants[0].id,
                    name: data.tenants[0].name,
                    entryDate: data.tenants[0].entry_date,
                    exitDate: data.tenants[0].exit_date || null,
                    rent: Number(data.tenants[0].rent),
                    status: data.tenants[0].status || 'on_time'
                  }
                : null,
            image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'
          }
        }

        // Track property added event
        if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
          import('@/utils/analytics')
            .then(({ trackDoogooEvent, DoogooEvents }) => {
              trackDoogooEvent(DoogooEvents.PROPERTY_ADDED, {
                property_type: data.type || 'unknown',
                rent_amount: data.rent || 0
              })
            })
            .catch(() => {})
        }

        if (toastStore) {
          toastStore.success('Bien ajouté avec succès')
        }

        // Si le bien est occupé et qu'un locataire est fourni, créer le locataire
        if (propertyData.status === PROPERTY_STATUS.OCCUPIED && propertyData.tenant) {
          const tenantResult = await tenantsApi.createTenant(
            {
              propertyId: data.id,
              name: propertyData.tenant.name,
              entryDate: propertyData.tenant.entryDate,
              exitDate: propertyData.tenant.exitDate || null,
              rent: Number(propertyData.rent),
              status: propertyData.tenant.status || 'on_time'
            },
            authStore.user.id
          )

          if (tenantResult.success && tenantResult.data) {
            data.tenant = {
              id: tenantResult.data.id,
              name: tenantResult.data.name,
              entryDate: tenantResult.data.entry_date,
              exitDate: tenantResult.data.exit_date || null,
              rent: Number(tenantResult.data.rent),
              status: tenantResult.data.status
            }
          }
        }

        // Le bien a déjà été ajouté via l'optimistic update et remplacé plus haut
        loading.value = false

        return properties.value[tempIndex]
      } catch (err) {
        error.value = err.message
        loading.value = false
        throw err
      }
    }

    /**
     * Met à jour un bien existant dans Supabase
     * @param {string} id - ID UUID du bien à mettre à jour
     * @param {Object} updates - Données à mettre à jour
     */
    const updateProperty = async (id, updates) => {
      loading.value = true
      error.value = null

      try {
        const authStore = useAuthStore()
        const toastStore = useToastStore()
        if (!authStore.user) {
          throw new Error('User not authenticated')
        }

        // Optimistic UI : Sauvegarde l'ancien état et applique les modifications
        const propertyIndex = properties.value.findIndex(p => p.id === id)
        if (propertyIndex === -1) {
          throw new Error('Property not found')
        }
        const oldProperty = { ...properties.value[propertyIndex] }
        const optimisticUpdates = {
          ...oldProperty,
          ...updates,
          rent: Number(updates.rent || oldProperty.rent)
        }
        properties.value[propertyIndex] = optimisticUpdates

        // Prépare les données pour Supabase
        const supabaseUpdates = {
          name: updates.name,
          address: updates.address,
          city: updates.city,
          rent: Number(updates.rent),
          status: updates.status
        }

        // Met à jour le bien via l'API
        const result = await propertiesApi.updateProperty(id, supabaseUpdates, authStore.user.id)

        if (!result.success) {
          // Revert l'optimistic update
          properties.value[propertyIndex] = oldProperty
          error.value = result.message
          loading.value = false
          throw new Error(result.message)
        }

        if (toastStore) {
          toastStore.success('Modification appliquée')
        }

        // result.data contient les données mises à jour

        // Gère le locataire si nécessaire
        if (updates.status === PROPERTY_STATUS.OCCUPIED && updates.tenant) {
          // Récupère le bien avec ses locataires pour vérifier
          const propertyResult = await propertiesApi.getPropertyById(id, authStore.user.id)
          const existingTenant =
            propertyResult.success &&
            propertyResult.data?.tenants &&
            propertyResult.data.tenants.length > 0
              ? propertyResult.data.tenants[0]
              : null

          if (existingTenant) {
            // Met à jour le locataire existant
            await tenantsApi.updateTenant(
              existingTenant.id,
              {
                name: updates.tenant.name,
                entry_date: updates.tenant.entryDate,
                exit_date: updates.tenant.exitDate || null,
                rent: Number(updates.rent),
                status: updates.tenant.status || 'on_time'
              },
              authStore.user.id
            )
          } else {
            // Crée un nouveau locataire
            await tenantsApi.createTenant(
              {
                propertyId: id,
                name: updates.tenant.name,
                entryDate: updates.tenant.entryDate,
                exitDate: updates.tenant.exitDate || null,
                rent: Number(updates.rent),
                status: updates.tenant.status || 'on_time'
              },
              authStore.user.id
            )
          }
        } else if (updates.status === PROPERTY_STATUS.VACANT) {
          // Supprime le locataire si le bien devient libre
          const propertyResult = await propertiesApi.getPropertyById(id, authStore.user.id)
          if (
            propertyResult.success &&
            propertyResult.data?.tenants &&
            propertyResult.data.tenants.length > 0
          ) {
            for (const tenant of propertyResult.data.tenants) {
              await tenantsApi.deleteTenant(tenant.id, authStore.user.id)
            }
          }
        }

        // Recharge les propriétés pour avoir les données à jour
        await fetchProperties()

        // Track property updated event
        if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
          import('@/utils/analytics')
            .then(({ trackDoogooEvent, DoogooEvents }) => {
              trackDoogooEvent(DoogooEvents.PROPERTY_UPDATED, {
                property_id: id
              })
            })
            .catch(() => {})
        }

        const toast = useToastStore()
        toast.success(`Bien modifié avec succès`)

        loading.value = false
      } catch (err) {
        error.value = err.message
        loading.value = false
        throw err
      }
    }

    /**
     * Supprime un bien dans Supabase
     * @param {string} id - ID UUID du bien à supprimer
     */
    const removeProperty = async id => {
      loading.value = true
      error.value = null

      try {
        const authStore = useAuthStore()
        const toastStore = useToastStore()
        if (!authStore.user) {
          throw new Error('User not authenticated')
        }

        // Optimistic UI : Supprime temporairement de la liste
        const propertyIndex = properties.value.findIndex(p => p.id === id)
        if (propertyIndex === -1) {
          throw new Error('Property not found')
        }
        const oldProperties = [...properties.value]
        properties.value = properties.value.filter(p => p.id !== id)

        const result = await propertiesApi.deleteProperty(id, authStore.user.id)

        if (!result.success) {
          // Revert l'optimistic update
          properties.value = oldProperties
          error.value = result.message
          loading.value = false
          throw new Error(result.message)
        }

        // Track property deleted event
        if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
          import('@/utils/analytics')
            .then(({ trackDoogooEvent, DoogooEvents }) => {
              trackDoogooEvent(DoogooEvents.PROPERTY_DELETED, {
                property_id: id
              })
            })
            .catch(() => {})
        }

        if (toastStore) {
          toastStore.success('Bien supprimé avec succès')
        }

        loading.value = false
      } catch (err) {
        error.value = err.message
        loading.value = false
        throw err
      }
    }

    /**
     * Computed : Nombre total de biens
     */
    const totalProperties = computed(() => properties.value.length)

    /**
     * Computed : Nombre de biens occupés
     */
    const occupiedProperties = computed(
      () => properties.value.filter(p => p.status === PROPERTY_STATUS.OCCUPIED).length
    )

    /**
     * Computed : Nombre de biens libres
     */
    const vacantProperties = computed(
      () => properties.value.filter(p => p.status === PROPERTY_STATUS.VACANT).length
    )

    /**
     * Computed : Total des loyers mensuels (uniquement biens occupés)
     */
    const totalRent = computed(() =>
      properties.value
        .filter(p => p.status === PROPERTY_STATUS.OCCUPIED)
        .reduce((sum, p) => sum + (p.rent || 0), 0)
    )

    /**
     * Initialise l'abonnement temps réel pour les propriétés
     * Écoute les changements INSERT/UPDATE/DELETE sur la table properties
     */
    const initRealtime = () => {
      // Vérifie que l'utilisateur est authentifié avant d'initialiser
      const authStore = useAuthStore()
      if (!authStore.user) {
        console.warn('⚠️ Cannot init Realtime: user not authenticated')
        return
      }

      // Évite d'initialiser plusieurs fois - vérifie aussi si le channel est actif
      if (isRealtimeInitialized && realtimeChannel && isRealtimeActive) {
        // Déjà initialisé, retourne silencieusement (pas de log pour éviter le spam)
        return
      }

      // Si le channel existe mais n'est plus actif, le nettoie d'abord
      if (realtimeChannel && !isRealtimeActive) {
        try {
          supabase.removeChannel(realtimeChannel)
        } catch {
          // Ignore les erreurs de nettoyage
        }
        realtimeChannel = null
        isRealtimeInitialized = false
      }

      isRealtimeInitialized = true
      isRealtimeActive = true

      realtimeChannel = supabase
        .channel('public:properties')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'properties',
            filter: `user_id=eq.${authStore.user.id}` // Seulement les biens de l'utilisateur
          },
          async payload => {
            // Vérifie que Realtime est toujours actif et que le store est valide
            if (!isRealtimeActive || !properties.value || !properties.value) return

            const { eventType, new: rowNew, old: rowOld } = payload
            const toast = useToastStore()

            if (eventType === 'INSERT') {
              // Charge les données complètes avec le tenant si présent via l'API
              const result = await propertiesApi.getPropertyById(rowNew.id, authStore.user.id)

              if (result.success && result.data) {
                const data = result.data
                // Transforme pour le format attendu
                const newProperty = {
                  id: data.id,
                  name: data.name,
                  address: data.address || '',
                  city: data.city,
                  status: data.status,
                  rent: Number(data.rent),
                  tenant:
                    data.tenants && data.tenants.length > 0
                      ? {
                          id: data.tenants[0].id,
                          name: data.tenants[0].name,
                          entryDate: data.tenants[0].entry_date,
                          exitDate: data.tenants[0].exit_date || null,
                          rent: Number(data.tenants[0].rent),
                          status: data.tenants[0].status || 'on_time'
                        }
                      : null,
                  image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'
                }

                // Ajoute seulement s'il n'existe pas déjà
                if (properties.value && !properties.value.find(p => p.id === newProperty.id)) {
                  properties.value.unshift(newProperty)
                  if (toast) toast.info(`Nouveau bien : ${newProperty.name}`)
                }
              }
            }

            if (eventType === 'UPDATE') {
              // Vérifie que le store est encore valide
              if (!properties.value || !properties.value) return

              // Recharge la propriété avec ses relations via l'API
              const result = await propertiesApi.getPropertyById(rowNew.id, authStore.user.id)

              if (result.success && result.data) {
                const data = result.data
                const updatedProperty = {
                  id: data.id,
                  name: data.name,
                  address: data.address || '',
                  city: data.city,
                  status: data.status,
                  rent: Number(data.rent),
                  tenant:
                    data.tenants && data.tenants.length > 0
                      ? {
                          id: data.tenants[0].id,
                          name: data.tenants[0].name,
                          entryDate: data.tenants[0].entry_date,
                          exitDate: data.tenants[0].exit_date || null,
                          rent: Number(data.tenants[0].rent),
                          status: data.tenants[0].status || 'on_time'
                        }
                      : null,
                  image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'
                }

                const index = properties.value.findIndex(p => p.id === updatedProperty.id)
                if (index !== -1 && properties.value) {
                  properties.value[index] = updatedProperty
                  if (toast) toast.info(`Bien mis à jour : ${updatedProperty.name}`)
                }
              }
            }

            if (eventType === 'DELETE') {
              // Vérifie que le store est encore valide
              if (!properties.value || !properties.value) return
              properties.value = properties.value.filter(p => p.id !== rowOld.id)
              if (toast) toast.info('Bien supprimé')
            }
          }
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime subscribed to properties')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Realtime error for properties')
            isRealtimeInitialized = false // Réinitialise pour permettre une nouvelle tentative
            isRealtimeActive = false
            realtimeChannel = null
            // Ne pas afficher d'erreur toast pour éviter le spam
            // Le Realtime est optionnel, l'application fonctionne sans
          } else if (status === 'CLOSED') {
            console.log('🔌 Realtime channel closed for properties')
            isRealtimeInitialized = false
            isRealtimeActive = false
            realtimeChannel = null
          }
        })
    }

    /**
     * Arrête l'abonnement temps réel
     */
    const stopRealtime = () => {
      // Désactive les callbacks en premier pour éviter les erreurs
      isRealtimeActive = false

      if (realtimeChannel) {
        try {
          supabase.removeChannel(realtimeChannel)
        } catch (e) {
          // Ignore les erreurs lors du nettoyage
          console.warn('Error removing Realtime channel (non blocking):', e)
        }
        realtimeChannel = null
        isRealtimeInitialized = false
        console.log('🔌 Realtime unsubscribed from properties')
      }
    }

    return {
      // State
      properties,
      loading,
      error,
      // Actions
      fetchProperties,
      addProperty,
      updateProperty,
      removeProperty,
      initRealtime,
      stopRealtime,
      // Getters
      totalProperties,
      occupiedProperties,
      vacantProperties,
      totalRent
    }
  },
  {
    // Configuration de persistance avec pinia-plugin-persistedstate
    persist: {
      key: 'vylo-properties',
      paths: ['properties'], // Seulement persister les données, pas loading/error
      storage: localStorage
    }
  }
)
