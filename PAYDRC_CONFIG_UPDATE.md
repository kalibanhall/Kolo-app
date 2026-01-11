# Configuration PayDRC - Variables d'environnement à mettre à jour

## ⚠️ IMPORTANT : Changement de configuration PayDRC

PayDRC a demandé de **remplacer la vérification HMAC par un système d'IP whitelisting**.

## Actions requises

### 1. Obtenir les IPs de PayDRC

**Contactez le support PayDRC pour obtenir leurs adresses IP fixes :**
- Email : support@paydrc.com ou votre contact PayDRC
- Demandez : "Quelles sont vos adresses IP sources pour les callbacks ?"
- Ils vous fourniront **1 ou 2 adresses IP fixes**

### 2. Variables à RETIRER

Ces variables ne sont plus utilisées et peuvent être supprimées :

```
PAYDRC_HMAC_KEY
```

### 3. Variables à AJOUTER

Ajoutez cette nouvelle variable avec les IPs fournies par PayDRC :

```
PAYDRC_WHITELISTED_IPS=xxx.xxx.xxx.xxx,yyy.yyy.yyy.yyy
```

**Format :**
- Plusieurs IPs séparées par des **virgules** (sans espaces)
- Exemple : `PAYDRC_WHITELISTED_IPS=41.243.10.15,41.243.10.16`

### 4. Variables à CONSERVER

Ces variables restent nécessaires :

```
PAYDRC_BASE_URL=https://paydrc.gofreshbakery.net/api/v5/
PAYDRC_MERCHANT_ID=j*zL/#%lkq(EbSNhb
PAYDRC_MERCHANT_SECRET=your-merchant-secret
PAYDRC_AES_KEY=your-aes-key
PAYDRC_CALLBACK_URL=https://your-api.com/api/payments/paydrc/callback
API_URL=https://your-api.com
```

## Configuration Render.com

1. Allez dans votre projet backend sur Render
2. Cliquez sur **Environment** dans le menu de gauche
3. **Supprimez** : `PAYDRC_HMAC_KEY`
4. **Ajoutez** : 
   - Key: `PAYDRC_WHITELISTED_IPS`
   - Value: Les IPs fournies par PayDRC (séparées par virgules)
5. Cliquez sur **Save Changes**
6. Attendez que le service redémarre automatiquement

## Configuration Vercel

1. Allez dans votre projet frontend sur Vercel
2. Allez dans **Settings** → **Environment Variables**
3. **Supprimez** : `PAYDRC_HMAC_KEY` (si présente côté frontend)
4. **Ajoutez** dans le backend :
   - Name: `PAYDRC_WHITELISTED_IPS`
   - Value: Les IPs de PayDRC
   - Environnements : Production, Preview, Development
5. Cliquez sur **Save**
6. Redéployez si nécessaire

## Variables complètes pour Render.com Backend

```bash
# Server
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...

# CORS
CORS_ORIGIN=https://kolo.cd
CLIENT_URL=https://kolo.cd

# JWT
JWT_SECRET=your-production-jwt-secret
JWT_EXPIRE=7d

# SendGrid
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=support@kolo.cd
FROM_NAME=KOLO Tombola
ADMIN_EMAIL=admin@kolo.cd

# Africa's Talking
AT_USERNAME=your-username
AT_API_KEY=your-api-key
AT_SENDER_ID=KOLO

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# PayDRC - NOUVELLE CONFIGURATION
PAYDRC_BASE_URL=https://paydrc.gofreshbakery.net/api/v5/
PAYDRC_MERCHANT_ID=j*zL/#%lkq(EbSNhb
PAYDRC_MERCHANT_SECRET=your-merchant-secret
PAYDRC_AES_KEY=your-aes-key
PAYDRC_WHITELISTED_IPS=xxx.xxx.xxx.xxx,yyy.yyy.yyy.yyy
PAYDRC_CALLBACK_URL=https://kolo-api.onrender.com/api/payments/paydrc/callback
API_URL=https://kolo-api.onrender.com

# App Settings
MAX_TICKETS_PER_PURCHASE=5
TICKET_PRICE=1
DEFAULT_CURRENCY=USD
TIMEZONE=Africa/Kinshasa
```

## Vérification après déploiement

### 1. Vérifier les logs au démarrage

```
# Vous devriez voir dans les logs Render :
✅ PayDRC configured
✅ Whitelisted IPs: xxx.xxx.xxx.xxx, yyy.yyy.yyy.yyy
```

### 2. Tester un paiement réel

1. Connectez-vous à l'application
2. Initiez un achat de tickets
3. Confirmez le paiement sur votre téléphone
4. Vérifiez que les tickets sont générés après validation

### 3. Surveiller les logs de callback

```bash
# Sur Render, allez dans Logs et cherchez :
📥 PayDRC callback received
✅ IP xxx.xxx.xxx.xxx whitelisted
✅ IP verified - callback authenticated
🔓 Decrypted callback data
✅ Payment completed successfully
```

### 4. Vérifier la base de données

```sql
-- Vérifier les webhooks reçus
SELECT * FROM payment_webhooks 
WHERE provider = 'PayDRC' 
ORDER BY created_at DESC 
LIMIT 10;

-- Vérifier qu'il n'y a pas de rejections
SELECT * FROM payment_webhooks 
WHERE provider = 'PayDRC' 
AND status LIKE 'rejected_%';
```

## En cas de problème

### Erreur : "Unauthorized IP address"

**Causes possibles :**
1. Les IPs PayDRC ne sont pas correctement configurées
2. PayDRC utilise une IP différente de celle communiquée
3. Votre serveur est derrière un proxy/load balancer

**Solution :**
1. Vérifiez les logs pour voir l'IP réelle reçue
2. Contactez PayDRC pour confirmer leurs IPs
3. Mettez à jour `PAYDRC_WHITELISTED_IPS` avec la bonne IP

### Erreur : "PAYDRC_WHITELISTED_IPS not configured"

**Solution :**
1. Ajoutez la variable d'environnement sur Render
2. Attendez le redémarrage automatique
3. Vérifiez dans les logs que la variable est bien chargée

### Les callbacks ne sont pas reçus

**Vérifications :**
1. Votre API est accessible publiquement (testez l'URL)
2. L'URL callback est correcte dans le dashboard PayDRC
3. Le certificat SSL est valide (HTTPS requis)
4. Aucun firewall ne bloque les IPs de PayDRC

## Timeline de migration

1. **AVANT** - Configuration actuelle (HMAC)
   ```
   PAYDRC_HMAC_KEY=xxx  ← À supprimer
   ```

2. **PENDANT** - Transition
   - Obtenir les IPs de PayDRC
   - Déployer le nouveau code
   - Ajouter `PAYDRC_WHITELISTED_IPS`
   - Supprimer `PAYDRC_HMAC_KEY`

3. **APRÈS** - Nouvelle configuration (IP Whitelist)
   ```
   PAYDRC_WHITELISTED_IPS=xxx.xxx.xxx.xxx,yyy.yyy.yyy.yyy
   ```

## Documentation complète

Pour plus de détails, consultez : [PAYDRC_IP_WHITELIST.md](./PAYDRC_IP_WHITELIST.md)

## Contact

En cas de problème avec PayDRC :
- **Email** : patrick_bitafu@kolo.cd
- **Phone** : +243841209627
- **Dashboard** : https://paydrc.gofreshbakery.net
