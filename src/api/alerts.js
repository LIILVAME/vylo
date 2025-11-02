import { supabase } from '@/lib/supabaseClient'
import { withErrorHandling } from '@/utils/apiErrorHandler'

/**
 * API centralisée pour les alertes
 * Toutes les interactions avec les données d'alertes passent par ici
 */

/**
 * Types d'alertes
 */
export const ALERT_TYPES = {
  LATE_PAYMENT: 'late_payment',
  UPCOMING_LEASE_END: 'upcoming_lease_end',
  UNPAID_AFTER_DAYS: 'unpaid_after_days',
  LOW_OCCUPANCY: 'low_occupancy'
}

/**
 * Récupère toutes les alertes pour un utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} { success: boolean, data?: Array, error?: Error }
 */
export async function getAlerts(userId) {
  if (!userId) {
    return { success: false, message: 'User ID requis' }
  }

  return withErrorHandling(async () => {
    const allAlerts = []

    // 1️⃣ Alertes de paiements en retard
    const { data: latePayments, error: paymentsError } = await supabase
      .from('payments_view')
      .select(
        `
        *,
        properties (id, name, city),
        tenants (id, name)
      `
      )
      .eq('user_id', userId)
      .eq('status', 'late')
      .order('due_date', { ascending: true })

    if (!paymentsError && latePayments) {
      latePayments.forEach(payment => {
        const daysLate = Math.floor(
          (new Date() - new Date(payment.due_date)) / (1000 * 60 * 60 * 24)
        )
        allAlerts.push({
          id: `late-${payment.id}`,
          type: ALERT_TYPES.LATE_PAYMENT,
          severity: 'high',
          title: `Paiement en retard - ${payment.properties?.name || 'N/A'}`,
          message: `Le loyer de ${payment.amount}€ est en retard de ${daysLate} jour(s).`,
          propertyId: payment.property_id,
          paymentId: payment.id,
          date: payment.due_date,
          daysLate,
          actionUrl: '/paiements',
          amount: payment.amount
        })
      })
    }

    // 2️⃣ Alertes de paiements impayés après X jours (mais pas encore marqués "late")
    const { data: unpaidPayments, error: unpaidError } = await supabase
      .from('payments_view')
      .select(
        `
        *,
        properties (id, name, city),
        tenants (id, name)
      `
      )
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    if (!unpaidError && unpaidPayments) {
      unpaidPayments.forEach(payment => {
        const daysOverdue = Math.floor(
          (new Date() - new Date(payment.due_date)) / (1000 * 60 * 60 * 24)
        )
        if (daysOverdue >= 5) {
          allAlerts.push({
            id: `unpaid-${payment.id}`,
            type: ALERT_TYPES.UNPAID_AFTER_DAYS,
            severity: daysOverdue >= 10 ? 'high' : 'medium',
            title: `Paiement impayé - ${payment.properties?.name || 'N/A'}`,
            message: `Le paiement de ${payment.amount}€ est impayé depuis ${daysOverdue} jour(s).`,
            propertyId: payment.property_id,
            paymentId: payment.id,
            date: payment.due_date,
            daysOverdue,
            actionUrl: '/paiements',
            amount: payment.amount
          })
        }
      })
    }

    // 3️⃣ Alertes de fin de bail approchante (si exit_date est renseignée)
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(
        `
        *,
        tenants (*)
      `
      )
      .eq('user_id', userId)
      .eq('status', 'occupied')

    if (!propertiesError && properties) {
      properties.forEach(property => {
        if (property.tenants && property.tenants.length > 0) {
          const tenant = property.tenants[0]
          if (tenant.exit_date) {
            const exitDate = new Date(tenant.exit_date)
            const today = new Date()
            const daysUntilExit = Math.floor((exitDate - today) / (1000 * 60 * 60 * 24))

            if (daysUntilExit >= 0 && daysUntilExit <= 30) {
              allAlerts.push({
                id: `lease-end-${property.id}`,
                type: ALERT_TYPES.UPCOMING_LEASE_END,
                severity: daysUntilExit <= 7 ? 'high' : 'medium',
                title: `Fin de bail approchante - ${property.name}`,
                message: `Le bail de ${tenant.name} se termine dans ${daysUntilExit} jour(s).`,
                propertyId: property.id,
                tenantId: tenant.id,
                date: tenant.exit_date,
                daysUntilExit,
                actionUrl: '/locataires'
              })
            }
          }
        }
      })
    }

    // 4️⃣ Alerte de faible taux d'occupation
    const { data: allProperties, error: allPropsError } = await supabase
      .from('properties')
      .select('status')
      .eq('user_id', userId)

    if (!allPropsError && allProperties && allProperties.length > 0) {
      const occupiedCount = allProperties.filter(p => p.status === 'occupied').length
      const occupancyRate = (occupiedCount / allProperties.length) * 100

      if (occupancyRate < 50 && allProperties.length >= 3) {
        allAlerts.push({
          id: 'low-occupancy',
          type: ALERT_TYPES.LOW_OCCUPANCY,
          severity: 'low',
          title: "Taux d'occupation faible",
          message: `Votre taux d'occupation est de ${Math.round(occupancyRate)}% (${occupiedCount}/${allProperties.length} biens occupés).`,
          occupancyRate: Math.round(occupancyRate),
          actionUrl: '/biens'
        })
      }
    }

    // Trie par sévérité (high > medium > low)
    const severityOrder = { high: 3, medium: 2, low: 1 }
    const sortedAlerts = allAlerts.sort(
      (a, b) => severityOrder[b.severity] - severityOrder[a.severity]
    )

    return { data: sortedAlerts, error: null }
  }, 'getAlerts')
}

// Export de l'objet API (compatibilité avec les autres APIs)
export const alertsApi = {
  getAlerts,
  ALERT_TYPES
}
