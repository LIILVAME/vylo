# 🔒 Correction du Secret Notion Exposé

**Date** : 02 janvier 2025  
**Problème** : Token Notion API exposé dans l'historique Git bloquant les pushes

---

## ✅ Correction Appliquée

1. ✅ Token remplacé par placeholder dans `docs/MCP_NOTION_CONFIG.md`
2. ✅ Fichiers `mcp.json` ajoutés au `.gitignore`
3. ⚠️ **Le token reste dans l'historique Git** (commit `80a6f1d`)

---

## 🚨 Action Requise : Régénérer le Token Notion

Le token `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` a été exposé publiquement.

**Actions immédiates** :

1. Aller sur [Notion Integrations](https://www.notion.so/my-integrations)
2. Trouver l'intégration "Doogoo MCP" (ou celle correspondante)
3. Cliquer sur "Revoke" ou "Delete" pour invalider le token
4. Créer une nouvelle intégration avec un nouveau token
5. Mettre à jour `~/.cursor/mcp.json` avec le nouveau token

---

## 🔧 Solutions pour Débloquer le Push GitHub

### Option 1 : Autoriser Temporairement (Quick Fix)

GitHub fournit un lien pour autoriser le secret malgré la détection :

👉 **Cliquez ici** : https://github.com/LIILVAME/Doogoo/security/secret-scanning/unblock-secret/34wDgbas5bSrbwnLUWXk3ea2xSI

Cela permettra de pousser la branche, mais **le secret reste dans l'historique**.

### Option 2 : Nettoyer l'Historique Git (Recommandé)

Pour supprimer complètement le secret de l'historique :

```bash
# Installer git-filter-repo (recommandé) ou utiliser filter-branch
pip install git-filter-repo

# Supprimer le secret de l'historique
git filter-repo --path docs/MCP_NOTION_CONFIG.md --invert-paths
# OU
git filter-repo --path-filter 'sed -i "s/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/votre_token_notion_ici/g"' HEAD

# Force push (⚠️ nécessite permissions admin sur le repo)
git push origin --force --all
```

**⚠️ Attention** : `filter-repo` réécrit l'historique. Coordonnez avec votre équipe avant de forcer le push.

### Option 3 : Nouvelle Branche Propre (Simple)

Créer une nouvelle branche depuis `main` sans l'historique problématique :

```bash
# Revenir sur main
git checkout main

# Créer une nouvelle branche de test
./scripts/test-ci-cd.sh

# Ou manuellement :
git checkout -b test/ci-cd-clean-$(date +%Y%m%d-%H%M%S)
git commit --allow-empty -m "test(ci): verify CI/CD workflows"
git push -u origin HEAD
```

---

## 📋 Recommandation

Pour l'immédiat :

1. **Régénérer le token Notion** (prioritaire)
2. Utiliser **Option 1** pour débloquer le push et tester les workflows CI/CD
3. Planifier **Option 2** ou **Option 3** pour nettoyer l'historique proprement

---

## 🔐 Prévention Future

Pour éviter ce problème à l'avenir :

1. ✅ `.gitignore` mis à jour avec `**/mcp.json`
2. ✅ Utiliser des placeholders dans la documentation
3. ✅ Utiliser GitHub Secrets pour les tokens en production
4. ✅ Activer GitHub Secret Scanning (déjà actif)

---

## 📝 Notes

- Le secret a été détecté par GitHub Secret Scanning
- Le commit problématique : `80a6f1d6d54a16a6bdbef65c42f61f8a4ae8dc09`
- Le fichier a été corrigé mais l'historique contient encore le secret
