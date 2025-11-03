#!/usr/bin/env node

/**
 * Script de vérification des variables d'environnement Vercel
 * Vérifie que VITE_BASE_PATH n'est pas défini ou est à '/' pour Vercel
 */

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

/**
 * Couleurs pour la console
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

/**
 * Vérifie si Vercel CLI est installé
 */
function hasVercelCLI() {
  try {
    execSync('vercel --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Récupère les variables d'environnement depuis Vercel CLI
 */
function getVercelEnvVars() {
  if (!hasVercelCLI()) {
    return null
  }

  try {
    const output = execSync('vercel env ls --json', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'pipe'
    })
    return JSON.parse(output)
  } catch {
    // Si non authentifié ou erreur, retourner null
    return null
  }
}

/**
 * Vérifie les variables d'environnement locales (.env)
 */
function checkLocalEnv() {
  const envFiles = ['.env', '.env.local', '.env.production']
  const envVars = {}

  for (const file of envFiles) {
    const filePath = join(projectRoot, file)
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^=]+)=(.*)$/)
          if (match) {
            const key = match[1].trim()
            const value = match[2].trim().replace(/^["']|["']$/g, '')
            envVars[key] = { value, source: file }
          }
        }
      }
    }
  }

  return envVars
}

/**
 * Analyse les variables d'environnement
 */
function analyzeEnvVars(vercelVars, localVars) {
  const analysis = {
    basePath: {
      found: false,
      value: null,
      source: null,
      issue: null
    },
    required: {
      supabaseUrl: { found: false, source: null },
      supabaseKey: { found: false, source: null }
    },
    optional: {
      sentryDsn: { found: false, source: null },
      plausibleDomain: { found: false, source: null }
    }
  }

  // Vérifier VITE_BASE_PATH
  if (vercelVars) {
    for (const env of vercelVars) {
      if (env.key === 'VITE_BASE_PATH') {
        analysis.basePath.found = true
        analysis.basePath.value = env.value
        analysis.basePath.source = 'Vercel (Production)'

        // Vérifier si la valeur est incorrecte pour Vercel
        if (env.value === '/Doogoo/' || env.value === '/Doogoo') {
          analysis.basePath.issue = 'INCORRECT'
        } else if (env.value === '/' || env.value === '') {
          analysis.basePath.issue = 'CORRECT'
        } else {
          analysis.basePath.issue = 'UNEXPECTED'
        }
      }

      // Vérifier les variables requises
      if (env.key === 'VITE_SUPABASE_URL') {
        analysis.required.supabaseUrl.found = true
        analysis.required.supabaseUrl.source = 'Vercel'
      }
      if (env.key === 'VITE_SUPABASE_ANON_KEY') {
        analysis.required.supabaseKey.found = true
        analysis.required.supabaseKey.source = 'Vercel'
      }

      // Vérifier les variables optionnelles
      if (env.key === 'VITE_SENTRY_DSN') {
        analysis.optional.sentryDsn.found = true
        analysis.optional.sentryDsn.source = 'Vercel'
      }
      if (env.key === 'VITE_PLAUSIBLE_DOMAIN') {
        analysis.optional.plausibleDomain.found = true
        analysis.optional.plausibleDomain.source = 'Vercel'
      }
    }
  }

  // Vérifier aussi dans les fichiers locaux
  if (localVars.VITE_BASE_PATH) {
    if (!analysis.basePath.found) {
      analysis.basePath.found = true
      analysis.basePath.value = localVars.VITE_BASE_PATH.value
      analysis.basePath.source = `Local (${localVars.VITE_BASE_PATH.source})`
    }
  }

  return analysis
}

/**
 * Génère le rapport
 */
function generateReport(analysis) {
  logSection("📊 RAPPORT DE VÉRIFICATION - VARIABLES D'ENVIRONNEMENT VERCEL")

  // Section VITE_BASE_PATH
  console.log('\n🔍 VITE_BASE_PATH (Base Path)')
  console.log('─'.repeat(60))

  if (!analysis.basePath.found) {
    log('✅ Variable non définie (utilise la valeur par défaut "/")', 'green')
    log("   → C'est correct pour Vercel !", 'green')
  } else {
    if (analysis.basePath.issue === 'CORRECT') {
      log(
        `✅ Variable définie à "${analysis.basePath.value}" (${analysis.basePath.source})`,
        'green'
      )
      log("   → C'est correct pour Vercel !", 'green')
    } else if (analysis.basePath.issue === 'INCORRECT') {
      log(`❌ Variable définie à "${analysis.basePath.value}" (${analysis.basePath.source})`, 'red')
      log('   → PROBLÈME : Cette valeur est pour GitHub Pages, pas Vercel !', 'red')
      log('   → Action requise : Supprimer ou définir à "/" dans Vercel Dashboard', 'yellow')
    } else {
      log(
        `⚠️  Variable définie à "${analysis.basePath.value}" (${analysis.basePath.source})`,
        'yellow'
      )
      log("   → Valeur inattendue, vérifiez si c'est correct", 'yellow')
    }
  }

  // Section Variables requises
  console.log('\n🔍 Variables Requises')
  console.log('─'.repeat(60))

  if (analysis.required.supabaseUrl.found) {
    log('✅ VITE_SUPABASE_URL : Définie', 'green')
  } else {
    log('❌ VITE_SUPABASE_URL : Manquante', 'red')
  }

  if (analysis.required.supabaseKey.found) {
    log('✅ VITE_SUPABASE_ANON_KEY : Définie', 'green')
  } else {
    log('❌ VITE_SUPABASE_ANON_KEY : Manquante', 'red')
  }

  // Section Variables optionnelles
  console.log('\n🔍 Variables Optionnelles')
  console.log('─'.repeat(60))

  if (analysis.optional.sentryDsn.found) {
    log('✅ VITE_SENTRY_DSN : Définie', 'green')
  } else {
    log('⚪ VITE_SENTRY_DSN : Non définie (optionnel)', 'blue')
  }

  if (analysis.optional.plausibleDomain.found) {
    log('✅ VITE_PLAUSIBLE_DOMAIN : Définie', 'green')
  } else {
    log('⚪ VITE_PLAUSIBLE_DOMAIN : Non définie (optionnel)', 'blue')
  }

  // Instructions pour corriger
  if (analysis.basePath.issue === 'INCORRECT') {
    logSection('🔧 ACTIONS REQUISES')

    console.log('\n1️⃣  Via Vercel Dashboard :')
    console.log('   → https://vercel.com/dashboard')
    console.log('   → Sélectionner votre projet "doogoo"')
    console.log('   → Settings → Environment Variables')
    console.log('   → Chercher "VITE_BASE_PATH"')
    console.log('   → Supprimer la variable ou la définir à "/"')

    console.log('\n2️⃣  Via Vercel CLI :')
    if (hasVercelCLI()) {
      console.log('   → vercel env rm VITE_BASE_PATH production')
      console.log('   → Ou : vercel env add VITE_BASE_PATH production')
      console.log('   → Entrer "/" comme valeur')
    } else {
      log('   → Installer Vercel CLI : npm i -g vercel', 'yellow')
    }

    console.log('\n3️⃣  Redéployer :')
    console.log('   → Vercel Dashboard → Deployments → Redeploy')
    console.log('   → Ou : vercel --prod')
  }

  // Résumé
  logSection('📋 RÉSUMÉ')

  const issues = []
  if (analysis.basePath.issue === 'INCORRECT') {
    issues.push('VITE_BASE_PATH incorrect pour Vercel')
  }
  if (!analysis.required.supabaseUrl.found) {
    issues.push('VITE_SUPABASE_URL manquante')
  }
  if (!analysis.required.supabaseKey.found) {
    issues.push('VITE_SUPABASE_ANON_KEY manquante')
  }

  if (issues.length === 0) {
    log('✅ Toutes les vérifications sont passées !', 'green')
    log('   → La configuration Vercel est correcte.', 'green')
  } else {
    log(`⚠️  ${issues.length} problème(s) détecté(s) :`, 'yellow')
    issues.forEach(issue => {
      log(`   → ${issue}`, 'yellow')
    })
  }

  // Note sur GitHub Pages
  console.log('\n📝 Note :')
  console.log('   → /Doogoo/ est réservé pour GitHub Pages (https://liilvame.github.io/Doogoo/)')
  console.log('   → Vercel doit utiliser / (racine)')
}

/**
 * Main
 */
function main() {
  log("\n🔍 Vérification des variables d'environnement Vercel...\n", 'cyan')

  const localVars = checkLocalEnv()
  const vercelVars = getVercelEnvVars()

  if (!vercelVars) {
    log('⚠️  Vercel CLI non disponible ou non authentifié', 'yellow')
    log('   → Les variables locales seront vérifiées', 'yellow')
    log('   → Pour vérifier Vercel Dashboard : https://vercel.com/dashboard', 'blue')
  }

  const analysis = analyzeEnvVars(vercelVars, localVars)
  generateReport(analysis)
}

main()
