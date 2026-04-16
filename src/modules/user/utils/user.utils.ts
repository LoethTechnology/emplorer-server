export const USER_RESPONSE_MESSAGES = {
  localAccountExists: 'A local account already exists for this email.',
  emailAlreadyInUse: 'A user already exists for this email.',
  userNotFound: 'User account not found.',
  invalidPassword: 'Current password is incorrect.',
  localPasswordRequired: 'A local password is not set for this account.',
  passwordUpdated: 'Password updated successfully.',
  accountDeleted: 'Account deleted successfully.',
  accountDeleteBlocked:
    'User account cannot be deleted while related records still exist.',
} as const;

export function normalizeEmailValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function trimStringValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeOptionalUrl(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export function isForeignKeyConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2003'
  );
}
