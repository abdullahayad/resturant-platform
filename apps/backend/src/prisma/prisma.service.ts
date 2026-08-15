import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

// Composition rather than `extends PrismaClient`: the generated client's
// exported const infers as `any` (see generated client.ts's `@ts-nocheck`),
// which breaks member resolution through `extends`. The explicit `: PrismaClient`
// annotation below binds to the co-exported *type* (unaffected by that) instead.
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db: PrismaClient = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  async onModuleInit() {
    await this.db.$connect();
  }

  async onModuleDestroy() {
    await this.db.$disconnect();
  }
}
