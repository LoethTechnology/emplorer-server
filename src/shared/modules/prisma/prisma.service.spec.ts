import {
  decryptOauthAccountResult,
  decryptResult,
  encryptUserArgs,
} from './prisma.utils';

jest.mock('../../utils/user-name-encryption/user-name-encryption', () => ({
  encryptUserName: jest.fn((value: string | null | undefined) =>
    value == null ? value : `enc:${value}`,
  ),
  decryptUserName: jest.fn((value: string | null | undefined) =>
    value == null ? value : value.replace(/^enc:/, ''),
  ),
}));

describe('shared/modules/prisma/prisma.utils.ts', () => {
  it('encrypts user data in create args', () => {
    expect(
      encryptUserArgs('create', {
        data: {
          first_name: 'Ada',
          last_name: 'Lovelace',
          email: 'ada@example.com',
        },
      }),
    ).toEqual({
      data: {
        first_name: 'enc:Ada',
        last_name: 'enc:Lovelace',
        email: 'ada@example.com',
      },
    });
  });

  it('encrypts both branches of upsert args', () => {
    expect(
      encryptUserArgs('upsert', {
        create: { first_name: 'Ada', last_name: 'Lovelace' },
        update: { first_name: { set: 'Grace' }, last_name: { set: null } },
      }),
    ).toEqual({
      create: { first_name: 'enc:Ada', last_name: 'enc:Lovelace' },
      update: {
        first_name: { set: 'enc:Grace' },
        last_name: { set: null },
      },
    });
  });

  it('decrypts user results', () => {
    expect(
      decryptResult({
        id: 'user-1',
        first_name: 'enc:Ada',
        last_name: 'enc:Lovelace',
      }),
    ).toEqual({
      id: 'user-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
    });
  });

  it('decrypts included oauth account users', () => {
    expect(
      decryptOauthAccountResult({
        id: 'oauth-1',
        user: {
          id: 'user-1',
          first_name: 'enc:Ada',
          last_name: 'enc:Lovelace',
        },
      }),
    ).toEqual({
      id: 'oauth-1',
      user: {
        id: 'user-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
      },
    });
  });
});
