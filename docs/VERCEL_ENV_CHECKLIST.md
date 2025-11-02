# ✅ Checklist Variables d'Environnement Vercel

## 📋 Statut Actuel

**Date de vérification :** 2025-11-02

### ✅ Variables Essentielles (Configurées)

| Variable                 | Status        | Description                |
| ------------------------ | ------------- | -------------------------- |
| `VITE_SUPABASE_URL`      | ✅ Configurée | URL de l'instance Supabase |
| `VITE_SUPABASE_ANON_KEY` | ✅ Configurée | Clé anonyme Supabase       |

**Résultat :** L'application **fonctionne correctement** avec ces variables.

---

## 🔧 Variables Optionnelles (Non configurées actuellement)

Ces variables sont **optionnelles** et l'application fonctionne sans elles. Elles activent des fonctionnalités supplémentaires :

### Analytics

| Variable                  | Valeur Exemple      | Description                 | Impact si absente              |
| ------------------------- | ------------------- | --------------------------- | ------------------------------ |
| `VITE_GA4_MEASUREMENT_ID` | `G-XXXXXXXXXX`      | ID Google Analytics 4       | Analytics GA4 désactivé        |
| `VITE_PLAUSIBLE_DOMAIN`   | `doogoo.vercel.app` | Domaine Plausible Analytics | Analytics Plausible désactivé  |
| `VITE_ENABLE_ANALYTICS`   | `true`              | Active/désactive analytics  | Analytics désactivé par défaut |

**Code de gestion :** Le code vérifie ces variables avant d'initialiser les analytics :

```javascript
// Dans src/main.js
if (import.meta.env.VITE_GA4_MEASUREMENT_ID) {
  initGoogleAnalytics()
}
if (import.meta.env.VITE_PLAUSIBLE_DOMAIN) {
  initPlausible()
}
```

### Autres Variables Optionnelles

| Variable           | Valeur Exemple              | Description                    |
| ------------------ | --------------------------- | ------------------------------ |
| `VITE_APP_NAME`    | `Doogoo`                    | Nom de l'application           |
| `VITE_ADMIN_EMAIL` | `admin@doogoo.com`          | Email administrateur           |
| `VITE_SENTRY_DSN`  | `https://...@sentry.io/...` | URL Sentry pour error tracking |

---

## 🚀 Configuration Recommandée

### Pour le Fonctionnement Actuel

✅ **Configuration minimale** (actuellement configurée) :

```
VITE_SUPABASE_URL        ✅
VITE_SUPABASE_ANON_KEY   ✅
```

➡️ **Résultat :** Application fonctionnelle à 100%.

### Pour Activer les Analytics (Optionnel)

Si vous souhaitez activer Google Analytics 4 :

1. Aller dans **Vercel Dashboard** → **Project Settings** → **Environment Variables**
2. Ajouter :
   ```
   VITE_GA4_MEASUREMENT_ID = G-XXXXXXXXXX
   ```
3. Sélectionner **Production** (ou toutes les branches)
4. Redéployer l'application

Pour Plausible Analytics :

1. Ajouter :
   ```
   VITE_PLAUSIBLE_DOMAIN = doogoo.vercel.app
   ```
2. Redéployer

---

## 📝 Comment Ajouter une Variable dans Vercel

1. **Aller dans Vercel Dashboard**
   - Sélectionner le projet `doogoo`
   - Aller dans **Settings** → **Environment Variables**

2. **Ajouter la variable**
   - Cliquer sur **Add New**
   - Saisir le nom (ex: `VITE_GA4_MEASUREMENT_ID`)
   - Saisir la valeur
   - Sélectionner les environnements :
     - ✅ **Production** : pour `main` branch
     - ✅ **Preview** : pour toutes les branches (PR)
     - ✅ **Development** : pour `develop` branch (si configuré)

3. **Sauvegarder**
   - Cliquer sur **Save**
   - **Important :** Redéployer l'application pour que la variable soit prise en compte

---

## 🔍 Vérification Locale

Pour tester les variables d'environnement en local :

1. Créer un fichier `.env.local` :

```bash
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

2. Lancer l'app :

```bash
npm run dev
```

3. Vérifier dans la console :

```javascript
console.log(import.meta.env.VITE_SUPABASE_URL) // Doit afficher votre URL
```

⚠️ **Attention :** Ne jamais commiter `.env.local` dans Git (déjà dans `.gitignore`).

---

## ✅ Checklist de Vérification

### Avant Chaque Release

- [ ] `VITE_SUPABASE_URL` configurée en production
- [ ] `VITE_SUPABASE_ANON_KEY` configurée en production
- [ ] Variables analytics (si utilisées) configurées
- [ ] Test de déploiement sur preview
- [ ] Vérification du build dans Vercel logs

### Après Ajout d'une Variable

- [ ] Variable ajoutée dans Vercel Dashboard
- [ ] Environnements sélectionnés (Production/Preview)
- [ ] Application redéployée
- [ ] Variable accessible dans l'app (vérifier console)
- [ ] Fonctionnalité associée fonctionne

---

## 📚 Documentation Liée

- `docs/VERCEL_INTEGRATION.md` : Guide complet d'intégration
- `docs/ANALYTICS_SETUP.md` : Configuration analytics détaillée
- `docs/VERSIONING_RELEASE.md` : Processus de release

---

**Dernière mise à jour :** 2025-11-02  
**Statut :** ✅ Configuration minimale opérationnelle
