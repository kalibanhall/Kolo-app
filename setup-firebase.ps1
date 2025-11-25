# 🔥 Firebase Integration Setup Script for Windows
# This script installs Firebase dependencies and sets up the configuration

Write-Host "🔥 KOLO Firebase Integration Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory"
    exit 1
}

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location client
npm install firebase

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Install backend dependencies
Write-Host ""
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location server
npm install firebase-admin

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Apply database migration
Write-Host ""
Write-Host "🗄️  Database migration file ready" -ForegroundColor Yellow
Write-Host "To apply the migration, run:" -ForegroundColor Yellow
Write-Host "  psql -U your_user -d kolo_db -f server\database\migrations\add_fcm_token.sql" -ForegroundColor White
Write-Host ""

# Create .env files if they don't exist
Write-Host "📝 Setting up environment files..." -ForegroundColor Yellow

if (-not (Test-Path "client\.env")) {
    Copy-Item "client\.env.example" "client\.env"
    Write-Host "✅ Created client\.env" -ForegroundColor Green
    Write-Host "⚠️  Please update client\.env with your Firebase credentials" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  client\.env already exists" -ForegroundColor Yellow
}

# Check for firebase-admin-key.json
Write-Host ""
Write-Host "🔑 Checking for Firebase Admin key..." -ForegroundColor Yellow

if (-not (Test-Path "server\src\config\firebase-admin-key.json")) {
    Write-Host "❌ firebase-admin-key.json not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "To get your Firebase Admin key:" -ForegroundColor White
    Write-Host "1. Go to https://console.firebase.google.com/"
    Write-Host "2. Select your project"
    Write-Host "3. Go to Project Settings (⚙️) → Service accounts"
    Write-Host "4. Click 'Generate new private key'"
    Write-Host "5. Save the file as 'firebase-admin-key.json'"
    Write-Host "6. Move it to: server\src\config\firebase-admin-key.json"
    Write-Host ""
} else {
    Write-Host "✅ Firebase Admin key found" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "🎉 Firebase integration setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Configure Firebase project at https://console.firebase.google.com/"
Write-Host "2. Update client\.env with Firebase credentials"
Write-Host "3. Place firebase-admin-key.json in server\src\config\"
Write-Host "4. Apply database migration (see command above)"
Write-Host "5. Read FIREBASE_SETUP.md for detailed instructions"
Write-Host ""
Write-Host "To test:" -ForegroundColor White
Write-Host "  npm run dev (in both client and server directories)"
Write-Host ""
Write-Host "For detailed setup guide, see:" -ForegroundColor White
Write-Host "  📖 FIREBASE_SETUP.md"
Write-Host "  📖 FIREBASE_INTEGRATION.md"
Write-Host ""
