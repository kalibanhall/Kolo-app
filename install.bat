@echo off
REM ===================================================
REM KOLO - Script d'installation automatique (CMD)
REM ===================================================

echo ========================================
echo     KOLO TOMBOLA - Installation
echo ========================================
echo.

REM Vérifier si Node.js est installé
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Node.js n'est pas installe!
    echo.
    echo Veuillez installer Node.js depuis:
    echo https://nodejs.org/en/download/
    echo.
    echo Apres installation, relancez ce script.
    pause
    exit /b 1
)

node --version
echo [OK] Node.js est installe
echo.

REM Installation des dépendances serveur
echo Installation des dependances du serveur...
cd /d "%~dp0server"
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Installation serveur echouee
    pause
    exit /b 1
)
echo [OK] Dependances serveur installees
echo.

REM Installation des dépendances client
echo Installation des dependances du client...
cd /d "%~dp0client"
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Installation client echouee
    pause
    exit /b 1
)
echo [OK] Dependances client installees
echo.

REM Créer fichiers .env
cd /d "%~dp0"
if not exist "server\.env" (
    echo Creation de server\.env...
    copy "server\.env.example" "server\.env"
    echo [ATTENTION] Configurez server\.env avec vos variables!
)

if not exist "client\.env" (
    echo Creation de client\.env...
    copy "client\.env.example" "client\.env"
    echo [ATTENTION] Configurez client\.env avec vos variables!
)

echo.
echo ========================================
echo     Installation terminee!
echo ========================================
echo.
echo Prochaines etapes:
echo.
echo 1. Configurez server\.env avec votre DATABASE_URL
echo    (Creez un projet gratuit sur https://supabase.com)
echo.
echo 2. Executez les migrations:
echo    cd server ^&^& npm run migrate
echo.
echo 3. Demarrez le serveur:
echo    cd server ^&^& npm run dev
echo.
echo 4. Dans un autre terminal, demarrez le client:
echo    cd client ^&^& npm run dev
echo.
echo 5. Ouvrez http://localhost:5173 dans votre navigateur
echo.
pause
