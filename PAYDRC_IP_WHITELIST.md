# Configuration PayDRC - IP Whitelisting

## Vue d'ensemble

PayDRC requiert la configuration d'**IP whitelisting** pour sécuriser les callbacks de paiement. Ils fourniront 1 ou 2 adresses IP fixes qui doivent être autorisées dans notre système.

## Configuration

### 1. Variables d'environnement

Ajoutez la variable suivante dans vos fichiers `.env` :

```env
# PayDRC IP Whitelist (comma-separated)
PAYDRC_WHITELISTED_IPS=xxx.xxx.xxx.xxx,yyy.yyy.yyy.yyy
```

**Exemple :**
```env
PAYDRC_WHITELISTED_IPS=41.243.10.15,41.243.10.16
```

### 2. Configuration Render.com

Dans le dashboard Render.com :

1. Allez dans **Environment**
2. Ajoutez la variable : `PAYDRC_WHITELISTED_IPS`
3. Valeur : Les IPs fournies par PayDRC (séparées par des virgules)
4. Cliquez sur **Save Changes**

### 3. Configuration Vercel

Dans le dashboard Vercel :

1. Allez dans **Settings** → **Environment Variables**
2. Ajoutez : `PAYDRC_WHITELISTED_IPS`
3. Valeur : Les IPs fournies par PayDRC
4. Environnements : Production, Preview, Development
5. Cliquez sur **Save**

## Obtenir les IPs de PayDRC

**Contactez PayDRC pour obtenir leurs IPs fixes :**

- Email support PayDRC
- Demandez : "Quelles sont les adresses IP sources de vos callbacks ?"
- Ils fourniront généralement 1 ou 2 IPs fixes

## Comment ça fonctionne

### Vérification IP

Le système vérifie automatiquement l'IP source de chaque callback PayDRC :

```javascript
// Extraction de l'IP réelle (gère les proxies/load balancers)
const requestIp = req.headers['x-forwarded-for'] || 
                  req.headers['x-real-ip'] || 
                  req.ip || 
                  req.connection.remoteAddress;

// Vérification contre la whitelist
const isValidIP = paydrc.verifyCallbackIP(requestIp);
```

### Gestion des erreurs

Si un callback provient d'une IP non autorisée :

- ❌ Callback rejeté avec erreur `403 Forbidden`
- 📝 Incident loggé dans `payment_webhooks` avec status `rejected_unauthorized_ip`
- 🔒 Transaction non traitée (sécurité)

## Comportement selon l'environnement

### Production (`NODE_ENV=production`)
- ✅ IP whitelist **OBLIGATOIRE**
- ❌ Rejette tous les callbacks d'IPs non whitelistées
- 🔒 Sécurité maximale

### Développement (`NODE_ENV=development`)
- ⚠️ IP whitelist **RECOMMANDÉE** mais non obligatoire
- ✅ Accepte tous les callbacks si `PAYDRC_WHITELISTED_IPS` n'est pas configuré
- 📝 Warning loggé si pas d'IPs configurées

## URLs de callback à fournir à PayDRC

Lorsque vous configurez votre compte PayDRC, fournissez ces URLs :

### Production
```
Tickets: https://votre-domaine.com/api/payments/paydrc/callback
Wallet:  https://votre-domaine.com/api/wallet/paydrc/callback
```

### Test/Staging
```
Tickets: https://votre-staging.onrender.com/api/payments/paydrc/callback
Wallet:  https://votre-staging.onrender.com/api/wallet/paydrc/callback
```

## Sécurité renforcée

### Format des IPs acceptés

Le système gère automatiquement :

- ✅ IPv4 standard : `192.168.1.1`
- ✅ IPv6 avec préfixe : `::ffff:192.168.1.1` → converti en `192.168.1.1`
- ✅ X-Forwarded-For multiple : `client, proxy1, proxy2` → utilise la première IP
- ✅ Load balancers et proxies inverses

### Logs de sécurité

Tous les callbacks sont loggés dans la table `payment_webhooks` :

```sql
SELECT * FROM payment_webhooks 
WHERE provider = 'PayDRC' 
AND status LIKE 'rejected_%' 
ORDER BY created_at DESC;
```

## Test de la configuration

### 1. Vérifier les variables d'environnement

```bash
# Backend
cd server
npm run dev

# Vérifier dans les logs au démarrage
# Vous devriez voir : "PayDRC whitelisted IPs: xxx.xxx.xxx.xxx, yyy.yyy.yyy.yyy"
```

### 2. Simuler un callback (développement uniquement)

```bash
curl -X POST http://localhost:5000/api/payments/paydrc/callback \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 41.243.10.15" \
  -d '{"data":"test_encrypted_data"}'
```

### 3. Vérifier les logs

```bash
# Callback autorisé
✅ IP 41.243.10.15 whitelisted
✅ IP verified - callback authenticated

# Callback rejeté
❌ IP 192.168.1.100 not in whitelist: [41.243.10.15, 41.243.10.16]
❌ PayDRC callback from unauthorized IP: 192.168.1.100
```

## Troubleshooting

### Problème : "IP not in whitelist"

**Solutions :**
1. Vérifiez que `PAYDRC_WHITELISTED_IPS` est bien configuré
2. Contactez PayDRC pour confirmer leurs IPs sources
3. Vérifiez les logs pour voir l'IP réelle reçue
4. Assurez-vous qu'il n'y a pas d'espaces dans la variable

### Problème : Callbacks non reçus

**Vérifications :**
1. Votre serveur est accessible publiquement
2. L'URL callback est correcte dans PayDRC dashboard
3. Pas de firewall bloquant les IPs de PayDRC
4. Certificat SSL valide (HTTPS requis)

### Problème : "PAYDRC_WHITELISTED_IPS not configured"

**Actions :**
1. Ajoutez la variable d'environnement
2. Redémarrez le serveur backend
3. En dev, ça fonctionnera quand même (warning seulement)
4. En prod, les callbacks seront rejetés

## Migration depuis HMAC

Si vous aviez l'ancienne configuration HMAC :

### Variables à retirer (obsolètes)
```env
PAYDRC_HMAC_KEY=xxx  # ❌ Ne pas utiliser
```

### Variables à garder (toujours utilisées)
```env
PAYDRC_MERCHANT_ID=xxx      # ✅ Requis
PAYDRC_MERCHANT_SECRET=xxx   # ✅ Requis
PAYDRC_AES_KEY=xxx          # ✅ Requis pour décryption
PAYDRC_AES_IV=xxx           # ✅ Optionnel
PAYDRC_BASE_URL=xxx         # ✅ URL API
PAYDRC_CALLBACK_URL=xxx     # ✅ URL callback
```

### Variables à ajouter (nouvelles)
```env
PAYDRC_WHITELISTED_IPS=xxx,yyy  # ✅ Requis
```

## Contact PayDRC

Pour toute question sur les IPs :

- **Support Email** : support@paydrc.com (à vérifier)
- **Documentation** : https://paydrc.gofreshbakery.net/api/v5/
- **Dashboard** : Votre compte marchand PayDRC

## Checklist de déploiement

- [ ] Obtenir les IPs fixes de PayDRC
- [ ] Configurer `PAYDRC_WHITELISTED_IPS` en production
- [ ] Tester un callback réel de PayDRC
- [ ] Vérifier les logs de sécurité
- [ ] Confirmer que les paiements fonctionnent
- [ ] Monitorer les rejections IP pendant 24h
- [ ] Documenter les IPs dans votre wiki interne

## Notes importantes

⚠️ **Les IPs de PayDRC peuvent changer** : Demandez-leur de vous prévenir en cas de changement d'IP

🔒 **Sécurité** : Ne jamais commiter les IPs dans le code source (utiliser variables d'environnement)

📊 **Monitoring** : Surveillez les rejections IP pour détecter les tentatives de fraude ou changements d'IP
