# 🔒 Correction CSP — Doogoo v0.2.2+

**Date** : 2025-01-28  
**Problème** : Erreurs CSP bloquant Google Fonts, workers blob et Realtime WebSocket

---

## ❌ Erreurs initiales

### 1. **Google Fonts bloquées**

```
Refused to connect to 'https://fonts.googleapis.com/css2?family=Inter...'
because it violates CSP directive: "connect-src 'self' https://*.supabase.co ..."
```

**Cause** : Workbox tente de fetch les CSS de polices, mais `fonts.googleapis.com` n'est pas dans `connect-src`.

### 2. **Workers blob bloqués**

```
Refused to create a worker from 'blob:...'
because CSP directive: "script-src ..." Note that 'worker-src' was not explicitly set
```

**Cause** : `worker-src` manquant, fallback sur `script-src` qui ne permet pas `blob:`.

### 3. **Realtime WebSocket bloqué**

```
❌ Realtime error for properties
❌ Realtime error for payments
```

**Cause** : WebSocket (`wss://`) non autorisé dans `connect-src`.

---

## ✅ Solution implémentée

### CSP corrigée dans `vercel.json`

```json
{
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co ... blob:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data: https:; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' " +
      "https://*.supabase.co " +
      "https://*.supabase.io " +
      "wss://*.supabase.co " +
      "wss://*.supabase.io " +
      "https://fonts.googleapis.com " +
      "https://fonts.gstatic.com " +
      "https://www.google-analytics.com " +
      "https://plausible.io; " +
    "worker-src 'self' blob:; " +
    "frame-src 'none'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
}
```

---

## 📋 Changements détaillés

### `connect-src`

- ✅ `https://fonts.googleapis.com` (Workbox fetch CSS)
- ✅ `https://fonts.gstatic.com` (Workbox fetch fonts)
- ✅ `wss://*.supabase.co` (Realtime WebSocket)
- ✅ `wss://*.supabase.io` (Realtime WebSocket alternatif)
- ✅ `https://*.supabase.io` (API Supabase alternatif)

### `font-src`

- ✅ `https:` (Autorise toutes les polices externes, nécessaire pour certaines extensions)

### `worker-src`

- ✅ `'self' blob:` (Déjà présent, permet workers blob)

### `script-src`

- ✅ `blob:` (Fallback si `worker-src` non supporté)

---

## 🧪 Vérification

### Après déploiement Vercel

1. **Google Fonts** : Plus d'erreur "Refused to connect"
2. **Workers** : Plus d'erreur "Refused to create worker from blob"
3. **Realtime** : Plus d'erreur "Realtime error" (WebSocket connecté)

### Commandes de vérification

```bash
# Vérifier les headers CSP en production
curl -I https://doogoo.vercel.app | grep -i "content-security-policy"
```

### Console Browser

- ✅ Plus d'erreurs CSP rouges
- ✅ Fonts chargent correctement
- ✅ Service Worker actif
- ✅ Realtime connecté

---

## 📝 Notes

- Les erreurs `chrome-extension://...` sont **normales** et proviennent d'extensions Chrome (ex: 1Password, gestionnaires de mots de passe). Elles ne concernent pas notre application.
- Le déploiement Vercel peut prendre quelques minutes pour propager les nouveaux headers.
- Tester en navigation privée sans extensions pour voir uniquement les erreurs de l'application.

---

**Statut** : ✅ CSP corrigée  
**Déploiement** : En attente de redéploiement Vercel
