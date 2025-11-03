<template>
  <!-- Overlay -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto" @click.self="handleClose">
        <!-- Overlay backdrop -->
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

        <!-- Modal -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            class="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-xl transition-all"
            @click.stop
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 class="text-xl font-semibold text-gray-900">
                {{ $t('properties.editProperty') }}
              </h2>
              <button
                @click="handleClose"
                class="text-gray-400 hover:text-gray-600 transition-colors"
                :aria-label="$t('common.close')"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <!-- Form -->
            <form @submit.prevent="handleSubmit" class="px-6 py-4">
              <div class="space-y-4">
                <!-- Nom du bien -->
                <div>
                  <label
                    for="edit-property-name"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {{ $t('properties.name') }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-property-name"
                    v-model="form.name"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    :placeholder="$t('properties.placeholders.name')"
                  />
                </div>

                <!-- Adresse -->
                <div>
                  <label
                    for="edit-property-address"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {{ $t('properties.address') }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-property-address"
                    v-model="form.address"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    :placeholder="$t('properties.placeholders.address')"
                  />
                </div>

                <!-- Ville -->
                <div>
                  <label
                    for="edit-property-city"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {{ $t('properties.city') }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-property-city"
                    v-model="form.city"
                    type="text"
                    required
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    :placeholder="$t('properties.placeholders.city')"
                  />
                </div>

                <!-- Loyer -->
                <div>
                  <label
                    for="edit-property-rent"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {{ $t('properties.monthlyRent') }} <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-property-rent"
                    v-model.number="form.rent"
                    type="number"
                    required
                    min="0"
                    step="10"
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    :placeholder="$t('payments.placeholders.amount')"
                  />
                </div>

                <!-- Statut -->
                <div>
                  <label
                    for="edit-property-status"
                    class="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {{ $t('properties.status') }} <span class="text-red-500">*</span>
                  </label>
                  <select
                    id="edit-property-status"
                    v-model="form.status"
                    required
                    class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  >
                    <option value="">{{ $t('properties.selectStatus') }}</option>
                    <option value="vacant">{{ $t('properties.free') }}</option>
                    <option value="occupied">{{ $t('properties.occupied') }}</option>
                  </select>
                </div>

                <!-- Informations du locataire (affiché uniquement si bien occupé) -->
                <div
                  v-if="form.status === PROPERTY_STATUS.OCCUPIED"
                  class="border-t border-gray-200 pt-4 mt-4"
                >
                  <h3 class="text-sm font-semibold mb-3 text-gray-700">
                    {{ $t('properties.tenantInfo') }}
                  </h3>

                  <div class="space-y-3">
                    <!-- Nom du locataire -->
                    <div>
                      <label
                        for="edit-tenant-name"
                        class="block text-sm font-medium text-gray-700 mb-2"
                      >
                        {{ $t('properties.tenantName') }} <span class="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-tenant-name"
                        v-model="form.tenant.name"
                        type="text"
                        required
                        class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                        :placeholder="$t('payments.placeholders.tenant')"
                      />
                    </div>

                    <!-- Date d'entrée -->
                    <div>
                      <label
                        for="edit-tenant-entry-date"
                        class="block text-sm font-medium text-gray-700 mb-2"
                      >
                        {{ $t('tenants.entryDate') }} <span class="text-red-500">*</span>
                      </label>
                      <input
                        id="edit-tenant-entry-date"
                        v-model="form.tenant.entryDate"
                        type="date"
                        required
                        class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                      />
                    </div>

                    <!-- Statut de paiement -->
                    <div>
                      <label
                        for="edit-tenant-status"
                        class="block text-sm font-medium text-gray-700 mb-2"
                      >
                        {{ $t('tenants.paymentStatus') }} <span class="text-red-500">*</span>
                      </label>
                      <select
                        id="edit-tenant-status"
                        v-model="form.tenant.status"
                        required
                        class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                      >
                        <option value="on_time">{{ $t('status.onTime') }}</option>
                        <option value="late">{{ $t('status.late') }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  @click="handleClose"
                  class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  {{ $t('common.cancel') }}
                </button>
                <button type="submit" class="btn-primary flex items-center">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {{ $t('common.save') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { PROPERTY_STATUS } from '@/utils/constants'

// Utilise $t dans le template, pas besoin de t dans le script

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  property: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'submit'])

const form = ref({
  name: '',
  address: '',
  city: '',
  rent: null,
  status: '',
  tenant: {
    name: '',
    entryDate: '',
    status: 'on_time'
  }
})

/**
 * Initialise le formulaire avec les données du bien à modifier
 */
const initializeForm = () => {
  if (props.property) {
    form.value = {
      name: props.property.name || '',
      address: props.property.address || '',
      city: props.property.city || '',
      rent: props.property.rent || null,
      status: props.property.status || '',
      tenant: props.property.tenant
        ? {
            name: props.property.tenant.name || '',
            entryDate: props.property.tenant.entryDate || '',
            status: props.property.tenant.status || 'on_time'
          }
        : {
            name: '',
            entryDate: '',
            status: 'on_time'
          }
    }
  } else {
    resetForm()
  }
}

/**
 * Réinitialise le formulaire
 */
const resetForm = () => {
  form.value = {
    name: '',
    address: '',
    city: '',
    rent: null,
    status: '',
    tenant: {
      name: '',
      entryDate: '',
      status: 'on_time'
    }
  }
}

/**
 * Ferme le modal
 */
const handleClose = () => {
  resetForm()
  emit('close')
}

/**
 * Soumet le formulaire
 */
const handleSubmit = () => {
  // TODO v0.2.0 : Valider les données avec un schéma (Zod, Yup, etc.)

  // Prépare les données à soumettre
  const submitData = {
    name: form.value.name,
    address: form.value.address,
    city: form.value.city,
    rent: Number(form.value.rent),
    status: form.value.status,
    // Ajoute les informations du locataire seulement si le bien est occupé
    tenant:
      form.value.status === PROPERTY_STATUS.OCCUPIED
        ? {
            name: form.value.tenant.name,
            entryDate: form.value.tenant.entryDate,
            status: form.value.tenant.status
          }
        : null
  }

  emit('submit', submitData)

  resetForm()
  emit('close')
}

/**
 * Réinitialise les champs locataire si on change le statut de "occupé" à "libre"
 */
watch(
  () => form.value.status,
  newStatus => {
    if (newStatus !== PROPERTY_STATUS.OCCUPIED) {
      form.value.tenant = {
        name: '',
        entryDate: '',
        status: 'on_time'
      }
    }
  }
)

/**
 * Initialise le formulaire quand le modal s'ouvre ou quand le bien change
 */
watch(
  [() => props.isOpen, () => props.property],
  ([isOpen, property]) => {
    if (isOpen && property) {
      initializeForm()
    } else if (!isOpen) {
      resetForm()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
/* Transitions pour le modal */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .transform,
.modal-leave-active .transform {
  transition: transform 0.3s ease;
}

.modal-enter-from .transform,
.modal-leave-to .transform {
  transform: scale(0.95);
}
</style>
