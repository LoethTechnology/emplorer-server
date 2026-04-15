import { decryptUserName, encryptUserName } from './user-name-encryption';

describe('user-name-encryption', () => {
  const originalUserDataEncryptionKey = process.env.USER_DATA_ENCRYPTION_KEY;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalUserDataEncryptionKey === undefined) {
      delete process.env.USER_DATA_ENCRYPTION_KEY;
    } else {
      process.env.USER_DATA_ENCRYPTION_KEY = originalUserDataEncryptionKey;
    }

    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('encrypts and decrypts a user name with the configured encryption key', () => {
    process.env.USER_DATA_ENCRYPTION_KEY = 'test-encryption-secret';

    const encryptedValue = encryptUserName('Ada Lovelace');

    expect(encryptedValue).toBeDefined();
    expect(encryptedValue).toMatch(/^enc:v1:/);
    expect(encryptedValue).not.toBe('Ada Lovelace');
    expect(decryptUserName(encryptedValue)).toBe('Ada Lovelace');
  });

  it('falls back to JWT_SECRET when USER_DATA_ENCRYPTION_KEY is missing', () => {
    delete process.env.USER_DATA_ENCRYPTION_KEY;
    process.env.JWT_SECRET = 'jwt-fallback-secret';

    const encryptedValue = encryptUserName('Grace Hopper');

    expect(decryptUserName(encryptedValue)).toBe('Grace Hopper');
  });

  it('falls back to the development key outside production when no secrets are configured', () => {
    delete process.env.USER_DATA_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'test';

    const encryptedValue = encryptUserName('Katherine Johnson');

    expect(decryptUserName(encryptedValue)).toBe('Katherine Johnson');
  });

  it('returns passthrough values unchanged when they do not need encryption or decryption', () => {
    expect(encryptUserName(undefined)).toBeUndefined();
    expect(encryptUserName(null)).toBeNull();
    expect(encryptUserName('')).toBe('');
    expect(encryptUserName('enc:v1:iv:tag:data')).toBe('enc:v1:iv:tag:data');

    expect(decryptUserName(undefined)).toBeUndefined();
    expect(decryptUserName(null)).toBeNull();
    expect(decryptUserName('')).toBe('');
    expect(decryptUserName('Ada')).toBe('Ada');
    expect(decryptUserName('enc:v1:broken')).toBe('enc:v1:broken');
  });

  it('throws in production when no encryption secret is configured', () => {
    delete process.env.USER_DATA_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';

    expect(() => encryptUserName('Ada Lovelace')).toThrow(
      'USER_DATA_ENCRYPTION_KEY must be configured in production',
    );
  });
});
