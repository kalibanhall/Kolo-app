# Configuration PayDRC sur Render

## Problème Identifié

Le problème principal était que **les variables d'environnement PayDRC n'étaient pas configurées** dans le fichier `.env` du serveur, ce qui empêchait complètement l'initiation des paiements.

## Corrections Apportées

### 1. ✅ Variables d'environnement ajoutées au fichier .env

Les variables suivantes ont été ajoutées au fichier `server/.env`:

```env
# PayDRC (MOKO Afrika) - Mobile Money Payment Gateway
PAYDRC_BASE_URL=https://paydrc.gofreshbakery.net/api/v5/
PAYDRC_MERCHANT_ID=j*zL/#%lkq(EbSNhb
PAYDRC_MERCHANT_SECRET=mn2E8SD6QEiEY
PAYDRC_CALLBACK_URL=https://kolo-api.onrender.com/api/payments/paydrc/callback
```

### 2. ✅ Validation de configuration ajoutée

Le service PayDRC vérifie maintenant au démarrage que toutes les variables requises sont présentes et affiche des messages d'erreur clairs si elles manquent.

### 3. ✅ Amélioration des messages d'erreur

- Le frontend affiche maintenant des messages d'erreur plus détaillés
- Les logs console permettent un meilleur debugging
- Les erreurs de configuration sont détectées et signalées

## Configuration sur Render

### Variables d'environnement à ajouter sur Render

Allez sur le dashboard Render > Votre service > Environment et ajoutez ces variables:

```
PAYDRC_BASE_URL=https://paydrc.gofreshbakery.net/api/v5/
PAYDRC_MERCHANT_ID=j*zL/#%lkq(EbSNhb
PAYDRC_MERCHANT_SECRET=mn2E8SD6QEiEY
PAYDRC_CALLBACK_URL=https://kolo-api.onrender.com/api/payments/paydrc/callback
```

**Note importante:** Ces identifiants semblent être des identifiants de test/développement. Pour la production, vous devrez:
1. Contacter PayDRC (MOKO Afrika) pour obtenir vos identifiants de production
2. Faire whitelister l'IP de votre serveur Render
3. Obtenir les clés de chiffrement AES pour les callbacks (optionnel mais recommandé)

### URLs de Callback

L'URL de callback doit être accessible publiquement par PayDRC. Actuellement configurée:
- **Production:** `https://kolo-api.onrender.com/api/payments/paydrc/callback`
- **Développement:** `http://localhost:5000/api/payments/paydrc/callback`

Cette URL doit également être enregistrée dans votre compte PayDRC.

## Whitelist des IPs Render

Selon votre rapport, vous avez déjà whitelisté les IPs de Render. Si le problème persiste, vérifiez:

1. **IPs sortantes de Render** - Elles changent selon le plan:
   - Free tier: IPs partagées (peuvent changer)
   - Paid tier: IPs statiques disponibles

2. **Vérifier les IPs actuelles:**
   ```bash
   curl https://api.ipify.org
   ```
   Exécutez cette commande depuis un script sur Render pour obtenir l'IP sortante actuelle.

3. **Contacter PayDRC** pour confirmer que les bonnes IPs sont whitelistées

## Utilisation d'un Proxy (si nécessaire)

Si les IPs de Render changent trop souvent, envisagez d'utiliser un service proxy avec IP fixe:

### Option 1: QuotaGuard (Recommandé pour Render)

1. Créez un compte sur [QuotaGuard](https://www.quotaguard.com/)
2. Ajoutez la variable d'environnement sur Render:
   ```
   QUOTAGUARD_URL=http://username:password@proxy.quotaguard.com:1080
   ```
3. Le service PayDRC détectera automatiquement et utilisera le proxy

### Option 2: Fixie

1. Créez un compte sur [Fixie](https://usefixie.com/)
2. Ajoutez la variable:
   ```
   FIXIE_URL=http://username:password@proxy.usefixie.com:80
   ```

## Test de la Configuration

### 1. Vérifier les logs au démarrage

Après le déploiement, vérifiez les logs Render. Vous devriez voir:

```
🔧 PayDRC Configuration:
  - Base URL: https://paydrc.gofreshbakery.net/api/v5/
  - Merchant ID: j*zL/...
  - Merchant Secret: ✅ Set
  - AES Key: ⚠️ Not set (callbacks won't decrypt)
  - Proxy URL: ❌ Not set (direct connection)
```

Si vous voyez des "❌ NOT SET" pour MERCHANT_ID ou MERCHANT_SECRET, la configuration n'est pas correcte.

### 2. Test de paiement

1. Connectez-vous sur l'application
2. Essayez d'acheter un ticket avec Mobile Money
3. Vérifiez les logs pour voir la requête PayDRC et la réponse
4. Vous devriez recevoir un prompt de paiement sur votre téléphone

### 3. Vérifier les callbacks

Les callbacks PayDRC seront reçus à l'endpoint:
```
POST /api/payments/paydrc/callback
```

Vérifiez les logs pour confirmer la réception des callbacks après validation du paiement.

## Providers Supportés

Le système détecte automatiquement le provider mobile money selon le préfixe:

- **Vodacom:** 081, 082, 083
- **Airtel:** 097, 099
- **Orange:** 084, 085, 089
- **Africell:** 090, 091

Le numéro de téléphone est normalisé automatiquement (format: 0xxxxxxxxx).

## Dépannage

### Erreur: "MERCHANT_ID or MERCHANT_SECRET not configured"

**Solution:** Ajoutez les variables sur Render et redéployez.

### Erreur: "Proxy connection timeout"

**Solution:** Vérifiez l'URL du proxy ou désactivez-le en supprimant la variable QUOTAGUARD_URL/FIXIE_URL.

### Erreur: "Request timeout"

**Causes possibles:**
1. L'API PayDRC est hors service
2. Les IPs ne sont pas whitelistées
3. Problème réseau

**Solution:** Vérifiez les logs PayDRC et contactez leur support.

### Pas de prompt de paiement sur le téléphone

**Causes possibles:**
1. Numéro de téléphone invalide ou mal formaté
2. Provider mobile money mal détecté
3. Compte mobile money insuffisant ou bloqué
4. Transaction rejetée par PayDRC

**Solution:** Vérifiez les logs pour voir la réponse de PayDRC.

## Support PayDRC

- **Site web:** https://paydrc.gofreshbakery.net
- **Documentation API:** https://paydrc.gofreshbakery.net/api/v5/
- **Email support:** (à obtenir de leur site)

## Prochaines Étapes

1. ✅ Tester en local avec les nouvelles variables
2. ⏳ Déployer sur Render avec les variables d'environnement
3. ⏳ Tester un paiement réel en production
4. ⏳ Obtenir les identifiants de production PayDRC
5. ⏳ Configurer les clés AES pour sécuriser les callbacks
6. ⏳ Mettre en place un monitoring des transactions

## Sécurité

⚠️ **IMPORTANT:** Les identifiants PayDRC dans ce document sont des identifiants de test. Ne les partagez pas publiquement. Pour la production:

1. Utilisez des identifiants de production PayDRC
2. Ne commitez jamais le fichier `.env` dans Git
3. Ajoutez `.env` au `.gitignore`
4. Utilisez les variables d'environnement Render uniquement
5. Activez le chiffrement AES pour les callbacks

---

**Date de mise à jour:** 11 janvier 2026  
**Auteur:** GitHub Copilot
