#!/bin/bash

###########################################
# KOLO Database Restore Script
# Author: Chris Ngozulu Kasongo
# Description: Restore PostgreSQL from backup
###########################################

# Configuration
BACKUP_DIR="/var/backups/kolo"
DB_NAME="${POSTGRES_DB:-kolo_db}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    log_error "Usage: ./restore-db.sh <backup_file>"
    echo "Available backups:"
    ls -lh $BACKUP_DIR/kolo_backup_*.sql.gz
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_info "⚠️  WARNING: This will OVERWRITE the current database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
fi

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    log_info "Decompressing backup..."
    gunzip -k $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE%.gz}"
fi

# Drop and recreate database
log_info "Dropping existing database..."
PGPASSWORD=$POSTGRES_PASSWORD dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

log_info "Creating new database..."
PGPASSWORD=$POSTGRES_PASSWORD createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Restore backup
log_info "Restoring from backup..."
PGPASSWORD=$POSTGRES_PASSWORD psql \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -f $BACKUP_FILE

if [ $? -eq 0 ]; then
    log_info "✅ Database restored successfully"
else
    log_error "❌ Database restore failed"
    exit 1
fi

# Clean up decompressed file
rm -f $BACKUP_FILE

exit 0
