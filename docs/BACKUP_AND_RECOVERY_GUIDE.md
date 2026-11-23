# SmartCRM AI — Database Backup, Disaster Recovery & High Availability Guide

## 1. Executive Summary

This guide outlines the enterprise backup, disaster recovery (DR), and business continuity procedures for SmartCRM AI's MongoDB databases and persistent document stores. Following this protocol achieves:
- **Recovery Point Objective (RPO)**: < 15 minutes (with replica set oplog archiving).
- **Recovery Time Objective (RTO)**: < 30 minutes (automated restoration from S3 archive).

---

## 2. Backup Strategy Overview

```
+-----------------------------------------------------------------------------------------+
|                                  MongoDB Replica Set 7.0                                |
|   Primary Node -----------> Secondary Node (Reads) -----------> Arbiter Node (Quorum)   |
+-----------------------------------------------------------------------------------------+
                                          |
                              Daily / Hourly mongodump
                                          |
                                          v
+-----------------------------------------------------------------------------------------+
|                                Backup Archival Engine                                   |
|   - Compressed archive (tar.gz with gzip level 9)                                       |
|   - Encrypted with OpenSSL AES-256-CBC before egress                                    |
|   - Uploaded to Cloud Object Storage (AWS S3 / GCP GCS / Azure Blob)                    |
|   - Lifecycle rule: 30-day active retention -> Glacier Glacier Deep Archive             |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Automated Backup Script (`backup.sh`)

```bash
#!/bin/bash
set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/smartcrm"
DB_NAME="smartcrm_prod"
ARCHIVE_NAME="smartcrm_backup_${TIMESTAMP}.gz"
S3_BUCKET="s3://mycompany-smartcrm-backups"
ENCRYPTION_PASS="${BACKUP_ENCRYPTION_SECRET}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting MongoDB backup for ${DB_NAME}..."

# Perform atomic consistent dump with oplog
mongodump \
  --uri="${MONGODB_URI}" \
  --db="${DB_NAME}" \
  --archive="${BACKUP_DIR}/${ARCHIVE_NAME}" \
  --gzip \
  --oplog

# Encrypt archive
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "${BACKUP_DIR}/${ARCHIVE_NAME}" \
  -out "${BACKUP_DIR}/${ARCHIVE_NAME}.enc" \
  -pass "pass:${ENCRYPTION_PASS}"

# Upload encrypted archive to secure off-site cloud storage
aws s3 cp "${BACKUP_DIR}/${ARCHIVE_NAME}.enc" "${S3_BUCKET}/${ARCHIVE_NAME}.enc" --sse AES256

# Cleanup temporary local copies older than 3 days
find "${BACKUP_DIR}" -type f -name "smartcrm_backup_*.gz*" -mtime +3 -delete

echo "[$(date)] Backup completed and uploaded: ${ARCHIVE_NAME}.enc"
```

---

## 4. Disaster Recovery & Restoration Script (`restore.sh`)

```bash
#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <backup_filename_or_s3_uri>"
  exit 1
fi

RESTORE_SOURCE="$1"
TEMP_DIR="/tmp/restore_${RANDOM}"
ENCRYPTION_PASS="${BACKUP_ENCRYPTION_SECRET}"

mkdir -p "${TEMP_DIR}"

echo "[$(date)] Fetching backup archive..."
if [[ "${RESTORE_SOURCE}" == s3://* ]]; then
  aws s3 cp "${RESTORE_SOURCE}" "${TEMP_DIR}/restore.enc"
else
  cp "${RESTORE_SOURCE}" "${TEMP_DIR}/restore.enc"
fi

echo "[$(date)] Decrypting backup archive..."
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in "${TEMP_DIR}/restore.enc" \
  -out "${TEMP_DIR}/restore.gz" \
  -pass "pass:${ENCRYPTION_PASS}"

echo "[$(date)] Restoring into MongoDB..."
mongorestore \
  --uri="${MONGODB_URI}" \
  --archive="${TEMP_DIR}/restore.gz" \
  --gzip \
  --oplogReplay \
  --drop

rm -rf "${TEMP_DIR}"
echo "[$(date)] Restoration finished successfully. Verify via GET /ready."
```

---

## 5. High Availability & Failover Configurations

1. **Replica Set Architecture**:
   - 3 nodes minimum (Primary, Secondary, Secondary/Arbiter) spread across separate availability zones.
   - Automatic election on primary failure within 5 seconds.
2. **Connection String Parameters**:
   `mongodb://node1:27017,node2:27017,node3:27017/smartcrm?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=true&w=majority`
3. **Write Concern**: `w: 'majority'` ensures writes are durable across multiple nodes before acknowledging client transactions.
