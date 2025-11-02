# 🔍 Debug CSP — Doogoo

**Problème** : Erreurs CSP persistent malgré la correction dans `vercel.json`

---

## ✅ CSP corrigée dans `vercel.json`

La CSP dans `vercel.json` inclut maintenant :

- ✅ `https://fonts.googleapis.com` dans `connect-src`
- ✅ `https://fonts.gstatic.com` dans `connect-src`
- ✅ `wss://*.supabase.co` dans `connect-src`
- ✅ `wss://*.supabase.io` dans `connect-src`
- ✅ `worker-src 'self' blob:`

---

## ⏳ Propagation Vercel

**Temps estimé** : 2-5 minutes après le push

### Vérification

1. **Attendre 2-5 minutes** après le commit
2. **Vérifier les headers en production** :
   ```bash
   curl -I https://doogoo.vercel.app | grep -i "content-security-policy"
   ```
3. **Si la CSP n'est pas mise à jour** :
   - Forcer un redéploiement via Vercel Dashboard
   - Ou faire un commit vide pour déclencher un rebuild

---

## 🧪 Erreurs normales (à ignorer)

Les erreurs `chrome-extension://...` sont **normales** et proviennent d'extensions Chrome :

- Gestionnaires de mots de passe (1Password, LastPass, etc.)
- Extensions de sécurité
- Auto-fill extensions

**Action** : ✅ **Aucune action nécessaire** - ce n'est pas notre code

---

## 🔄 Erreurs à corriger (après déploiement)

### 1. Google Fonts

```
Refused to connect to 'https://fonts.googleapis.com/css2?family=Inter...'
```

**Attendu après déploiement** : ✅ Plus d'erreur (Workbox peut fetch)

### 2. Workers blob

```
Refused to create a worker from 'blob:...'
```

**Attendu après déploiement** : ✅ Plus d'erreur (`worker-src blob:` configuré)

### 3. Realtime WebSocket

```
❌ Realtime error for properties
❌ Realtime error for payments
```

**Attendu après déploiement** : ✅ WebSocket connecté (`wss://*.supabase.co` autorisé)

---

## 🚀 Forcer un redéploiement

Si après 5 minutes la CSP n'est toujours pas mise à jour :

### Option 1 : Commit vide

```bash
git commit --allow-empty -m "chore: Force redeploy for CSP headers"
git push origin main
```

### Option 2 : Vercel Dashboard

1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet Doogoo
3. Cliquer sur "Redeploy" → "Use Existing Build" (ou forcer un nouveau build)

---

## 📋 Checklist après déploiement

- [ ] Plus d'erreur "Refused to connect to fonts.googleapis.com"
- [ ] Plus d'erreur "Refused to create worker from blob"
- [ ] Realtime connecté (plus d'erreur "Realtime error")
- [ ] Fonts chargent correctement
- [ ] Service Worker actif

---

**Statut** : ⏳ **En attente de propagation Vercel**  
**Action** : Attendre 2-5 minutes ou forcer un redéploiement
