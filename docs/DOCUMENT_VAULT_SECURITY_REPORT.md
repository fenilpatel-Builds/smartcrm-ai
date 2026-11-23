# SmartCRM AI — Document Vault Security & Encryption Report (Phase 2)

**Evaluation Date:** November 23, 2026  
**Module:** Enterprise Document Vault (`/vault`, `server/controllers/documentController.js`)  
**Encryption Standard:** AES-256-GCM (Authenticated Encryption with Associated Data)  
**Status:** **Fully Implemented & Cryptographically Verified**

---

## 1. Overview & Threat Model

Enterprise CRM platforms store highly sensitive documents, including master service agreements (MSAs), non-disclosure agreements (NDAs), invoices, customer proposals, and tax records. 

### Threat Vectors Addressed:
1. **Physical Storage Leakage:** Unencrypted disks or compromised server backups exposing confidential customer files.
2. **File Tampering & Bit-Flipping:** Malicious alteration of contracts or financial records while stored on disk.
3. **Cross-Tenant Data Exposure:** One organization accessing or downloading documents uploaded by another tenant.
4. **Malicious Executable Uploads:** Uploading `.exe`, `.bat`, `.sh`, or script payloads masquerading as documents.

---

## 2. Cryptographic Architecture (AES-256-GCM)

All documents uploaded to SmartCRM AI are encrypted at rest using `AES-256-GCM`.

### Binary File Structure on Disk:
```
┌─────────────────┬─────────────────┬──────────────────┬──────────────────────┐
│  Magic Marker   │       IV        │     Auth Tag     │      Ciphertext      │
│  "SCED" (4B)    │    (12 Bytes)   │    (16 Bytes)    │      (Variable)      │
└─────────────────┴─────────────────┴──────────────────┴──────────────────────┘
```

### Encryption Flow:
1. File uploaded via multipart form.
2. Multer writes temporary buffer to secure storage directory (`server/uploads/documents`).
3. Extension filter verifies file is not in blocked list (`.exe`, `.bat`, `.cmd`, `.sh`, `.js`, etc.).
4. Encryption service generates a random 12-byte IV using `crypto.randomBytes(12)`.
5. AES-256-GCM cipher encrypts raw buffer and outputs a 16-byte authentication tag.
6. The combined buffer `[SCED][IV][Tag][Ciphertext]` is written back to disk.
7. Database metadata stores `isEncrypted: true`.

### Decryption & Streaming Flow:
1. User requests `GET /api/documents/:id/download`.
2. Cross-tenant check confirms the requesting user belongs to the owning organization.
3. Controller reads encrypted buffer and checks for `SCED` header.
4. IV and 16-byte Auth Tag are unpacked.
5. `crypto.createDecipheriv` with `decipher.setAuthTag()` verifies data authenticity.
6. If authentication succeeds, the original plaintext stream is delivered to the browser with sanitized filename headers.
7. If the ciphertext has been modified or tampered with on disk, deciphering throws an integrity failure, download is aborted, and a `SECURITY_DOCUMENT_INTEGRITY_FAILED` audit alert is triggered.

---

## 3. Test Verification Summary

From `server/tests/server.test.js`:
- **Workflow E:** Encrypted buffer confirmed to obscure plaintext, verified magic header `SCED`, verified exact plaintext restoration on download, and confirmed that a 1-bit tamper in ciphertext causes immediate decipher rejection.
- **Workflow C:** Verified cross-tenant download blocking.
