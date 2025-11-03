<template>
  <div ref="menuContainer" class="relative inline-block text-left">
    <!-- Bouton d'action (3 points verticaux) -->
    <button
      @click.stop="toggleMenu"
      class="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      aria-label="Actions du paiement"
      :aria-expanded="open"
    >
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path
          d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
        />
      </svg>
    </button>

    <!-- Menu déroulant -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
      >
        <div class="py-1">
          <!-- Modifier le paiement -->
          <button
            @click="handleEdit"
            class="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            :aria-label="`${t('payments.editPayment')} ${payment.id}`"
          >
            <svg
              class="w-5 h-5 mr-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span class="font-medium">{{ $t('payments.editPayment') }}</span>
          </button>

          <!-- Divider -->
          <div class="border-t border-gray-100 my-1"></div>

          <!-- Supprimer le paiement -->
          <button
            @click="handleDelete"
            class="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            :aria-label="`${t('payments.deletePayment')} ${payment.id}`"
          >
            <svg
              class="w-5 h-5 mr-3 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span class="font-medium">{{ $t('payments.deletePayment') }}</span>
          </button>

          <!-- Divider -->
          <div class="border-t border-gray-100 my-1"></div>

          <!-- Télécharger la facture PDF -->
          <button
            @click="generatePDF"
            class="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            :aria-label="`${t('payments.downloadInvoice')} ${payment.id}`"
          >
            <svg
              class="w-5 h-5 mr-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span class="font-medium">{{ $t('payments.downloadInvoice') }}</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Modal de confirmation de suppression -->
    <ConfirmModal
      :isOpen="showDeleteConfirm"
      title="Supprimer ce paiement ?"
      :message="deleteConfirmMessage"
      confirm-label="Supprimer"
      cancel-label="Annuler"
      variant="danger"
      :isLoading="paymentsStore.loading"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
      @update:isOpen="showDeleteConfirm = $event"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/composables/useLingui'
import { jsPDF } from 'jspdf'
import { useToastStore } from '@/stores/toastStore'
import { useAuthStore } from '@/stores/authStore'
import { usePaymentsStore } from '@/stores/paymentsStore'
import { formatCurrency, formatDate } from '@/utils/formatters'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const { t } = useI18n()

const props = defineProps({
  payment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete'])

const toast = useToastStore()
const authStore = useAuthStore()
const paymentsStore = usePaymentsStore()
const open = ref(false)
const menuContainer = ref(null)
const showDeleteConfirm = ref(false)

const toggleMenu = () => {
  open.value = !open.value
}

const closeMenu = () => {
  open.value = false
}

// Gestion du clic en dehors du menu
const handleClickOutside = event => {
  if (open.value && menuContainer.value && !menuContainer.value.contains(event.target)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Gestion du clavier (Escape pour fermer)
const handleKeydown = event => {
  if (event.key === 'Escape' && open.value) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

/**
 * Ouvre le modal d'édition
 */
const handleEdit = () => {
  open.value = false
  emit('edit', props.payment)
}

/**
 * Ouvre la modal de confirmation de suppression
 */
const handleDelete = () => {
  open.value = false
  showDeleteConfirm.value = true
}

/**
 * Confirme et supprime le paiement
 */
const confirmDelete = () => {
  showDeleteConfirm.value = false
  emit('delete', props.payment.id)
}

/**
 * Annule la suppression
 */
const cancelDelete = () => {
  showDeleteConfirm.value = false
}

/**
 * Message de confirmation avec le montant
 */
const deleteConfirmMessage = computed(() => {
  return (
    t('payments.confirmDelete', { amount: formatCurrency(props.payment.amount) }) ||
    `Êtes-vous sûr de vouloir supprimer ce paiement de ${formatCurrency(props.payment.amount)} ?`
  )
})

/**
 * Génère et télécharge la facture PDF
 */
const generatePDF = async () => {
  try {
    open.value = false

    // Récupère le profil utilisateur pour l'en-tête
    let userProfile = null
    if (authStore.profile) {
      userProfile = authStore.profile
    } else {
      try {
        userProfile = await authStore.fetchProfile()
      } catch (err) {
        console.warn('Impossible de charger le profil pour la facture:', err)
      }
    }

    // Initialise le document PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = margin

    // Couleurs
    const primaryColor = [34, 197, 94] // Vert (primary-500)
    const grayColor = [107, 114, 128] // Gray-500

    // En-tête avec fond coloré
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 40, 'F')

    // Logo/Titre
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURE', margin, 25)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Doogoo - Gestion Locative', margin, 32)

    yPosition = 50

    // Informations de l'émetteur (propriétaire)
    doc.setTextColor(...grayColor)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ÉMETTEUR', margin, yPosition)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    yPosition += 7

    if (userProfile?.full_name) {
      doc.setFontSize(10)
      doc.text(userProfile.full_name, margin, yPosition)
      yPosition += 6
    }

    if (authStore.user?.email) {
      doc.setFontSize(9)
      doc.text(authStore.user.email, margin, yPosition)
      yPosition += 6
    }

    if (userProfile?.phone) {
      doc.text(`Tél: ${userProfile.phone}`, margin, yPosition)
      yPosition += 6
    }

    yPosition += 5

    // Informations du destinataire (locataire)
    const tenantName = props.payment.tenant || 'Locataire'
    const propertyName = props.payment.property || 'Bien inconnu'

    doc.setTextColor(...grayColor)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DESTINATAIRE', pageWidth - margin - 60, 50)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    let destY = 57
    doc.setFontSize(10)
    doc.text(tenantName, pageWidth - margin - 60, destY)
    destY += 6
    doc.setFontSize(9)
    doc.text(propertyName, pageWidth - margin - 60, destY)

    yPosition = 90

    // Détails de la facture
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.5)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10

    // Date d'émission
    const today = new Date()
    const emissionDate = formatDate(today, { day: 'numeric', month: 'long', year: 'numeric' })
    doc.setFontSize(9)
    doc.setTextColor(...grayColor)
    doc.text("Date d'émission:", margin, yPosition)
    doc.setTextColor(0, 0, 0)
    doc.text(emissionDate, margin + 35, yPosition)
    yPosition += 8

    // Référence facture
    const invoiceRef = `FAC-${props.payment.id.slice(0, 8).toUpperCase()}-${today.getFullYear()}`
    doc.setTextColor(...grayColor)
    doc.text('Référence:', margin, yPosition)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.text(invoiceRef, margin + 25, yPosition)
    doc.setFont('helvetica', 'normal')
    yPosition += 10

    // Tableau des détails
    doc.setFillColor(249, 250, 251) // Gray-50
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F')

    yPosition += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Description', margin + 5, yPosition)
    doc.text('Montant', pageWidth - margin - 30, yPosition, { align: 'right' })

    yPosition += 10
    doc.setDrawColor(229, 231, 235) // Gray-200
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 8

    // Ligne de détail
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const description = `Loyer ${formatDate(props.payment.dueDate, { month: 'long', year: 'numeric' })}`
    doc.text(description, margin + 5, yPosition)

    const amount = formatCurrency(props.payment.amount)
    doc.text(amount, pageWidth - margin - 5, yPosition, { align: 'right' })

    yPosition += 15

    // Ligne de séparation
    doc.setDrawColor(229, 231, 235)
    doc.line(pageWidth - margin - 50, yPosition, pageWidth - margin, yPosition)
    yPosition += 8

    // Total
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text('Total TTC:', pageWidth - margin - 40, yPosition)
    doc.text(amount, pageWidth - margin - 5, yPosition, { align: 'right' })

    yPosition += 15

    // Statut du paiement
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)

    const statusLabels = {
      paid: 'Payé',
      pending: 'En attente',
      late: 'En retard'
    }
    const statusText = statusLabels[props.payment.status] || props.payment.status

    doc.text(`Statut: ${statusText}`, margin, yPosition)

    if (props.payment.dueDate) {
      const dueDate = formatDate(props.payment.dueDate, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      doc.text(`Date d'échéance: ${dueDate}`, margin, yPosition + 6)
    }

    yPosition += 20

    // Pied de page
    doc.setDrawColor(229, 231, 235)
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10

    doc.setFontSize(8)
    doc.setTextColor(...grayColor)
    doc.text('Merci de votre confiance.', margin, yPosition)
    yPosition += 5
    doc.text('Cette facture a été générée automatiquement par Doogoo.', margin, yPosition)

    // Génère le nom de fichier
    const sanitizeName = name => name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const tenantSanitized = sanitizeName(tenantName)
    const dateStr = today.toISOString().split('T')[0]
    const filename = `Facture-${tenantSanitized}-${dateStr}.pdf`

    // Sauvegarde le PDF
    doc.save(filename)

    toast.success(t('payments.invoiceDownloaded'))
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    toast.error(t('payments.invoiceError'))
  }
}
</script>

<style scoped>
/* Les transitions sont gérées par Vue Transition */
</style>
