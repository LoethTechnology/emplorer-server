import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const ENCRYPTED_PREFIX = 'enc:v1';
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

function getEncryptionSecret(): string {
  const configuredSecret =
    process.env.USER_DATA_ENCRYPTION_KEY ?? process.env.JWT_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'development-only-user-data-key';
  }

  throw new Error('USER_DATA_ENCRYPTION_KEY must be configured in production');
}

function buildEncryptionKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

function isEncryptedValue(value: string): boolean {
  return value.startsWith(`${ENCRYPTED_PREFIX}:`);
}

export function encryptUserName(
  value: string | null | undefined,
): string | null | undefined {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    isEncryptedValue(value)
  ) {
    return value;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(
    ENCRYPTION_ALGORITHM,
    buildEncryptionKey(getEncryptionSecret()),
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptUserName(
  value: string | null | undefined,
): string | null | undefined {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !isEncryptedValue(value)
  ) {
    return value;
  }

  const [, , ivValue, authTagValue, encryptedValue] = value.split(':');

  if (!ivValue || !authTagValue || !encryptedValue) {
    return value;
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    buildEncryptionKey(getEncryptionSecret()),
    Buffer.from(ivValue, 'base64url'),
  );

  decipher.setAuthTag(
    Buffer.from(authTagValue, 'base64url').subarray(0, AUTH_TAG_BYTES),
  );

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
