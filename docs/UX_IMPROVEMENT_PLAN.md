# 🎨 Plan d'Amélioration UX — Doogoo v2025

**Date** : 3 novembre 2025  
**Basé sur** : UX Review complet  
**Statut** : 🎉 **Phase 1 + 2 COMPLÉTÉES — Priorités HAUTE et MOYENNE 100% implémentées**

**✅ Phase 1 (Priorité HAUTE) - COMPLÉTÉE** :

- ✅ Loading states sur toutes les suppressions
- ✅ ConfirmModal amélioré avec spinner
- ✅ Composable `useSafeDelete` créé pour standardisation future
- ✅ Loading states sur tous les formulaires (Add/Edit modales)

**✅ Phase 2 (Priorité MOYENNE) - COMPLÉTÉE** :

- ✅ Transitions douces sur cartes et boutons
- ✅ Micro-interactions enrichies (hover, active, focus, scale)
- ✅ Système d'onboarding progressif avec tooltips contextuels
- ✅ Guide adaptatif selon données disponibles

**✅ Phase 2 (Priorité MOYENNE) - COMPLÉTÉE** :

- ✅ Système d'onboarding progressif
- ✅ Tooltips contextuels (intégrés dans onboarding)

---

## 📊 État Actuel vs Recommandations

### ✅ Déjà Implémenté (Points Forts)

| Fonctionnalité                   | État          | Localisation                                                                              |
| -------------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| **Confirmations de suppression** | ✅ Implémenté | `ConfirmModal.vue`, utilisé dans DashboardPage, BiensPage, LocatairesPage, PaymentActions |
| **États de chargement**          | ✅ Partiel    | `LoadingOverlay.vue`, `InlineLoader.vue`, `SkeletonCard.vue` existent                     |
| **Feedback visuel**              | ✅ Bon        | Messages de succès/erreur via `toastStore`                                                |
| **Navigation**                   | ✅ Excellente | Navigation SPA fluide, pas de rechargement                                                |
| **Statuts visuels**              | ✅ Clairs     | Badges couleur (occupé/vacant, à jour/en retard)                                          |
| **États vides**                  | ✅ Partiel    | `EmptyState.vue` existe mais peut être amélioré                                           |

---

## 🔴 Priorité HAUTE — À Implémenter

### 1. 🔐 Confirmation Avant TOUTES les Suppressions

**Problème identifié** : Certaines suppressions peuvent ne pas avoir de confirmation systématique.

**Actions** :

- ✅ Audit complet : Vérifier que TOUTES les suppressions utilisent `ConfirmModal`
- 🔍 Points à vérifier :
  - Suppression de locataire depuis TenantCard
  - Suppression depuis les menus contextuels
  - Actions batch (suppression multiple)

**Fichiers à auditer** :

```bash
src/pages/DashboardPage.vue       # ✅ Utilise ConfirmModal
src/pages/BiensPage.vue           # ✅ Utilise ConfirmModal
src/pages/LocatairesPage.vue      # ✅ Utilise ConfirmModal
src/components/payments/PaymentActions.vue  # ✅ Utilise ConfirmModal
```

**Recommandation** : Créer un composable `useSafeDelete` pour standardiser toutes les suppressions.

---

### 2. ⏳ États de Chargement Visibles

**Problème identifié** : Absence de spinner ou indicateur pendant certaines actions (suppression, sauvegarde).

**Actions** :

- Ajouter `InlineLoader` ou spinner pendant :
  - Suppression de biens/locataires/paiements
  - Sauvegarde de formulaires
  - Génération de rapports/PDF
- Utiliser `SkeletonCard` pendant le chargement initial des listes

**Composants existants à utiliser** :

- `LoadingOverlay.vue` : Overlay plein écran
- `InlineLoader.vue` : Spinner inline
- `SkeletonCard.vue` : Skeleton pour les cartes

**Exemple d'implémentation** :

```vue
<!-- Pendant la suppression -->
<button @click="handleDelete" :disabled="isDeleting">
  <InlineLoader v-if="isDeleting" />
  <span v-else>Supprimer</span>
</button>
```

---

## 🟡 Priorité MOYENNE — À Améliorer

### 3. ✨ Micro-interactions et Transitions

**Problème identifié** : Application fonctionnelle mais peu "vivante", manque de feedback tactile.

**Actions** :

- Ajouter des transitions douces sur :
  - Cartes (hover, clic)
  - Boutons (hover, active, focus)
  - Modales (entrée/sortie)
  - Listes (ajout/suppression d'éléments)
- Micro-animations :
  - Success checkmark après action
  - Bounce léger sur les boutons CTA
  - Shimmer sur les éléments chargés

**Classes Tailwind à utiliser** :

```css
transition-all duration-200
hover:scale-105
active:scale-95
transform hover:-translate-y-0.5
```

**Composants à enrichir** :

- `PropertyCard.vue`
- `TenantCard.vue`
- `PaymentActions.vue`
- Modales (AddPropertyModal, EditPropertyModal)

---

### 4. 📚 Aide Contextuelle et Onboarding Progressif

**Problème identifié** : Absence de tutoriel ou d'aide pour découvrir les fonctions avancées.

**Actions** :

- Créer un système d'onboarding progressif :
  - Tooltips contextuels sur première visite
  - Guide pas-à-pas pour nouveaux utilisateurs
  - Icône "?" pour aide contextuelle
- Bibliothèque recommandée : `@shepherdjs/core` ou `vue-tour`

**Fonctionnalités à expliquer** :

1. Ajout du premier bien
2. Ajout du premier locataire
3. Création d'un paiement
4. Export de rapport
5. Configuration des alertes

**Fichier à créer** :

```
src/composables/useOnboarding.js
src/components/onboarding/OnboardingTooltip.vue
src/components/onboarding/OnboardingGuide.vue
```

---

## 🟢 Priorité BASSE — Améliorations Futures

### 5. 🎯 États Vides Engageants

**Problème identifié** : `EmptyState` existe mais pourrait être plus engageant.

**Actions** :

- Ajouter des CTAs clairs dans les états vides
- Illustrations plus attrayantes
- Messages plus encourageants ("Commencez par ajouter votre premier bien")

**Fichier à améliorer** :

- `src/components/common/EmptyState.vue`

**Exemple** :

```vue
<EmptyState
  title="Aucun bien enregistré"
  description="Commencez par ajouter votre premier bien immobilier"
>
  <template #actions>
    <button @click="$emit('add')" class="btn-primary">
      Ajouter mon premier bien
    </button>
  </template>
</EmptyState>
```

---

### 6. ♿ Accessibilité Renforcée

**Problème identifié** : Peu d'éléments d'accessibilité (ARIA, focus management, raccourcis clavier).

**Actions** :

- Ajouter attributs ARIA :
  - `aria-label` sur les boutons icon-only
  - `role="dialog"` sur les modales
  - `aria-live="polite"` pour les notifications
- Gestion du focus :
  - Trap focus dans les modales
  - Focus visible sur tous les éléments interactifs
  - Navigation clavier complète
- Raccourcis clavier :
  - `Ctrl+K` ou `/` : Recherche globale
  - `Escape` : Fermer modale/menu
  - `Enter` : Confirmer action

**Fichiers à améliorer** :

- Tous les composants avec interactions
- Modales (focus trap)
- Menus contextuels (navigation clavier)

---

### 7. 🎨 Personnalisation d'Affichage

**Problème identifié** : Aucune personnalisation d'affichage (colonnes, filtres, préférences).

**Actions** :

- Ajouter possibilité de :
  - Masquer/afficher colonnes dans les tableaux
  - Sauvegarder préférences de filtres
  - Personnaliser l'ordre des sections du dashboard
- Stocker dans `localStorage` via `settingsStore`

**Fichiers à créer/modifier** :

```
src/composables/useTablePreferences.js
src/components/common/ColumnSelector.vue
src/stores/tablePreferencesStore.js (ou extension de settingsStore)
```

---

## 📋 Checklist d'Implémentation

### Phase 1 : Protection Utilisateur (Priorité HAUTE)

- [x] Audit complet des suppressions (vérifier toutes utilisent ConfirmModal) ✅
- [x] Créer composable `useSafeDelete` pour standardiser ✅
- [x] Ajouter loading states sur toutes les actions destructives ✅
- [x] Ajouter loading states sur les formulaires (sauvegarde) ✅

### Phase 2 : Feedback et Fluidité (Priorité MOYENNE)

- [x] Ajouter transitions sur cartes et boutons ✅
- [x] Enrichir micro-interactions (hover, active, focus) ✅
- [x] Créer système d'onboarding progressif ✅
- [x] Ajouter tooltips contextuels ✅

### Phase 3 : Confort et Accessibilité (Priorité BASSE)

- [ ] Améliorer EmptyState avec CTAs engageants
- [ ] Renforcer accessibilité (ARIA, focus management)
- [ ] Ajouter raccourcis clavier
- [ ] Créer système de personnalisation d'affichage

---

## 🎯 Métriques de Succès

| Métrique                                 | Avant | Cible     | Mesure     |
| ---------------------------------------- | ----- | --------- | ---------- |
| Taux d'erreur utilisateur (suppressions) | ?     | < 2%      | Analytics  |
| Temps de découverte des fonctionnalités  | N/A   | < 5 min   | Onboarding |
| Score d'accessibilité (Lighthouse)       | ?     | > 95      | CI/CD      |
| Satisfaction utilisateur                 | Bon   | Excellent | Feedback   |

---

## 📝 Notes Techniques

**Stack recommandée pour onboarding** :

- Option 1 : `@shepherdjs/core` (léger, flexible)
- Option 2 : `vue-tour` (spécifique Vue 3)
- Option 3 : Custom avec `Teleport` et positions calculées

**Bibliothèques d'animation** :

- Tailwind CSS transitions (déjà utilisé) ✅
- CSS transitions natives (performant) ✅
- Éviter les libs lourdes (Framer Motion, GSAP) ❌

**Storage pour préférences** :

- `localStorage` via `settingsStore` (déjà utilisé) ✅
- Pas besoin de backend pour personnalisation simple ✅

---

## 🚀 Prochaines Étapes

1. **Immediate** : Auditer et compléter les confirmations de suppression
2. **Court terme** : Ajouter loading states sur toutes les actions
3. **Moyen terme** : Implémenter micro-interactions et onboarding
4. **Long terme** : Accessibilité et personnalisation

---

**Document vivant** : À mettre à jour après chaque implémentation ✅
