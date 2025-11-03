<template>
  <AuthLayout>
    <div>
      <h2 class="text-2xl sm:text-3xl font-bold mb-2 text-center text-gray-900">
        {{ $t('auth.login.title') }}
      </h2>
      <p class="text-center text-gray-500 text-sm mb-6">{{ $t('auth.login.subtitle') }}</p>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Email -->
        <AuthInput
          :label="$t('auth.login.email')"
          type="email"
          v-model="form.email"
          :placeholder="$t('auth.login.emailPlaceholder')"
          :error="emailError"
          required
        />

        <!-- Mot de passe -->
        <AuthInput
          :label="$t('auth.login.password')"
          type="password"
          v-model="form.password"
          :placeholder="$t('auth.login.passwordPlaceholder')"
          :error="passwordError"
          required
        />

        <!-- Lien mot de passe oublié -->
        <div class="flex items-center justify-end">
          <router-link
            to="/reset-password"
            class="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
          >
            {{ $t('auth.login.forgotPassword') }}
          </router-link>
        </div>

        <!-- Message de succès réinitialisation -->
        <transition name="slide-fade">
          <div
            v-if="route.query.passwordReset === 'true'"
            class="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg shadow-sm mb-4"
          >
            <div class="flex items-start">
              <svg
                class="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              <p class="text-sm text-green-700 flex-1">
                {{ $t('auth.reset.updateSuccess') }} Vous pouvez maintenant vous connecter.
              </p>
            </div>
          </div>
        </transition>

        <!-- Message d'erreur global -->
        <transition name="slide-fade">
          <div
            v-if="authStore.error && !emailError && !passwordError"
            class="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm"
          >
            <div class="flex items-start">
              <svg
                class="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              <p class="text-sm text-red-700 flex-1">{{ authStore.error }}</p>
            </div>
          </div>
        </transition>

        <!-- Bouton de connexion -->
        <AuthButton
          :label="$t('auth.login.cta')"
          :loading="authStore.loading"
          type="submit"
          :disabled="
            !form.email ||
            !form.password ||
            oauthLoading ||
            authStore.loading ||
            emailError ||
            passwordError
          "
        />

        <!-- Boutons OAuth -->
        <AuthOAuth
          :loading="oauthLoading ? oauthProvider : false"
          :disabled="authStore.loading"
          :vertical="false"
          @oauth="handleOAuth"
        />

        <!-- Lien d'inscription -->
        <div class="mt-6 pt-6 border-t border-gray-200 text-center">
          <p class="text-sm text-gray-600">
            {{ $t('auth.login.noAccount') }}
            <router-link
              to="/signup"
              class="text-green-600 hover:text-green-700 font-semibold transition-colors ml-1"
            >
              {{ $t('auth.signup.title') }}
            </router-link>
          </p>
        </div>
      </form>
    </div>
  </AuthLayout>
</template>

<script setup>
import { ref, computed, onMounted, onErrorCaptured, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '@/composables/useLingui'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import AuthLayout from '@/layouts/AuthLayout.vue'
import AuthInput from '@/components/auth/AuthInput.vue'
import AuthButton from '@/components/auth/AuthButton.vue'
import AuthOAuth from '@/components/auth/AuthOAuth.vue'

// Capture les erreurs de rendu pour éviter l'écran blanc
onErrorCaptured((err, instance, info) => {
  console.error('🔴 Erreur dans LoginPage:', err)
  console.error('📍 Info:', info)
  console.error('🎭 Instance:', instance?.$options?.name)
  console.error('📚 Stack:', err?.stack)
  // Ne propage pas l'erreur pour éviter l'écran blanc complet
  return false
})

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()

const form = ref({
  email: '',
  password: ''
})

const oauthLoading = ref(false)
const oauthProvider = ref(null)

const emailError = computed(() => {
  // Validation basique du format email
  if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    return 'Veuillez entrer une adresse email valide'
  }
  // Si l'email est vide, ne retourne pas d'erreur (le bouton sera désactivé par !form.email)
  return ''
})

const passwordError = computed(() => {
  // Pas de validation de format pour le mot de passe ici
  // Si le password est vide, le bouton sera désactivé par !form.password
  return ''
})

// Nettoie le query param passwordReset après affichage
watch(
  () => route.query.passwordReset,
  value => {
    if (value === 'true') {
      // Nettoie l'URL après un court délai
      setTimeout(() => {
        router.replace({ query: {} })
      }, 5000) // 5 secondes pour laisser voir le message
    }
  }
)

// Réinitialise l'erreur quand l'utilisateur modifie les champs
watch(
  () => [form.value.email, form.value.password],
  () => {
    // Réinitialise l'erreur quand l'utilisateur commence à taper
    if (authStore.error) {
      authStore.error = null
    }
  }
)

/**
 * Gère la connexion
 */
const handleLogin = async () => {
  authStore.error = null
  const result = await authStore.login(form.value.email, form.value.password)

  if (result.success) {
    const redirectTo = route.query.redirect || '/dashboard'
    router.push(redirectTo)
  }
}

/**
 * Gère la connexion OAuth
 */
const handleOAuth = async provider => {
  oauthLoading.value = true
  oauthProvider.value = provider

  try {
    const redirectTo = route.query.redirect || '/dashboard'
    if (provider === 'google') {
      await authStore.loginWithGoogle(redirectTo)
    } else if (provider === 'apple') {
      await authStore.loginWithApple(redirectTo)
    }
    // La redirection se fait automatiquement par Supabase
  } catch (error) {
    console.error(`Erreur connexion ${provider}:`, error)
    oauthLoading.value = false
    oauthProvider.value = null
  }
}

/**
 * Vérifie si l'utilisateur est déjà connecté
 * Gère aussi le callback OAuth depuis l'URL
 */
onMounted(async () => {
  if (import.meta.env.DEV) {
    console.debug('🔵 LoginPage onMounted')
  }

  try {
    authStore.error = null

    // Attendre que loadingSession soit terminé avant de faire quoi que ce soit
    let attempts = 0
    while (authStore.loadingSession && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    // Vérifie s'il y a un token OAuth dans l'URL (callback)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const error = hashParams.get('error')

    if (error) {
      if (import.meta.env.DEV) {
        console.debug('🔵 LoginPage - Erreur OAuth:', error)
      }
      toastStore.error(`Erreur d'authentification : ${error}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (accessToken) {
      if (import.meta.env.DEV) {
        console.debug('🔵 LoginPage - Token OAuth détecté')
      }
      setTimeout(async () => {
        try {
          const user = await authStore.fetchUser(true)
          if (user) {
            const redirectTo = route.query.redirect || '/dashboard'
            router.push(redirectTo)
            toastStore.success(t('login.oauthSuccess'))
          }
        } catch (err) {
          console.error('🔴 Erreur lors du callback OAuth:', err)
        }
      }, 500)
    }

    // Si l'utilisateur est déjà connecté, redirige vers le dashboard
    if (authStore.user) {
      if (import.meta.env.DEV) {
        console.debug('🔵 LoginPage - Utilisateur connecté, redirection')
      }
      router.push('/dashboard')
    } else {
      try {
        const user = await authStore.fetchUser(true)
        if (user) {
          if (import.meta.env.DEV) {
            console.debug('🔵 LoginPage - Session trouvée, redirection')
          }
          router.push('/dashboard')
        }
      } catch (err) {
        // Erreur silencieuse - l'utilisateur peut simplement se connecter
        console.warn('⚠️ LoginPage - Impossible de récupérer la session:', err)
      }
    }
  } catch (err) {
    console.error('🔴 ERREUR CRITIQUE dans onMounted de LoginPage:', err)
    console.error('Stack:', err.stack)
    // Ne pas bloquer le rendu en cas d'erreur
  }
})
</script>

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
