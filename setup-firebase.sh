#!/bin/bash

# 🔥 Firebase Integration Setup Script
# This script installs Firebase dependencies and sets up the configuration

echo "🔥 KOLO Firebase Integration Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Install frontend dependencies
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
cd client
npm install firebase

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
    exit 1
fi

cd ..

# Install backend dependencies
echo ""
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd server
npm install firebase-admin

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies${NC}"
    exit 1
fi

cd ..

# Apply database migration
echo ""
echo -e "${YELLOW}🗄️  Applying database migration...${NC}"
echo "Please enter your PostgreSQL credentials:"
read -p "Database name [kolo_db]: " DB_NAME
DB_NAME=${DB_NAME:-kolo_db}

read -p "Database user [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Database password: " DB_PASSWORD
echo ""

if command -v psql &> /dev/null; then
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -f server/database/migrations/add_fcm_token.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database migration applied${NC}"
    else
        echo -e "${YELLOW}⚠️  Database migration failed. You may need to apply it manually.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  psql not found. Please apply the migration manually:${NC}"
    echo "   psql -U $DB_USER -d $DB_NAME -f server/database/migrations/add_fcm_token.sql"
fi

# Create .env files if they don't exist
echo ""
echo -e "${YELLOW}📝 Setting up environment files...${NC}"

if [ ! -f "client/.env" ]; then
    cp client/.env.example client/.env
    echo -e "${GREEN}✅ Created client/.env${NC}"
    echo -e "${YELLOW}⚠️  Please update client/.env with your Firebase credentials${NC}"
else
    echo -e "${YELLOW}⚠️  client/.env already exists${NC}"
fi

# Check for firebase-admin-key.json
echo ""
echo -e "${YELLOW}🔑 Checking for Firebase Admin key...${NC}"

if [ ! -f "server/src/config/firebase-admin-key.json" ]; then
    echo -e "${RED}❌ firebase-admin-key.json not found${NC}"
    echo ""
    echo "To get your Firebase Admin key:"
    echo "1. Go to https://console.firebase.google.com/"
    echo "2. Select your project"
    echo "3. Go to Project Settings (⚙️) → Service accounts"
    echo "4. Click 'Generate new private key'"
    echo "5. Save the file as 'firebase-admin-key.json'"
    echo "6. Move it to: server/src/config/firebase-admin-key.json"
    echo ""
else
    echo -e "${GREEN}✅ Firebase Admin key found${NC}"
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}🎉 Firebase integration setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Firebase project at https://console.firebase.google.com/"
echo "2. Update client/.env with Firebase credentials"
echo "3. Place firebase-admin-key.json in server/src/config/"
echo "4. Read FIREBASE_SETUP.md for detailed instructions"
echo ""
echo "To test:"
echo "  npm run dev (in both client and server directories)"
echo ""
echo "For detailed setup guide, see:"
echo "  📖 FIREBASE_SETUP.md"
echo "  📖 FIREBASE_INTEGRATION.md"
echo ""
