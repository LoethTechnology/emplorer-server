import {
  isForeignKeyConstraintError,
  normalizeEmailValue,
  normalizeOptionalUrl,
  trimStringValue,
  USER_RESPONSE_MESSAGES,
} from './user.utils';

describe('user.utils', () => {
  describe('USER_RESPONSE_MESSAGES', () => {
    it('exposes the expected response message strings', () => {
      expect(USER_RESPONSE_MESSAGES).toEqual({
        localAccountExists: 'A local account already exists for this email.',
        emailAlreadyInUse: 'A user already exists for this email.',
        userNotFound: 'User account not found.',
        invalidPassword: 'Current password is incorrect.',
        localPasswordRequired: 'A local password is not set for this account.',
        passwordUpdated: 'Password updated successfully.',
        accountDeleted: 'Account deleted successfully.',
        accountDeleteBlocked:
          'User account cannot be deleted while related records still exist.',
      });
    });
  });

  describe('normalizeEmailValue', () => {
    it('trims and lowercases string input', () => {
      expect(normalizeEmailValue('  Test@Example.COM  ')).toBe(
        'test@example.com',
      );
    });

    it('returns non-string input unchanged', () => {
      expect(normalizeEmailValue(123)).toBe(123);
      expect(normalizeEmailValue(null)).toBeNull();
    });
  });

  describe('trimStringValue', () => {
    it('trims surrounding whitespace from string input', () => {
      expect(trimStringValue('  Jane Doe  ')).toBe('Jane Doe');
    });

    it('returns non-string input unchanged', () => {
      const value = { name: 'Jane' };

      expect(trimStringValue(value)).toBe(value);
      expect(trimStringValue(undefined)).toBeUndefined();
    });
  });

  describe('normalizeOptionalUrl', () => {
    it('trims URL strings', () => {
      expect(normalizeOptionalUrl('  https://example.com/avatar.png  ')).toBe(
        'https://example.com/avatar.png',
      );
    });

    it('returns undefined for empty trimmed strings', () => {
      expect(normalizeOptionalUrl('   ')).toBeUndefined();
    });

    it('returns non-string input unchanged', () => {
      const value = { href: 'https://example.com' };

      expect(normalizeOptionalUrl(value)).toBe(value);
      expect(normalizeOptionalUrl(null)).toBeNull();
    });
  });

  describe('isForeignKeyConstraintError', () => {
    it('returns true for Prisma foreign key constraint errors', () => {
      expect(isForeignKeyConstraintError({ code: 'P2003' })).toBe(true);
    });

    it('returns false for other error shapes', () => {
      expect(isForeignKeyConstraintError({ code: 'P2002' })).toBe(false);
      expect(isForeignKeyConstraintError(new Error('boom'))).toBe(false);
      expect(isForeignKeyConstraintError('P2003')).toBe(false);
      expect(isForeignKeyConstraintError(null)).toBe(false);
    });
  });
});
