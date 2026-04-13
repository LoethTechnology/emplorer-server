import {
  decryptUserName,
  encryptUserName,
} from '../../utils/user-name-encryption';

type MutableRecord = Record<string, unknown>;

export function encryptUserNameValue(value: unknown): unknown {
  if (typeof value === 'string' || value === null || value === undefined) {
    return encryptUserName(value);
  }

  if (
    value &&
    typeof value === 'object' &&
    'set' in value &&
    (typeof value.set === 'string' || value.set === null)
  ) {
    return {
      ...(value as MutableRecord),
      set: encryptUserName(value.set),
    };
  }

  return value;
}

export function encryptUserPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const record = { ...(payload as MutableRecord) };

  if ('first_name' in record) {
    record.first_name = encryptUserNameValue(record.first_name);
  }

  if ('last_name' in record) {
    record.last_name = encryptUserNameValue(record.last_name);
  }

  return record;
}

export function encryptUserArgs(operation: string, args: unknown): unknown {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return args;
  }

  const record = { ...(args as MutableRecord) };

  if (operation === 'upsert') {
    if ('create' in record) {
      record.create = encryptUserPayload(record.create);
    }

    if ('update' in record) {
      record.update = encryptUserPayload(record.update);
    }

    return record;
  }

  if ('data' in record) {
    record.data = encryptUserPayload(record.data);
  }

  return record;
}

export function decryptUserRecord(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const record = payload as MutableRecord;

  if ('first_name' in record) {
    record.first_name = decryptUserName(record.first_name as string | null);
  }

  if ('last_name' in record) {
    record.last_name = decryptUserName(record.last_name as string | null);
  }

  return payload;
}

export function decryptResult(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map((item) => decryptUserRecord(item));
  }

  return decryptUserRecord(payload);
}

export function decryptOauthAccountResult(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload.map((item) => decryptOauthAccountResult(item));
  }

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const record = payload as MutableRecord;

  if ('user' in record) {
    record.user = decryptUserRecord(record.user);
  }

  return payload;
}
