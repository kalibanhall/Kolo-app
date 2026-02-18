# KOLO VPS Deployment Script - Simple Version
# Deploy to 158.220.108.42

param(
    [string]$VpsIp = "158.220.108.42",
    [string]$SshUser = "root"
)

$ErrorActionPreference = "Stop"

Write-Host "`n=========================================="
Write-Host "   KOLO VPS Deployment"  
Write-Host "==========================================`n"

Write-Host "[INFO] VPS IP: $VpsIp" -ForegroundColor Green
Write-Host "[INFO] SSH User: $SshUser`n" -ForegroundColor Green

# Check SSH
Write-Host "[STEP 1] Verification SSH..." -ForegroundColor Cyan

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] OpenSSH Client non trouve!" -ForegroundColor Red
    Write-Host "Installez OpenSSH Client dans les parametres Windows"
    exit 1
}

Write-Host "[OK] SSH trouve`n" -ForegroundColor Green

# Check script
$deployScript = Join-Path $PSScriptRoot "deploy-to-vps.sh"
if (-not (Test-Path $deployScript)) {
    Write-Host "[ERROR] Script deploy-to-vps.sh introuvable!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Script trouve: $deployScript`n" -ForegroundColor Green

# Test connection
Write-Host "[STEP 2] Test connexion SSH..." -ForegroundColor Cyan
Write-Host "Connexion a ${SshUser}@${VpsIp}...`n"

$testResult = ssh -o BatchMode=yes -o ConnectTimeout=5 "${SshUser}@${VpsIp}" "echo OK" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Impossible de se connecter au VPS" -ForegroundColor Red
    Write-Host "Verifiez votre connexion SSH et reessayez"
    exit 1
}

Write-Host "[OK] Connexion SSH reussie!`n" -ForegroundColor Green

# Transfer script
Write-Host "[STEP 3] Transfert du script..." -ForegroundColor Cyan

$remotePath = "/tmp/deploy-kolo.sh"

try {
    scp $deployScript "${SshUser}@${VpsIp}:$remotePath" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur SCP"
    }
    
    Write-Host "[OK] Script transfere vers $remotePath`n" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Echec du transfert" -ForegroundColor Red
    exit 1
}

# Confirm
Write-Host "[STEP 4] Pret a deployer!" -ForegroundColor Cyan
Write-Host "Cela peut prendre 10-15 minutes..."
Write-Host "N'interrompez pas le processus!`n"

$confirm = Read-Host "Continuer? (O/n)"
if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Host "Deploiement annule" -ForegroundColor Yellow
    exit 0
}

# Deploy
Write-Host "`n[STEP 5] Deploiement en cours...`n" -ForegroundColor Cyan
Write-Host "Connexion au VPS et execution du script...`n"

ssh -t "${SshUser}@${VpsIp}" "chmod +x $remotePath; sudo bash $remotePath"

# Check result
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=========================================="  -ForegroundColor Green
    Write-Host "   DEPLOIEMENT REUSSI !"  -ForegroundColor Green
    Write-Host "==========================================`n"  -ForegroundColor Green
    
    Write-Host "Application KOLO deployee sur: http://$VpsIp`n" -ForegroundColor Green
    
    Write-Host "Compte Admin:" -ForegroundColor Yellow
    Write-Host "  Email: admin@kolo.com"
    Write-Host "  Password: Admin@2025"
    Write-Host "  Niveau: L3`n"
    
    Write-Host "Commandes utiles:" -ForegroundColor Yellow
    Write-Host "  ssh ${SshUser}@${VpsIp} pm2 logs kolo-api"
    Write-Host "  ssh ${SshUser}@${VpsIp} pm2 restart kolo-api"
    Write-Host "  ssh ${SshUser}@${VpsIp} pm2 status`n"
    
    Write-Host "Ouvrez http://$VpsIp dans votre navigateur!`n" -ForegroundColor Cyan
}
else {
    Write-Host "`n[ERROR] Le deploiement a echoue" -ForegroundColor Red
    Write-Host "Consultez les logs ci-dessus pour plus de details"
    Write-Host "Pour reessayer: .\deploy-vps-simple.ps1`n"
    exit 1
}
