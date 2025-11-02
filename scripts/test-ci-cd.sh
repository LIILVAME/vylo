#!/bin/bash

# Script pour tester les workflows CI/CD
# Usage: ./scripts/test-ci-cd.sh [branch-name]

set -e

BRANCH_NAME="${1:-test/ci-cd-$(date +%Y%m%d-%H%M%S)}"
MAIN_BRANCH="${2:-main}"

echo "🧪 Test des workflows CI/CD"
echo "================================"
echo ""
echo "📋 Configuration:"
echo "  - Branch de test: $BRANCH_NAME"
echo "  - Branch principale: $MAIN_BRANCH"
echo ""

# Vérifier qu'on est dans un repo Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "❌ Ce répertoire n'est pas un dépôt Git"
  exit 1
fi

# Vérifier qu'on est sur une branche propre
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]; then
  echo "ℹ️  Vous n'êtes pas sur la branche $MAIN_BRANCH (actuellement sur: $CURRENT_BRANCH)"
  echo "   La branche de test sera créée à partir de votre branche actuelle"
  echo ""
fi

# Vérifier que le working directory est propre
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Vous avez des changements non commités"
  echo "   Les changements seront inclus dans la branche de test"
  echo ""
  read -p "Continuer quand même? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Annulé"
    exit 1
  fi
fi

# Créer la branche de test depuis la branche actuelle
echo "🌿 Création de la branche de test..."
if git show-ref --verify --quiet refs/heads/"$BRANCH_NAME"; then
  echo "   La branche $BRANCH_NAME existe déjà"
  read -p "Utiliser cette branche existante? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout "$BRANCH_NAME"
  else
    echo "❌ Branche existante, utilisez un nom différent ou supprimez-la"
    exit 1
  fi
else
  git checkout -b "$BRANCH_NAME"
fi

# Créer un commit de test
echo "📝 Création d'un commit de test..."
if git diff --quiet && git diff --staged --quiet; then
  # Aucun changement, créer un commit vide
  git commit --allow-empty -m "test(ci): verify CI/CD workflows

This is an automated test commit to verify:
- Lint and type check workflow
- Unit tests workflow
- i18n and build workflow
- Lighthouse audit workflow
- Vercel deployment workflow (if configured)

Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
"
else
  # Il y a des changements, les inclure dans le commit
  echo "   ⚠️  Des changements non commités seront inclus dans le commit de test"
  git add -A
  git commit -m "test(ci): verify CI/CD workflows

This is an automated test commit to verify:
- Lint and type check workflow
- Unit tests workflow
- i18n and build workflow
- Lighthouse audit workflow
- Vercel deployment workflow (if configured)

Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
"
fi

# Push la branche
echo "🚀 Push de la branche..."
if git push -u origin "$BRANCH_NAME" 2>&1; then
  echo ""
  echo "✅ Branche créée et poussée avec succès!"
else
  echo ""
  echo "❌ Erreur lors du push"
  echo "   Vérifiez votre connexion et vos permissions"
  exit 1
fi

# Détecter le repo GitHub pour l'URL
GITHUB_REPO=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+\/[^/]+)(\.git)?$/\1/' | sed 's/\.git$//' || echo "votre-org/votre-repo")

echo ""
echo "📋 Prochaines étapes:"
echo "  1. Aller sur GitHub: https://github.com/$GITHUB_REPO/compare/$MAIN_BRANCH...$BRANCH_NAME"
echo "  2. Cliquer sur 'Create Pull Request'"
echo "  3. Vérifier que les workflows s'exécutent dans l'onglet 'Checks'"
echo "  4. Vérifier que le déploiement Vercel fonctionne (si configuré)"
echo ""
echo "🧹 Pour nettoyer après les tests:"
echo "  git checkout $MAIN_BRANCH"
echo "  git branch -D $BRANCH_NAME"
echo "  git push origin --delete $BRANCH_NAME"
echo ""

