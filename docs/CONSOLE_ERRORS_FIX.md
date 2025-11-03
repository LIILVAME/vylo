# 🔧 Correction des Erreurs Console - Doogoo

**Date** : 2025-01-02  
**Statut** : ✅ **Corrections appliquées**

---

## 📊 Analyse des Erreurs

### 1. ✅ CSP Violation - Vercel Live (Corrigé)

**Erreur** :

```
Refused to load the script 'https://vercel.live/_next-live/feedback/feedback.js'
because it violates the following Content Security Policy directive: "script-src ..."
```

**Cause** : Vercel Live (outil de développement/preview) tente de charger un script de feedback, mais la CSP ne l'autorise pas.

**Solution** : Ajout de `https://vercel.live` dans :

- `script-src` : Pour autoriser les scripts Vercel Live
- `connect-src` : Pour autoriser les connexions WebSocket Vercel Live

**Fichier modifié** : `vercel.json`

---

### 2. ✅ Meta Tag Déprécié (Corrigé)

**Avertissement** :

```
<meta name="apple-mobile-web-app-capable" content="yes"> is deprecated.
Please include <meta name="mobile-web-app-capable" content="yes">
```

**Cause** : Le standard `apple-mobile-web-app-capable` est déprécié au profit du standard `mobile-web-app-capable`.

**Solution** : Ajout du meta tag moderne `mobile-web-app-capable` tout en gardant `apple-mobile-web-app-capable` pour la compatibilité iOS.

**Fichier modifié** : `index.html`

---

### 3. ⚠️ Erreurs "Untrusted event" (Non corrigeable)

**Erreur** :

```
Uncaught Error: Untrusted event
at ocn.ensureTrustedEvent (content.js:2523:3960)
```

**Cause** : Ces erreurs proviennent d'**extensions de navigateur** (gestionnaires de mots de passe, autofill, etc.) qui tentent de simuler des événements clavier. Les navigateurs modernes rejettent ces événements synthétiques pour des raisons de sécurité.

**Exemples d'extensions concernées** :

- Gestionnaires de mots de passe (1Password, LastPass, Bitwarden, etc.)
- Extensions d'autofill
- Extensions de sécurité

**Action** : ✅ **Aucune action nécessaire** - Ce n'est pas notre code.

**Note** : Ces erreurs n'affectent pas le fonctionnement de l'application. Pour les voir disparaître, tester en navigation privée sans extensions.

---

## ✅ Corrections Appliquées

### 1. CSP mise à jour (`vercel.json`)

```json
{
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
      "https://*.supabase.co " +
      "https://www.googletagmanager.com " +
      "https://www.google-analytics.com " +
      "https://plausible.io " +
      "https://vercel.live " +  // ✅ Ajouté
      "blob:; " +
    "..."
}
```

### 2. Meta tags PWA (`index.html`)

```html
<!-- Standard moderne (recommandé) -->
<meta name="mobile-web-app-capable" content="yes" />
<!-- iOS (pour compatibilité, mais déprécié) -->
<meta name="apple-mobile-web-app-capable" content="yes" />
```

---

## 🧪 Vérification

### Après déploiement

1. **CSP Vercel Live** : Plus d'erreur "Refused to load script"
2. **Meta tag** : Plus d'avertissement de dépréciation
3. **Erreurs extensions** : Toujours présentes (normal, non bloquantes)

### Commandes de vérification

```bash
# Vérifier les headers CSP en production
curl -I https://doogoo.vercel.app | grep -i "content-security-policy"
```

---

## 📝 Notes

### Erreurs d'extensions

Les erreurs `content.js` et `Untrusted event` sont **normales** et proviennent d'extensions Chrome. Elles ne peuvent pas être corrigées dans notre code car :

1. Elles sont générées par des extensions tierces
2. Les navigateurs rejettent intentionnellement ces événements pour la sécurité
3. Elles n'affectent pas le fonctionnement de l'application

**Recommandation** : Tester en navigation privée sans extensions pour voir uniquement les erreurs de l'application.

### Vercel Live

Le script `vercel.live` est utilisé uniquement dans les **preview deployments** de Vercel. En production, il ne devrait pas être chargé.

**Note** : Si vous ne souhaitez pas autoriser Vercel Live, vous pouvez retirer `https://vercel.live` de la CSP. Cela ne bloquera que les fonctionnalités de feedback dans les previews.

---

## 🚀 Prochaines Étapes

1. ✅ **CSP corrigée** - Vercel Live autorisé
2. ✅ **Meta tag mis à jour** - Standard moderne + compatibilité iOS
3. ⚠️ **Erreurs extensions** - Documentées (non corrigeables)

**Déploiement** : Les changements seront actifs après le prochain redéploiement Vercel.

---

---

## 🔄 Erreurs Additionnelles (2025-01-02 - Suite)

### 4. ✅ CSP frame-src - Vercel Live (Corrigé)

**Erreur** :

```
Refused to frame 'https://vercel.live/' because it violates the following
Content Security Policy directive: "frame-src 'none'".
```

**Cause** : Vercel Live (outil de preview/feedback) tente de s'afficher dans un iframe, mais `frame-src 'none'` bloque tous les iframes.

**Solution** : Modification de `frame-src 'none'` en `frame-src 'self' https://vercel.live` pour :

- Permettre les iframes de notre propre domaine (`'self'`)
- Permettre Vercel Live uniquement pour les previews (`https://vercel.live`)

**Note** : En production, Vercel Live ne devrait pas être chargé, donc cette modification n'affecte que les previews.

**Fichier modifié** : `vercel.json`

---

### 5. ✅ 404 favicon.ico (Corrigé)

**Erreur** :

```
Failed to load resource: the server responded with a status of 404 ()
```

**Cause** : VitePWA référençait `favicon.ico` dans `includeAssets`, mais le fichier n'existe pas dans `public/`. Les navigateurs chargent automatiquement `/favicon.ico` par défaut.

**Solution** : Suppression de `'favicon.ico'` de `includeAssets` dans `vite.config.js`. Les icônes PWA dans `/icons/` sont déjà correctement référencées dans `index.html`.

**Fichier modifié** : `vite.config.js`

---

### 6. ⚠️ Erreur Listener Asynchrone (Non corrigeable)

**Erreur** :

```
Uncaught (in promise) Error: A listener indicated an asynchronous response
by returning true, but the message channel closed before a response was received
```

**Cause** : Cette erreur provient d'**extensions de navigateur** (gestionnaires de mots de passe, autofill, etc.) qui utilisent des messages asynchrones avec l'API Chrome Extension. Elle se produit quand :

- L'extension envoie un message et attend une réponse asynchrone
- Le message channel se ferme avant que la réponse soit reçue

**Exemples d'extensions concernées** :

- Gestionnaires de mots de passe (1Password, LastPass, Bitwarden, etc.)
- Extensions d'autofill
- Extensions de sécurité

**Action** : ✅ **Aucune action nécessaire** - Ce n'est pas notre code.

**Note** : Ces erreurs n'affectent pas le fonctionnement de l'application. Pour les voir disparaître, tester en navigation privée sans extensions.

---

---

## 🔄 Erreurs Additionnelles (2025-01-02 - Suite 2)

### 7. ✅ CSP connect-src - Unsplash Images (Corrigé)

**Erreur** :

```
Refused to connect to 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80'
because it violates the following Content Security Policy directive: "connect-src ..."
```

**Cause** : Workbox (Service Worker) tente de charger les images Unsplash via `fetch()` pour les mettre en cache, mais `images.unsplash.com` n'est pas autorisé dans `connect-src`. Les images Unsplash sont utilisées dans :

- `LandingPage.vue` (hero image, dashboard preview)
- `propertiesStore.js` (images par défaut pour les propriétés)
- Workbox runtime caching (stratégie `CacheFirst`)

**Solution** : Ajout de `https://images.unsplash.com` dans `connect-src` pour permettre à Workbox de fetch les images pour le cache.

**Fichier modifié** : `vercel.json`

**Note** : `img-src` autorise déjà `https:` (donc toutes les images externes), mais `connect-src` est nécessaire pour les requêtes `fetch()` effectuées par Workbox.

---

**Dernière mise à jour** : 2025-01-02
