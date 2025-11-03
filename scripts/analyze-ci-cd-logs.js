/**
 * Script pour analyser les logs du CI/CD GitHub Actions
 * Usage: node scripts/analyze-ci-cd-logs.js [workflow-run-id]
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

/**
 * Analyse les logs d'un workflow GitHub Actions
 */
function analyzeWorkflowLogs(logsDir) {
  console.log('\n🔍 ANALYSE DES LOGS CI/CD\n')
  console.log('═'.repeat(60))

  if (!existsSync(logsDir)) {
    console.error(`❌ Dossier non trouvé: ${logsDir}`)
    console.log('\n💡 Pour télécharger les logs depuis GitHub Actions:')
    console.log('   1. Aller sur: https://github.com/LIILVAME/Doogoo/actions')
    console.log('   2. Cliquer sur un workflow run')
    console.log('   3. Cliquer sur "..." → "Download logs"')
    console.log("   4. Extraire l'archive dans ce dossier")
    return
  }

  const errors = []
  const warnings = []
  const jobs = []

  try {
    const files = readFileSync(join(logsDir, 'structure.txt'), 'utf-8')
    console.log('📁 Structure des logs trouvée\n')

    // Analyse des erreurs
    files.split('\n').forEach(line => {
      if (line.includes('error') || line.includes('ERROR') || line.includes('FAIL')) {
        errors.push(line)
      } else if (line.includes('warning') || line.includes('WARNING')) {
        warnings.push(line)
      }
    })

    console.log(`❌ Erreurs détectées: ${errors.length}`)
    console.log(`⚠️  Warnings détectés: ${warnings.length}\n`)

    if (errors.length > 0) {
      console.log('📋 Résumé des erreurs:\n')
      errors.slice(0, 10).forEach(err => console.log(`   - ${err}`))
      if (errors.length > 10) {
        console.log(`   ... et ${errors.length - 10} autres erreurs`)
      }
    }

    return {
      errors,
      warnings,
      jobs
    }
  } catch (err) {
    console.error('❌ Erreur lors de la lecture des logs:', err.message)
    console.log('\n💡 Vérifiez que le dossier contient les logs GitHub Actions')
  }
}

/**
 * Analyse les problèmes CI/CD identifiés
 */
function analyzeCommonIssues() {
  console.log('\n' + '═'.repeat(60))
  console.log('\n🔧 PROBLÈMES CI/CD COURANTS ET SOLUTIONS\n')

  const issues = [
    {
      type: 'ESLint Errors',
      description: 'Variables non utilisées, imports manquants',
      solution: 'npm run lint:check -- --fix'
    },
    {
      type: 'Test Failures',
      description: 'Tests unitaires échouent',
      solution: 'npm run test:unit'
    },
    {
      type: 'i18n Validation',
      description: 'Traductions manquantes ou invalides',
      solution: 'npm run test:i18n'
    },
    {
      type: 'Build Failures',
      description: 'Erreurs de compilation Vite',
      solution: 'npm run build'
    },
    {
      type: 'Lighthouse Failures',
      description: 'Scores de performance trop bas',
      solution: 'Vérifier la configuration Lighthouse CI'
    }
  ]

  issues.forEach(issue => {
    console.log(`\n📌 ${issue.type}`)
    console.log(`   Description: ${issue.description}`)
    console.log(`   Solution: ${issue.solution}`)
  })
}

/**
 * Génère un rapport d'analyse
 */
function generateReport(analysis) {
  const reportPath = join(rootDir, 'docs', 'CI_CD_LOGS_ANALYSIS.md')
  const report = `# 📊 Analyse des Logs CI/CD

**Date**: ${new Date().toISOString().split('T')[0]}

## 🔍 Résumé

- **Erreurs**: ${analysis?.errors?.length || 0}
- **Warnings**: ${analysis?.warnings?.length || 0}
- **Jobs**: ${analysis?.jobs?.length || 0}

## 📋 Détails

### Erreurs critiques
${
  analysis?.errors
    ?.slice(0, 20)
    .map(e => `- ${e}`)
    .join('\n') || 'Aucune erreur critique'
}

### Warnings
${
  analysis?.warnings
    ?.slice(0, 10)
    .map(w => `- ${w}`)
    .join('\n') || 'Aucun warning'
}

## 🔧 Actions recommandées

1. Corriger les erreurs ESLint
2. Vérifier les tests unitaires
3. Valider les traductions i18n
4. Vérifier le build localement
`

  try {
    writeFileSync(reportPath, report, 'utf-8')
    console.log(`\n✅ Rapport généré: ${reportPath}`)
  } catch (err) {
    console.error('❌ Erreur lors de la génération du rapport:', err.message)
  }
}

// Main
const logsDir = process.argv[2] || join(rootDir, 'logs_49010673832')

console.log(`📂 Analyse du dossier: ${logsDir}\n`)

const analysis = analyzeWorkflowLogs(logsDir)
analyzeCommonIssues()

if (analysis) {
  generateReport(analysis)
}

console.log('\n' + '═'.repeat(60))
console.log('\n✅ Analyse terminée\n')
