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

function Write-Err($message) {
    Write-ColorOutput Red "❌ $message"
}

if ($Help) {
    Write-Host "KOLO VPS Deployment Script - Windows PowerShell"
    Write-Host ""
    Write-Host "USAGE:"
    Write-Host "    .\deploy-vps.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:"
    Write-Host "    -VpsIp [ip]         IP du VPS (defaut: 158.220.108.42)"
    Write-Host "    -SshUser [user]     Utilisateur SSH (defaut: root)"
    Write-Host "    -UploadOnly         Transferer le script uniquement"
    Write-Host "    -Help               Afficher cette aide"
    Write-Host ""
    Write-Host "EXEMPLES:"
    Write-Host "    .\deploy-vps.ps1"
    Write-Host "    .\deploy-vps.ps1 -VpsIp 192.168.1.100 -SshUser admin"
    Write-Host "    .\deploy-vps.ps1 -UploadOnly"
    Write-Host ""
    Write-Host "PREREQUIS:"
    Write-Host "    - OpenSSH Client installe (inclus dans Windows 10/11)"
    Write-Host "    - Acces SSH au VPS configure"
    Write-Host ""
    exit 0
}

Clear-Host

Write-Host "=========================================="
Write-Host "   KOLO VPS Deployment - PowerShell"
Write-Host "=========================================="
Write-Host ""

Write-Info "VPS IP: $VpsIp"
Write-Info "SSH User: $SshUser"
Write-Host ""

# Vérifier OpenSSH
Write-Step "Vérification des prérequis"

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Err "OpenSSH Client n'est pas installe!"
    Write-Info "Pour l'installer:"
    Write-Info "  1. Parametres Windows - Applications - Fonctionnalites facultatives"
    Write-Info "  2. Ajouter 'Client OpenSSH'"
    Write-Info "Ou utilisez Git Bash / WSL"
    exit 1
}

Write-Success "OpenSSH Client trouvé"

# Vérifier que le script de déploiement existe
$deployScript = Join-Path $PSScriptRoot "deploy-to-vps.sh"
if (-not (Test-Path $deployScript)) {
    Write-Err "Script deploy-to-vps.sh introuvable!"
    Write-Info "Assurez-vous d'être dans le bon répertoire"
    exit 1
}

Write-Success "Script de déploiement trouvé: $deployScript"

# Tester la connexion SSH
Write-Step "Test de connexion SSH"
Write-Info "Connexion à $SshUser@$VpsIp..."

$ErrorActionPreference = "Continue"
$testConnection = ssh -o BatchMode=yes -o ConnectTimeout=5 "$SshUser@$VpsIp" "echo OK" 2>&1
$sshTestCode = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($sshTestCode -ne 0) {
    Write-Err "Impossible de se connecter au VPS"
    Write-Info "Verifiez:"
    Write-Info "  1. L'IP est correcte: $VpsIp"
    Write-Info "  2. Vous avez configure une cle SSH ou connaissez le mot de passe"
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
    
    Write-Success "Script transfere vers $remotePath"
} catch {
    Write-Err "Echec du transfert du script"
    Write-Err $_.Exception.Message
    exit 1
}

if ($UploadOnly) {
    Write-Host ""
    Write-Success "Script transfere avec succes!"
    Write-Info "Pour l'executer manuellement:"
    Write-Info "  ssh $SshUser@$VpsIp"
    Write-Info "  sudo bash $remotePath"
    exit 0
}

# Start deployment on VPS
Write-Step "Demarrage du deploiement sur le VPS"
Write-Info "Cela peut prendre 10-15 minutes..."
Write-Info "N'interrompez pas le processus!"
Write-Host ""

$confirm = Read-Host "Voulez-vous continuer? (O/n)"
if ($confirm -eq 'n' -or $confirm -eq 'N') {
    Write-Info "Deploiement annule"
    exit 0
}

Write-Host ""
Write-Info "Connexion au VPS et execution du script..."
Write-Host ""

# Execute on VPS - use semicolon instead of &&
$ErrorActionPreference = "Continue"
ssh -t "$SshUser@$VpsIp" "chmod +x $remotePath; sudo bash $remotePath"
$sshExitCode = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($sshExitCode -ne 0) {
    Write-Host ""
    Write-Err "Le deploiement a echoue"
    Write-Info "Consultez les logs ci-dessus pour plus de details"
    Write-Info "Pour reessayer: .\deploy-vps.ps1"
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   DEPLOIEMENT REUSSI !" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Success "Application KOLO deployee sur http://$VpsIp"
Write-Host ""
Write-Info "Compte Admin:"
Write-Host "  Email: admin@kolo.com"
Write-Host "  Mot de passe: Admin@2025"
Write-Host "  Niveau: L3 (Acces complet)"
Write-Host ""
Write-Info "Commandes utiles:"
Write-Host "  ssh $SshUser@$VpsIp 'pm2 logs kolo-api'      # Voir les logs"
Write-Host "  ssh $SshUser@$VpsIp 'pm2 restart kolo-api'   # Redemarrer"
Write-Host "  ssh $SshUser@$VpsIp 'pm2 status'             # Statut"
Write-Host ""
Write-Info "Ouvrez http://$VpsIp dans votre navigateur!"
Write-Host ""
