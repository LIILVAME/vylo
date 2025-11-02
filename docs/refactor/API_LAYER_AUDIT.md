# 🔍 Audit API Layer — Doogoo v0.2.2

**Date** : 2025-01-28  
**Objectif** : Vérifier que tous les stores Pinia passent par la couche API unifiée

---

## ✅ Stores conformes (utilisent `/api/*`)

### 1. `propertiesStore.js` ✅

- ✅ `propertiesApi.getProperties()`
- ✅ `propertiesApi.createProperty()`
- ✅ `propertiesApi.updateProperty()`
- ✅ `propertiesApi.deleteProperty()`
- ⚠️ `supabase` utilisé uniquement pour **Realtime** (normal, Realtime nécessite un accès direct)

### 2. `paymentsStore.js` ✅

- ✅ `paymentsApi.getPayments()`
- ✅ `paymentsApi.createPayment()`
- ✅ `paymentsApi.updatePayment()`
- ✅ `paymentsApi.deletePayment()`
- ⚠️ `supabase` utilisé uniquement pour **Realtime** (normal)

### 3. `authStore.js` ✅ (exception justifiée)

- ⚠️ `supabase.auth.*` utilisé directement
- ✅ **Justification** : L'authentification Supabase doit utiliser l'API Auth directement
- ✅ Pas besoin de couche API pour Auth (gestion de session, tokens, etc.)

---

## ❌ Stores non conformes (appels Supabase directs)

### 1. `analyticsStore.js` ✅

**Statut** : ✅ Migré vers `analyticsApi.getAnalytics()`

- ✅ Utilise maintenant `src/api/analytics.js`
- ✅ Bénéficie de retry, timeout et gestion d'erreur centralisée

### 2. `reportsStore.js` ❓

**À vérifier** : Vérifier si utilise `supabase` directement

**Action requise** : Auditer et créer `src/api/reports.js` si nécessaire

### 3. `alertsStore.js` ❓

**À vérifier** : Vérifier si utilise `supabase` directement

**Action requise** : Auditer et créer `src/api/alerts.js` si nécessaire

---

## 📋 Résumé

| Store             | Statut | API Layer                   | Action                                  |
| ----------------- | ------ | --------------------------- | --------------------------------------- |
| `propertiesStore` | ✅     | `propertiesApi`             | Aucune                                  |
| `paymentsStore`   | ✅     | `paymentsApi`               | Aucune                                  |
| `authStore`       | ✅     | `supabase.auth` (exception) | Aucune                                  |
| `analyticsStore`  | ✅     | `analyticsApi`              | ✅ **TERMINÉ**                          |
| `reportsStore`    | ⚠️     | Direct Supabase             | Créer `reportsApi` (requêtes complexes) |
| `alertsStore`     | ⚠️     | Direct Supabase             | Créer `alertsApi` (requêtes complexes)  |

---

## 🔧 Fonctionnalités déjà présentes dans API layer

### ✅ Retry automatique

- Implémenté dans `utils/retry.js`
- Intégré dans `utils/apiErrorHandler.js` via `withErrorHandling()`
- 3 tentatives max avec délai exponentiel (300ms → 600ms → 1200ms)

### ✅ Timeout

- Implémenté dans `withErrorHandling()`
- Timeout par défaut : **10 secondes**
- Évite les blocages prolongés

### ❌ Circuit breaker (manquant)

- **À implémenter** : Détecter les erreurs répétées
- Activer mode dégradé automatiquement
- Documenté dans `docs/refactor/API_LAYER_AUDIT.md`

### ✅ Gestion d'erreur centralisée

- `handleApiError()` dans `apiErrorHandler.js`
- Messages d'erreur conviviaux
- Intégration Sentry
- Logs diagnostics

---

## 🎯 Plan d'action

### Étape 1 : Créer `src/api/analytics.js`

- [ ] Fonction `getAnalytics(userId, options)`
- Utilise `withErrorHandling()`
- Remplace les appels directs dans `analyticsStore.js`

### Étape 2 : Auditer `reportsStore.js`

- [ ] Vérifier les appels Supabase
- [ ] Créer `src/api/reports.js` si nécessaire
- [ ] Migrer les appels

### Étape 3 : Auditer `alertsStore.js`

- [ ] Vérifier les appels Supabase
- [ ] Créer `src/api/alerts.js` si nécessaire
- [ ] Migrer les appels

### Étape 4 : Implémenter Circuit Breaker

- [ ] Créer `utils/circuitBreaker.js`
- [ ] Intégrer dans `withErrorHandling()`
- [ ] Activer mode dégradé après X erreurs consécutives

---

**Statut** : 🔍 Audit en cours  
**Prochaine action** : Créer `src/api/analytics.js` et migrer `analyticsStore.js`
