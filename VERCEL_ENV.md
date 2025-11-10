# Variables d'environnement pour Vercel

Copiez ces variables dans **Vercel** → **Settings** → **Environment Variables**

## Variables requises

| Key | Value | Description |
|-----|-------|-------------|
| `VITE_API_URL` | `https://kolo-api.onrender.com/api` | URL de l'API backend (avec HTTPS) |
| `VITE_APP_NAME` | `KOLO Tombola` | Nom de l'application |

## Instructions

1. Allez sur [vercel.com](https://vercel.com)
2. Sélectionnez votre projet **kolo-app**
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez/modifiez les 2 variables ci-dessus
5. Sélectionnez **Production**, **Preview**, et **Development** pour chaque variable
6. Cliquez sur **Save**
7. Allez dans **Deployments** → Cliquez sur les `...` → **Redeploy**

## ⚠️ Important

- L'URL de l'API doit être en **HTTPS** (`https://` et non `http://`)
- Les variables doivent commencer par `VITE_` pour être accessibles dans le frontend Vite
- Après modification, vous devez **redéployer** pour que les changements prennent effet

## Vérification

Une fois déployé, vous pouvez vérifier que les variables sont correctes en ouvrant la console du navigateur sur votre site Vercel et en tapant :

```javascript
import.meta.env.VITE_API_URL
// Devrait afficher: "https://kolo-api.onrender.com/api"
```
