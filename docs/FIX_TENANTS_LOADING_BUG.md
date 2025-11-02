# 🐛 Correction Bug Chargement Infini — LocatairesPage

**Date** : 2025-11-02  
**Statut** : ✅ Corrigé

---

## 🔍 Problème identifié

**Symptôme :**

- La page `/locataires` affiche en permanence "Chargement des locataires..."
- Aucun locataire ne se charge
- La vue reste vide malgré les données potentiellement disponibles

**Cause racine :**

1. **`loading` reste bloqué à `true`**
   - Si `fetchProperties()` lance une exception non catchée, `loading.value = false` n'est jamais exécuté
   - Si l'utilisateur n'est pas authentifié, `loading` n'est pas remis à `false`
   - Si le cache est utilisé, `loading` reste à sa valeur précédente

2. **Condition d'affichage incorrecte**
   - La condition `v-if="propertiesStore.loading && tenants.length === 0"` bloque l'affichage même si `loading` est `false`
   - Si `tenants.length === 0` mais que `loading` est `false`, rien ne s'affiche (ni loader, ni liste, ni état vide)

3. **Pas de gestion d'erreur visible**
   - Si `fetchProperties()` échoue, l'erreur est stockée dans `error.value` mais jamais affichée à l'utilisateur

---

## ✅ Correctifs appliqués

### 1. Protection `fetchProperties()` avec try/catch/finally

**Avant :**

```js
loading.value = true
error.value = null

const result = await propertiesApi.getProperties(authStore.user.id)
// ... traitement ...
loading.value = false // ❌ Pas exécuté si exception
```

**Après :**

```js
loading.value = true
error.value = null

try {
  const result = await propertiesApi.getProperties(authStore.user.id)
  // ... traitement ...
} catch (err) {
  // Gestion d'erreur pour éviter que loading reste bloqué
  console.error('Erreur lors du chargement des propriétés:', err)
  error.value = err.message || 'Erreur lors de la récupération des biens'

  // Si erreur et qu'on a des données en cache, on continue avec le cache
  if (properties.value.length > 0) {
    const { useToastStore } = await import('@/stores/toastStore')
    const toastStore = useToastStore()
    if (toastStore) {
      toastStore.warning('⚠️ Erreur de chargement, données en cache affichées')
    }
  }
} finally {
  // ✅ Garantit que loading est toujours remis à false, même en cas d'erreur
  loading.value = false
}
```

### 2. Réinitialisation `loading` dans tous les cas de sortie

**Ajouté :**

```js
if (!authStore.user) {
  console.warn('fetchProperties: User not authenticated, skipping fetch')
  loading.value = false // ✅ Assure que loading est false
  return
}

if (!force && now - lastFetchTime < FETCH_CACHE_MS && properties.value.length > 0) {
  loading.value = false // ✅ Assure que loading est false si cache utilisé
  return
}
```

### 3. Amélioration condition d'affichage

**Avant :**

```vue
<div v-if="propertiesStore.loading && tenants.length === 0">
  <!-- Chargement... -->
</div>

<TenantsList v-else :tenants="filteredTenants" />
<!-- ❌ Si loading=false et tenants.length=0, rien ne s'affiche -->
```

**Après :**

```vue
<!-- État de chargement initial -->
<div v-if="propertiesStore.loading && propertiesStore.properties.length === 0">
  <!-- Chargement... -->
</div>

<!-- Erreur -->
<div v-else-if="propertiesStore.error && tenants.length === 0">
  <!-- ✅ Erreur visible à l'utilisateur -->
</div>

<!-- Loader inline si données déjà chargées -->
<div v-else-if="propertiesStore.loading">
  <InlineLoader />
</div>

<!-- Liste des locataires -->
<TenantsList v-else :tenants="filteredTenants" ... />
<!-- ✅ S'affiche même si tenants.length=0 (affichera l'état vide du composant) -->
```

---

## 🔍 Causes techniques possibles

### 1. Exception non catchée

**Scénario :**

- `propertiesApi.getProperties()` lance une exception (timeout, CORS, réseau)
- `loading.value = false` n'est jamais exécuté
- L'utilisateur voit un loader infini

**Solution :** ✅ try/catch/finally ajouté

---

### 2. Utilisateur non authentifié

**Scénario :**

- L'utilisateur accède à `/locataires` avant que la session soit initialisée
- `fetchProperties()` retourne immédiatement sans mettre `loading = false`
- Si `loading` était à `true`, il reste bloqué

**Solution :** ✅ `loading.value = false` ajouté dans le guard

---

### 3. Cache utilisé

**Scénario :**

- `fetchProperties()` retourne immédiatement car le cache est utilisé (moins de 5 secondes)
- `loading` reste à sa valeur précédente (peut être `true`)

**Solution :** ✅ `loading.value = false` ajouté lors de l'utilisation du cache

---

### 4. Condition d'affichage incorrecte

**Scénario :**

- `propertiesStore.loading = false`
- `tenants.length = 0` (aucun locataire ou données pas encore chargées)
- Condition `v-if="loading && tenants.length === 0"` = `false`
- Condition `v-else-if="loading"` = `false`
- `v-else` de `TenantsList` s'affiche avec `tenants=[]`, ce qui affiche l'état vide ✅

**Mais :** Si `loading` était `true` et que `tenants.length = 0`, le loader reste affiché indéfiniment.

**Solution :** ✅ Condition changée pour vérifier `propertiesStore.properties.length === 0` au lieu de `tenants.length === 0`

---

## 📊 Tests à effectuer

### 1. Test chargement normal

1. Ouvrir `/locataires`
2. **Attendu :** Loader s'affiche brièvement puis la liste (ou état vide si aucun locataire)
3. **Attendu :** Plus de loader infini

### 2. Test avec erreur réseau

1. Désactiver le réseau (DevTools → Network → Offline)
2. Recharger `/locataires`
3. **Attendu :** Erreur visible avec message clair
4. **Attendu :** Plus de loader infini

### 3. Test état vide

1. Supprimer tous les locataires (ou utiliser un compte sans locataire)
2. Ouvrir `/locataires`
3. **Attendu :** Message "Aucun locataire trouvé" affiché
4. **Attendu :** Plus de loader infini

### 4. Test utilisateur non authentifié

1. Se déconnecter
2. Essayer d'accéder directement à `/locataires` (si route protégée, redirection attendue)
3. **Attendu :** Pas de loader bloqué

---

## ✅ Résultat attendu

Après déploiement :

- ✅ Plus de loader infini sur `/locataires`
- ✅ Erreurs affichées clairement à l'utilisateur
- ✅ État vide correctement géré
- ✅ Locataires s'affichent normalement une fois chargés
- ✅ Gestion robuste des cas d'erreur (réseau, timeout, etc.)

---

## 📝 Fichiers modifiés

1. **`src/stores/propertiesStore.js`**
   - Ajout try/catch/finally dans `fetchProperties()`
   - Ajout `loading.value = false` dans tous les cas de sortie
   - Amélioration gestion d'erreur avec fallback sur cache

2. **`src/pages/LocatairesPage.vue`**
   - Correction condition d'affichage (vérifier `properties.length` au lieu de `tenants.length`)
   - Ajout affichage d'erreur visible
   - Amélioration gestion des états (loading, erreur, vide)

---

## 🔗 Références

- [Rapport audit 360°](docs/AUDIT_360_DOOGOO_2025-11-02.md)
- [Documentation API Layer](docs/refactor/ARCHITECTURE_NEW.md)
