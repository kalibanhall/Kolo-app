# ===================================================
# KOLO - Script d'installation automatique
# ===================================================
# Exécuter ce script après avoir installé Node.js
# ===================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    KOLO TOMBOLA - Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Veuillez installer Node.js depuis:" -ForegroundColor Yellow
    Write-Host "https://nodejs.org/en/download/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Après installation, relancez ce script." -ForegroundColor Yellow
    exit 1
}

# Vérifier npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm installé: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm n'est pas installé!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Installation des dépendances du serveur..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\server"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances serveur" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dépendances serveur installées" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Installation des dépendances du client..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\client"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dépendances client installées" -ForegroundColor Green

# Créer les fichiers .env s'ils n'existent pas
Write-Host ""
Write-Host "📝 Vérification des fichiers de configuration..." -ForegroundColor Yellow

$serverEnvPath = "$PSScriptRoot\server\.env"
$clientEnvPath = "$PSScriptRoot\client\.env"

if (-not (Test-Path $serverEnvPath)) {
    Write-Host "Création de server/.env à partir de .env.example..." -ForegroundColor Yellow
    Copy-Item "$PSScriptRoot\server\.env.example" $serverEnvPath
    Write-Host "⚠️  N'oubliez pas de configurer server/.env avec vos variables!" -ForegroundColor Yellow
} else {
    Write-Host "✅ server/.env existe déjà" -ForegroundColor Green
}

if (-not (Test-Path $clientEnvPath)) {
    Write-Host "Création de client/.env à partir de .env.example..." -ForegroundColor Yellow
    Copy-Item "$PSScriptRoot\client\.env.example" $clientEnvPath
    Write-Host "⚠️  N'oubliez pas de configurer client/.env avec vos variables!" -ForegroundColor Yellow
} else {
    Write-Host "✅ client/.env existe déjà" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    ✅ Installation terminée!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configurez server/.env avec votre DATABASE_URL" -ForegroundColor White
Write-Host "   (Créez un projet gratuit sur https://supabase.com)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Exécutez les migrations:" -ForegroundColor White
Write-Host "   cd server && npm run migrate" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Démarrez le serveur:" -ForegroundColor White
Write-Host "   cd server && npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Dans un autre terminal, démarrez le client:" -ForegroundColor White
Write-Host "   cd client && npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Ouvrez http://localhost:5173 dans votre navigateur" -ForegroundColor White
Write-Host ""

Set-Location -Path $PSScriptRoot
