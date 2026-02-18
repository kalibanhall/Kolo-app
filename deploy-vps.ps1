# Script PowerShell pour déployer KOLO sur VPS
# Exécuter: .\deploy-vps.ps1

param(
    [string]$VpsIp = "158.220.108.42",
    [string]$SshUser = "root",
    [switch]$UploadOnly,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Step($message) {
    Write-Host "`n" -NoNewline
    Write-ColorOutput Cyan "==== $message ===="
    Write-Host ""
}

function Write-Success($message) {
    Write-ColorOutput Green "✅ $message"
}

function Write-Info($message) {
    Write-ColorOutput Yellow "ℹ️  $message"
}

function Write-Error($message) {
    Write-ColorOutput Red "❌ $message"
}

if ($Help) {
    Write-Host @"
KOLO VPS Deployment Script - Windows PowerShell

USAGE:
    .\deploy-vps.ps1 [OPTIONS]

OPTIONS:
    -VpsIp <ip>         IP du VPS (défaut: 158.220.108.42)
    -SshUser <user>     Utilisateur SSH (défaut: root)
    -UploadOnly         Transférer le script uniquement, sans exécuter
    -Help               Afficher cette aide

EXEMPLES:
    .\deploy-vps.ps1
    .\deploy-vps.ps1 -VpsIp 192.168.1.100 -SshUser admin
    .\deploy-vps.ps1 -UploadOnly

PRÉREQUIS:
    - OpenSSH Client installé (inclus dans Windows 10/11)
    - Accès SSH au VPS configuré
    - Git Bash ou WSL recommandé

"@
    exit 0
}

Clear-Host

Write-Host @"
╔════════════════════════════════════════╗
║   KOLO VPS Deployment - PowerShell    ║
╚════════════════════════════════════════╝
"@

Write-Info "VPS IP: $VpsIp"
Write-Info "SSH User: $SshUser"
Write-Host ""

# Vérifier OpenSSH
Write-Step "Vérification des prérequis"

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Error "OpenSSH Client n'est pas installé!"
    Write-Info "Pour l'installer:"
    Write-Info "  1. Paramètres Windows > Applications > Fonctionnalités facultatives"
    Write-Info "  2. Ajouter 'Client OpenSSH'"
    Write-Info "Ou utilisez Git Bash / WSL"
    exit 1
}

Write-Success "OpenSSH Client trouvé"

# Vérifier que le script de déploiement existe
$deployScript = Join-Path $PSScriptRoot "deploy-to-vps.sh"
if (-not (Test-Path $deployScript)) {
    Write-Error "Script deploy-to-vps.sh introuvable!"
    Write-Info "Assurez-vous d'être dans le bon répertoire"
    exit 1
}

Write-Success "Script de déploiement trouvé: $deployScript"

# Tester la connexion SSH
Write-Step "Test de connexion SSH"
Write-Info "Connexion à $SshUser@$VpsIp..."

$testConnection = ssh -o BatchMode=yes -o ConnectTimeout=5 "$SshUser@$VpsIp" "echo OK" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "Impossible de se connecter au VPS"
    Write-Info "Vérifiez:"
    Write-Info "  1. L'IP est correcte: $VpsIp"
    Write-Info "  2. Vous avez configuré une clé SSH ou connaissez le mot de passe"
    Write-Info "  3. Le port SSH est ouvert (22)"
    Write-Host ""
    Write-Info "Pour configurer SSH:"
    Write-Info "  ssh-keygen -t ed25519"
    Write-Info "  ssh-copy-id $SshUser@$VpsIp"
    exit 1
}

Write-Success "Connexion SSH réussie!"

# Transfert du script
Write-Step "Transfert du script de déploiement"

try {
    $remotePath = "/tmp/deploy-kolo.sh"
    scp $deployScript "$SshUser@${VpsIp}:$remotePath"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur lors du transfert SCP"
    }
    
    Write-Success "Script transféré vers $remotePath"
} catch {
    Write-Error "Échec du transfert du script"
    Write-Error $_.Exception.Message
    exit 1
}

if ($UploadOnly) {
    Write-Host ""
    Write-Success "Script transféré avec succès!"
    Write-Info "Pour l'exécuter manuellement:"
    Write-Info "  ssh $SshUser@$VpsIp"
    Write-Info "  sudo bash $remotePath"
    exit 0
}

# Exécuter le déploiement
Write-Step "Démarrage du déploiement sur le VPS"
Write-Info "Cela peut prendre 10-15 minutes..."
Write-Info "N'interrompez pas le processus!"
Write-Host ""

$confirm = Read-Host "Voulez-vous continuer? (O/n)"
if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Info "Déploiement annulé"
    exit 0
}

Write-Host ""
Write-Info "Connexion au VPS et exécution du script..."
Write-Host ""

# Exécuter le script sur le VPS
ssh -t "$SshUser@$VpsIp" "chmod +x $remotePath && sudo bash $remotePath"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   ✅ DÉPLOIEMENT RÉUSSI !             ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Success "Application KOLO déployée sur http://$VpsIp"
    Write-Host ""
    Write-Info "Compte Admin:"
    Write-Host "  Email: admin@kolo.com"
    Write-Host "  Mot de passe: Admin@2025"
    Write-Host "  Niveau: L3 (Accès complet)"
    Write-Host ""
    Write-Info "Commandes utiles:"
    Write-Host "  ssh $SshUser@$VpsIp 'pm2 logs kolo-api'      # Voir les logs"
    Write-Host "  ssh $SshUser@$VpsIp 'pm2 restart kolo-api'   # Redémarrer"
    Write-Host "  ssh $SshUser@$VpsIp 'pm2 status'             # Statut"
    Write-Host ""
    Write-Info "Ouvrez http://$VpsIp dans votre navigateur!"
    Write-Host ""
} else {
    Write-Host ""
    Write-Error "Le déploiement a échoué"
    Write-Info "Consultez les logs ci-dessus pour plus de détails"
    Write-Info "Pour réessayer: .\deploy-vps.ps1"
    exit 1
}
