# KOLO VPS Deployment - With Password
# IP: 158.220.108.42

param(
    [string]$VpsIp = "158.220.108.42",
    [string]$SshUser = "root"
)

Write-Host "`n=========================================="
Write-Host "   KOLO VPS Deployment"
Write-Host "==========================================`n"

Write-Host "[INFO] VPS: ${SshUser}@${VpsIp}" -ForegroundColor Green
Write-Host "[INFO] Vous devrez entrer le mot de passe SSH 2-3 fois`n" -ForegroundColor Yellow

# Check script exists
$deployScript = Join-Path $PSScriptRoot "deploy-to-vps.sh"
if (-not (Test-Path $deployScript)) {
    Write-Host "[ERROR] Script deploy-to-vps.sh introuvable!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Script trouve: $deployScript`n" -ForegroundColor Green

# Step 1: Transfer script
Write-Host "[STEP 1] Transfert du script vers le VPS..." -ForegroundColor Cyan
Write-Host "Entrez le mot de passe SSH quand demande:`n"

$remotePath = "/tmp/deploy-kolo.sh"

scp $deployScript "${SshUser}@${VpsIp}:$remotePath"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Echec du transfert" -ForegroundColor Red
    exit 1
}

Write-Host "`n[OK] Script transfere avec succes!`n" -ForegroundColor Green

# Step 2: Confirm
Write-Host "[STEP 2] Pret a deployer!" -ForegroundColor Cyan
Write-Host "Le deploiement va:"
Write-Host "  - Installer Node.js, PostgreSQL, Nginx"
Write-Host "  - Cloner et configurer KOLO"
Write-Host "  - Creer un compte Admin L3"
Write-Host "  - Duree: 10-15 minutes`n"

$confirm = Read-Host "Continuer avec le deploiement? (O/n)"
if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Host "Deploiement annule" -ForegroundColor Yellow
    exit 0
}

# Step 3: Deploy
Write-Host "`n[STEP 3] Lancement du deploiement..." -ForegroundColor Cyan
Write-Host "Entrez le mot de passe SSH a nouveau:`n"

ssh -t "${SshUser}@${VpsIp}" "chmod +x $remotePath && sudo bash $remotePath"

# Check result
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=========================================="  -ForegroundColor Green
    Write-Host "   DEPLOIEMENT REUSSI !"  -ForegroundColor Green
    Write-Host "==========================================`n"  -ForegroundColor Green
    
    Write-Host "Application KOLO disponible sur:" -ForegroundColor Cyan
    Write-Host "  http://$VpsIp`n" -ForegroundColor White
    
    Write-Host "Compte Admin L3:" -ForegroundColor Yellow
    Write-Host "  Email     : admin@kolo.com"
    Write-Host "  Password  : Admin@2025"
    Write-Host "  Niveau    : L3 (Acces complet)`n"
    
    Write-Host "Base de donnees PostgreSQL:" -ForegroundColor Yellow
    Write-Host "  Database  : kolo_db"
    Write-Host "  User      : kolo"
    Write-Host "  (Le mot de passe a ete affiche dans les logs ci-dessus)`n"
    
    Write-Host "Commandes utiles pour gerer l'application:" -ForegroundColor Cyan
    Write-Host "  ssh ${SshUser}@${VpsIp} 'pm2 logs kolo-api'      # Voir les logs"
    Write-Host "  ssh ${SshUser}@${VpsIp} 'pm2 restart kolo-api'   # Redemarrer"
    Write-Host "  ssh ${SshUser}@${VpsIp} 'pm2 status'             # Voir le statut`n"
    
    Write-Host "Prochaines etapes:" -ForegroundColor Yellow
    Write-Host "  1. Ouvrir http://$VpsIp dans votre navigateur"
    Write-Host "  2. Se connecter avec admin@kolo.com / Admin@2025"
    Write-Host "  3. Configurer PayDRC dans /var/www/kolo/server/.env"
    Write-Host "  4. Configurer un sous-domaine (plus tard)`n"
}
else {
    Write-Host "`n[ERROR] Le deploiement a echoue" -ForegroundColor Red
    Write-Host "Verifiez les logs ci-dessus pour identifier le probleme"
    Write-Host "Pour reessayer: .\deploy-vps-password.ps1`n"
    exit 1
}
