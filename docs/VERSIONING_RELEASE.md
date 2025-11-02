# 🚀 Doogoo — Versioning & Robust Release Framework (2025 Edition)

**Objectif :**

Mettre en place un système moderne de gestion de versions, CI/CD et qualité continue, afin que chaque évolution de Doogoo soit **prévisible, testée, traçable et déployée sans régression**.

---

## 🧩 1. Versioning — Semantic + Auto Tagging

### 🔖 Convention : **SemVer (MAJOR.MINOR.PATCH)**

| Type      | Exemple | Cas d'usage                      |
| --------- | ------- | -------------------------------- |
| **MAJOR** | `1.0.0` | rupture API, refonte majeure     |
| **MINOR** | `0.4.0` | nouvelles features (compatibles) |
| **PATCH** | `0.4.1` | correction ou micro-amélioration |

Les tags sont **auto-générés** depuis les commits via `standard-version`.

### ⚙️ Commandes

```bash
npm run release         # patch automatique
npm run release:minor   # minor automatique
npm run release:major   # major automatique
git push origin main --follow-tags
```

Le tag déclenche le **build automatique Vercel**.

---

## 🌿 2. Structure Git moderne

### Branching Model (Lean Git Flow)

```
main        → Production
develop     → Pré-release (staging)
feature/*   → Nouvelle fonctionnalité
fix/*       → Correctif
hotfix/*    → Urgence prod
```

### Règle d'or

- **main** = toujours déployable
- **develop** = toujours testable
- **feature/** = courte durée de vie, supprimée après merge

---

## ⚙️ 3. CI/CD Intelligente (GitHub + Vercel)

### Pipeline : `.github/workflows/ci.yml`

1. **Lint & Type Check**
   - `npm run lint:check`
   - `npm run type-check`

2. **Tests unitaires (Vitest)**
   - `npm run test:unit`

3. **Audit i18n & Build**
   - `npm run test:i18n`
   - `npm run build`

4. **Analyse Lighthouse (en option)**
   - Vérifie perf, PWA, SEO

5. **Auto-Release**
   - Tag version + changelog auto + déploiement sur Vercel

---

## 🧱 4. Sécurité de Build & Environnements

### Environnements Git + Vercel

| Environnement | Branche     | Base Supabase     | URL                          |
| ------------- | ----------- | ----------------- | ---------------------------- |
| Production    | `main`      | `doogoo-prod`     | `https://doogoo.vercel.app`  |
| Staging       | `develop`   | `doogoo-staging`  | `https://staging.doogoo.app` |
| Preview       | `feature/*` | (auto via Vercel) | preview auto                 |

### Variables Vercel

Toutes déclarées en `VITE_*` et **"Included in Build"** :

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_NAME
VITE_ADMIN_EMAIL
```

---

## 🧪 5. Qualité & Validation Automatique

### Avant chaque merge

- ✅ `npm run lint:check`
- ✅ `npm run type-check`
- ✅ `npm run test:unit`
- ✅ `npm run build`
- ✅ `npm run test:i18n`

Tout échec = merge bloqué.

### Outils recommandés

- **Husky + lint-staged** → contrôle local pré-commit
- **Vitest + Vue Test Utils** → tests UI/stores
- **Cypress** → tests E2E rapides sur les flows (login, paiement, logout)

---

## 🧰 6. Gestion des bugs et hotfix

### Cas d'un bug en production

```bash
git checkout main
git pull
git checkout -b hotfix/payments-undefined

# corrige le bug
npm run test:unit && npm run build

git commit -m "fix(payments): handle undefined tenant_id"
git push origin hotfix/payments-undefined
```

Puis :

```bash
npm run release:patch
git push origin main --tags
```

→ Le patch est automatiquement déployé sur Vercel.

### Suivi des incidents

Créer un dossier :

```
/docs/issues/
  ├── 2025-11-02-locataires-undefined.md
  ├── 2025-11-05-auth-400-badrequest.md
  └── TEMPLATE_BUG_REPORT.md
```

Chaque ticket décrit : contexte, logs, cause, fix appliqué.

---

## 📜 7. Documentation & Changelog

### Génération automatique

Installé via `standard-version` (déjà dans package.json).

Commandes :

```bash
npm run release         # met à jour version + changelog
npm run release:minor   # bump minor
npm run release:major   # bump major
```

### Convention de commit

| Type        | Description      | Exemple                                 |
| ----------- | ---------------- | --------------------------------------- |
| `feat:`     | nouvelle feature | `feat(pwa): add offline sync`           |
| `fix:`      | bug corrigé      | `fix(auth): handle invalid token`       |
| `refactor:` | code nettoyé     | `refactor(api): centralize retry logic` |
| `chore:`    | maintenance      | `chore(ci): add build cache`            |
| `docs:`     | doc modifiée     | `docs(readme): add release guide`       |
| `test:`     | tests ajoutés    | `test(store): add tenants coverage`     |

---

## 🧠 8. Système de Revue & Tests avant merge

### Avant merge → Checklist Review :

- [ ] Lint et tests passent ✅
- [ ] Aucun `console.error` ni warning
- [ ] i18n complet
- [ ] Diagnostic (`/diagnostics`) sans erreur
- [ ] Performance (Lighthouse > 90)

### Après merge → Release Preview

- `Vercel Preview URL` partagée pour QA
- Test rapide sur mobile + desktop
- Si validé → merge vers `main`

---

## 🧩 9. Monitoring et Rollback

### Monitoring

- **Sentry** → erreurs front
- **diagnosticStore** → erreurs API + latence
- **Vercel Analytics** → trafic & erreurs réseau

### Rollback

En cas d'incident :

```bash
git checkout v0.3.1
git push origin main
```

Vercel redéploie instantanément la version stable.

---

## 🔐 10. Sécurité et stabilité long terme

- **Audit Supabase Policies** avant chaque release
- **Tests de déconnexion / token expiré**
- **Backup automatique** Supabase weekly
- **Scan dépendances** : `npm audit fix`

---

## 🧩 11. Automatisation future

Intégrations suggérées :

- ✅ **standard-version** → auto tag + changelog (implémenté)
- ✅ **RenovateBot** → mises à jour dépendances
- ✅ **Playwright** → tests UI automatisés sur staging
- ✅ **Tolgee Cloud** → i18n centralisé

---

## ✅ Résultat attendu

| Axe               | Objectif                          | Statut    |
| ----------------- | --------------------------------- | --------- |
| Versioning        | SemVer auto + changelog           | ✅ Stable |
| CI/CD             | Lint, test, build avant merge     | ✅        |
| Bugs              | Hotfix pipeline propre            | ✅        |
| Docs              | CHANGELOG + issues documentés     | ✅        |
| Perf & Robustesse | Build sécurisé, rollback possible | ✅        |
| Supabase & Auth   | Sécurité RLS validée              | ✅        |

---

## 🚀 Workflow quotidien résumé

1. `git checkout -b feature/nom-feature`
2. Dev + tests + build ✅
3. PR → `develop` → CI valide
4. Merge → `npm run release`
5. Tag & push → auto-deploy sur Vercel
6. Bugs ? → `hotfix/...` → patch
7. Tout est documenté → changelog + bug report

---

**Résultat final :**

Doogoo devient une app **sûre, auditable et industrialisée** :
chaque amélioration est versionnée, testée et rollbackable à tout moment.
