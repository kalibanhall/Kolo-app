#!/bin/bash

###########################################
# KOLO Database Backup Script
# Author: Chris Ngozulu Kasongo
# Description: Automated PostgreSQL backup
###########################################

# Configuration
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/var/backups/kolo"
DB_NAME="${POSTGRES_DB:-kolo_db}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
S3_BUCKET="${S3_BACKUP_BUCKET:-kolo-backups}"
RETENTION_DAYS=7
S3_RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

log_info "Starting backup for database: $DB_NAME"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/kolo_backup_$DATE.sql"

# Perform backup
log_info "Creating database dump..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
    -h $DB_HOST \
    -p $DB_PORT \
    -U $DB_USER \
    -d $DB_NAME \
    -F p \
    -f $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    log_info "✅ Database backup created successfully"
    
    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup size: $FILE_SIZE"
    
    # Compress the backup
    log_info "Compressing backup..."
    gzip $BACKUP_FILE
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Compressed size: $COMPRESSED_SIZE"
    
    # Upload to S3 if configured
    if command -v aws &> /dev/null && [ ! -z "$S3_BUCKET" ]; then
        log_info "Uploading to S3..."
        aws s3 cp $BACKUP_FILE s3://$S3_BUCKET/backups/
        
        if [ $? -eq 0 ]; then
            log_info "✅ Backup uploaded to S3"
        else
            log_error "❌ Failed to upload to S3"
        fi
    else
        log_warn "S3 upload skipped (AWS CLI not installed or bucket not configured)"
    fi
    
    # Delete local backups older than RETENTION_DAYS
    log_info "Cleaning up old local backups (older than $RETENTION_DAYS days)..."
    find $BACKUP_DIR -name "kolo_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # Delete old S3 backups if AWS CLI is available
    if command -v aws &> /dev/null && [ ! -z "$S3_BUCKET" ]; then
        log_info "Cleaning up old S3 backups (older than $S3_RETENTION_DAYS days)..."
        
        CUTOFF_DATE=$(date -d "$S3_RETENTION_DAYS days ago" +%Y-%m-%d)
        
        aws s3 ls s3://$S3_BUCKET/backups/ | while read -r line; do
            FILE_DATE=$(echo $line | awk '{print $1}')
            FILE_NAME=$(echo $line | awk '{print $4}')
            
            if [ ! -z "$FILE_NAME" ] && [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
                log_info "Deleting old backup: $FILE_NAME"
                aws s3 rm s3://$S3_BUCKET/backups/$FILE_NAME
            fi
        done
    fi
    
    log_info "✅ Backup process completed successfully"
    
    # Send success notification (optional)
    if [ ! -z "$WEBHOOK_URL" ]; then
        curl -X POST $WEBHOOK_URL \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"✅ KOLO DB Backup successful: $COMPRESSED_SIZE\"}"
    fi
    
else
    log_error "❌ Database backup failed"
    
    # Send failure notification (optional)
    if [ ! -z "$WEBHOOK_URL" ]; then
        curl -X POST $WEBHOOK_URL \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"❌ KOLO DB Backup FAILED\"}"
    fi
    
    exit 1
fi

# Display backup statistics
log_info "=== Backup Statistics ==="
log_info "Total backups: $(ls -1 $BACKUP_DIR/kolo_backup_*.sql.gz | wc -l)"
log_info "Total size: $(du -sh $BACKUP_DIR | cut -f1)"
log_info "Latest backup: $BACKUP_FILE"

exit 0
