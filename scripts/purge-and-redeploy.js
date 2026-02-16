#!/usr/bin/env node

/**
 * KOLO - Script de purge et redéploiement
 * 
 * Ce script :
 * 1. Purge les caches du Service Worker côté client
 * 2. Déclenche un redéploiement sur Render (API)
 * 3. Déclenche un redéploiement sur Vercel (API)
 * 
 * Usage:
 *   node scripts/purge-and-redeploy.js [--render] [--vercel] [--all]
 * 
 * Variables d'environnement requises:
 *   RENDER_API_KEY     - Clé API Render (depuis https://dashboard.render.com/u/settings#api-keys)
 *   RENDER_SERVICE_ID  - ID du service Render (depuis l'URL du dashboard: /web/srv-XXXXX)
 *   VERCEL_TOKEN       - Token Vercel (depuis https://vercel.com/account/tokens)
 *   VERCEL_PROJECT_ID  - ID du projet Vercel
 */

const https = require('https');
require('dotenv').config();

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function redeployRender() {
  if (!RENDER_API_KEY || !RENDER_SERVICE_ID) {
    console.log('⚠️  RENDER_API_KEY ou RENDER_SERVICE_ID non configuré.');
    console.log('   Configurer dans .env:');
    console.log('   RENDER_API_KEY=rnd_xxxxxxxxxx');
    console.log('   RENDER_SERVICE_ID=srv-xxxxxxxxxx');
    return false;
  }

  console.log('🚀 Déclenchement du redéploiement Render...');
  try {
    const result = await makeRequest({
      hostname: 'api.render.com',
      path: `/v1/services/${RENDER_SERVICE_ID}/deploys`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }, { clearCache: 'clear' });

    console.log(`✅ Render: Redéploiement déclenché (ID: ${result.data?.id || 'OK'})`);
    return true;
  } catch (error) {
    console.error('❌ Render: Erreur -', error.message);
    return false;
  }
}

async function listRenderDeploys() {
  if (!RENDER_API_KEY || !RENDER_SERVICE_ID) {
    console.log('⚠️  RENDER_API_KEY ou RENDER_SERVICE_ID non configuré.');
    return [];
  }

  console.log('📋 Récupération des déploiements Render...');
  try {
    const result = await makeRequest({
      hostname: 'api.render.com',
      path: `/v1/services/${RENDER_SERVICE_ID}/deploys?limit=20`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    const deploys = result.data || [];
    console.log(`\n📦 ${deploys.length} déploiements trouvés:\n`);
    
    deploys.forEach((d, i) => {
      const deploy = d.deploy || d;
      const date = new Date(deploy.createdAt || deploy.created_at).toLocaleString('fr-CD');
      const status = deploy.status || 'unknown';
      const statusIcon = status === 'live' ? '🟢' : status === 'deactivated' ? '🔴' : '🟡';
      console.log(`  ${statusIcon} ${i + 1}. ${deploy.id} | ${status} | ${date}`);
    });

    return deploys;
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    return [];
  }
}

async function redeployVercel() {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    console.log('⚠️  VERCEL_TOKEN ou VERCEL_PROJECT_ID non configuré.');
    console.log('   Configurer dans .env:');
    console.log('   VERCEL_TOKEN=xxxxxxxxxx');
    console.log('   VERCEL_PROJECT_ID=prj_xxxxxxxxxx');
    return false;
  }

  console.log('🚀 Déclenchement du redéploiement Vercel...');
  try {
    // Get latest deployment
    const deploys = await makeRequest({
      hostname: 'api.vercel.com',
      path: `/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=1`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`
      }
    });

    if (deploys.data?.deployments?.[0]) {
      const latestId = deploys.data.deployments[0].uid;
      // Redeploy
      const result = await makeRequest({
        hostname: 'api.vercel.com',
        path: `/v13/deployments`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }, {
        name: 'kolo',
        deploymentId: latestId,
        target: 'production'
      });
      
      console.log(`✅ Vercel: Redéploiement déclenché (${result.data?.url || 'OK'})`);
      return true;
    }

    console.log('⚠️  Vercel: Aucun déploiement trouvé');
    return false;
  } catch (error) {
    console.error('❌ Vercel: Erreur -', error.message);
    return false;
  }
}

function printUsage() {
  console.log(`
╔══════════════════════════════════════════════════╗
║           KOLO - Purge & Redéploiement           ║
╚══════════════════════════════════════════════════╝

Usage: node scripts/purge-and-redeploy.js [option]

Options:
  --render     Redéployer le backend sur Render
  --vercel     Redéployer le frontend sur Vercel
  --list       Lister les déploiements Render
  --all        Redéployer tout (Render + Vercel)
  --help       Afficher cette aide

⚠️  CAUSE PRINCIPALE du vieux design:
   Le Service Worker mettait en cache les assets avec une 
   stratégie "cache-first" et un nom de cache fixe (kolo-v1.0.0).
   → CORRIGÉ: sw.js est maintenant "network-first" avec version auto.

💡 Pour purger le cache côté utilisateur:
   Ouvrir DevTools > Application > Service Workers > Unregister
   Ou: DevTools > Application > Cache Storage > Supprimer tout
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    printUsage();
    return;
  }

  console.log('\n🔄 KOLO - Purge & Redéploiement\n');

  if (args.includes('--list')) {
    await listRenderDeploys();
    return;
  }

  if (args.includes('--render') || args.includes('--all')) {
    await redeployRender();
  }

  if (args.includes('--vercel') || args.includes('--all')) {
    await redeployVercel();
  }

  console.log('\n✨ Terminé!\n');
}

main().catch(console.error);
