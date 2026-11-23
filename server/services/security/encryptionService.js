import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit recommended for GCM
const AUTH_TAG_LENGTH = 16;
const MAGIC_HEADER = Buffer.from('SCED', 'utf8'); // SmartCRM Encrypted Document magic marker

/**
 * Returns a 32-byte Buffer key for AES-256
 */
const getMasterKey = () => {
  const secret = process.env.DOCUMENT_ENCRYPTION_KEY || 'smartcrm_doc_vault_secret_2026_encryption_key_32b!';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a Buffer using AES-256-GCM
 * Output format: [MAGIC_HEADER (4 bytes)][IV (12 bytes)][AUTH_TAG (16 bytes)][CIPHERTEXT]
 */
export const encryptDocumentBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Encryption input must be a Buffer.');
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([MAGIC_HEADER, iv, authTag, ciphertext]);
};

/**
 * Decrypts an encrypted document Buffer using AES-256-GCM
 * Verifies magic marker, authenticates with authTag, and recovers plaintext
 */
export const decryptDocumentBuffer = (encryptedBuffer) => {
  if (!Buffer.isBuffer(encryptedBuffer)) {
    throw new Error('Decryption input must be a Buffer.');
  }

  const minLength = MAGIC_HEADER.length + IV_LENGTH + AUTH_TAG_LENGTH;
  if (encryptedBuffer.length < minLength) {
    throw new Error('Encrypted file format invalid or corrupted (too short).');
  }

  // Check magic marker
  const header = encryptedBuffer.subarray(0, 4);
  if (!header.equals(MAGIC_HEADER)) {
    // If not matching SCED header, it might be legacy unencrypted or invalid
    throw new Error('Invalid encrypted document format header.');
  }

  const iv = encryptedBuffer.subarray(4, 4 + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(4 + IV_LENGTH, 4 + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(4 + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
  } catch (err) {
    throw new Error(`Document integrity verification failed (tampered or corrupted): ${err.message}`);
  }
};

/**
 * Checks whether a buffer has the encrypted document header
 */
export const isEncryptedDocument = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  return buffer.subarray(0, 4).equals(MAGIC_HEADER);
};
