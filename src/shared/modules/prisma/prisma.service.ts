import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'prisma/generated/prisma/client';
import {
  decryptOauthAccountResult,
  decryptResult,
  encryptUserArgs,
} from './prisma.utils';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({
      adapter,
      omit: {
        user: {
          password: true,
        },
      },
    });

    return this.$extends({
      name: 'userNameEncryption',
      query: {
        user: {
          async $allOperations({ args, operation, query }) {
            const result = await query(
              encryptUserArgs(operation, args) as typeof args,
            );
            return decryptResult(result);
          },
        },
        oauth_account: {
          async $allOperations({ args, query }) {
            const result = await query(args);
            return decryptOauthAccountResult(result);
          },
        },
      },
    }) as PrismaService;
  }
}
