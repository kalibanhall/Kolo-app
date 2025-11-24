# KOLO Database Backup Configuration

## Automated Backups with Cron

### Setup Instructions

1. **Make scripts executable:**
```bash
chmod +x server/scripts/backup-db.sh
chmod +x server/scripts/restore-db.sh
```

2. **Configure environment variables:**
Create `/etc/kolo/backup.env`:
```bash
POSTGRES_DB=kolo_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
S3_BACKUP_BUCKET=kolo-backups
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
WEBHOOK_URL=https://hooks.slack.com/your-webhook (optional)
```

3. **Install AWS CLI (for S3 backups):**
```bash
# Ubuntu/Debian
sudo apt-get install awscli

# Configure AWS
aws configure
```

4. **Setup cron job:**
```bash
# Edit crontab
crontab -e

# Add backup job (runs daily at 2 AM)
0 2 * * * source /etc/kolo/backup.env && /path/to/server/scripts/backup-db.sh >> /var/log/kolo-backup.log 2>&1

# Add weekly full backup (Sunday at 3 AM)
0 3 * * 0 source /etc/kolo/backup.env && /path/to/server/scripts/backup-db.sh && echo "Weekly backup completed" >> /var/log/kolo-backup.log
```

### Backup Schedule Options

**Daily Backups (Production):**
```
0 2 * * * - Every day at 2 AM
```

**Every 6 hours (High-traffic):**
```
0 */6 * * * - Every 6 hours
```

**Every 12 hours:**
```
0 */12 * * * - Twice daily
```

**Weekly only:**
```
0 2 * * 0 - Sunday at 2 AM
```

### Backup Locations

**Local:** `/var/backups/kolo/`
- Retention: 7 days
- Format: `kolo_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`

**S3 (Cloud):**
- Bucket: `s3://kolo-backups/backups/`
- Retention: 30 days
- Same filename format

### Restore Instructions

**From local backup:**
```bash
./server/scripts/restore-db.sh /var/backups/kolo/kolo_backup_2025-11-24_02-00-00.sql.gz
```

**From S3:**
```bash
# Download from S3
aws s3 cp s3://kolo-backups/backups/kolo_backup_2025-11-24_02-00-00.sql.gz .

# Restore
./server/scripts/restore-db.sh kolo_backup_2025-11-24_02-00-00.sql.gz
```

### Railway-Specific Setup

For Railway deployments:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Create backup service
railway service create kolo-backup

# Add environment variables in Railway dashboard
POSTGRES_URL=postgresql://...
S3_BUCKET=kolo-backups

# Deploy backup script
railway up
```

### Monitoring

**Check backup logs:**
```bash
tail -f /var/log/kolo-backup.log
```

**List recent backups:**
```bash
ls -lht /var/backups/kolo/ | head -10
```

**Check S3 backups:**
```bash
aws s3 ls s3://kolo-backups/backups/ --human-readable
```

### Notifications

Configure `WEBHOOK_URL` for Slack/Discord notifications:

**Slack:**
```bash
WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Discord:**
```bash
WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
```

### Troubleshooting

**Backup fails:**
- Check database credentials
- Verify disk space: `df -h`
- Check permissions: `ls -la /var/backups/kolo/`

**S3 upload fails:**
- Verify AWS credentials: `aws sts get-caller-identity`
- Check bucket permissions
- Test connection: `aws s3 ls s3://kolo-backups/`

**Cron not running:**
- Check cron service: `sudo systemctl status cron`
- View cron logs: `grep CRON /var/log/syslog`

### Security Best Practices

1. **Encrypt backups:**
```bash
# Add to backup script
gpg --encrypt --recipient your@email.com $BACKUP_FILE
```

2. **Restrict file permissions:**
```bash
chmod 600 /etc/kolo/backup.env
chmod 700 /var/backups/kolo/
```

3. **Use separate backup user:**
```sql
CREATE USER kolo_backup WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kolo_backup;
```

4. **Enable S3 versioning:**
```bash
aws s3api put-bucket-versioning \
  --bucket kolo-backups \
  --versioning-configuration Status=Enabled
```

### Cost Estimation

**S3 Storage (estimate):**
- Backup size: ~10 MB compressed
- Daily backups: 30 x 10 MB = 300 MB/month
- Cost: $0.023/GB = ~$0.007/month

**S3 Transfer:**
- Upload: Free
- Download (restore): ~$0.09/GB

**Total monthly cost:** < $0.01 (negligible)
