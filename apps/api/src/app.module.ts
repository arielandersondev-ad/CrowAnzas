import { Controller, DynamicModule, Get, Inject, Module } from '@nestjs/common';
import type { HealthResponse } from '@crowanzas/contracts';
import { APP_CONFIG, type AppConfig } from './config.js';
import { ExpenseController, UserExpenseController } from './expenses/expense.controller.js';
import { ExpenseService } from './expenses/expense.service.js';
import { EXPENSE_REPOSITORY, type ExpenseRepository } from './expenses/expense.repository.js';
import { MemoryExpenseRepository } from './expenses/memory.repository.js';
import { UserController } from './users/user.controller.js';
import { UserService } from './users/user.service.js';

@Controller('health')
class HealthController {
  constructor(@Inject(EXPENSE_REPOSITORY) private readonly repository: ExpenseRepository) {}
  @Get()
  health(): HealthResponse { return { status: 'ok', storage: this.repository.storage }; }
}

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, UserController, UserExpenseController, ExpenseController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        {
          provide: EXPENSE_REPOSITORY,
          useFactory: async (): Promise<ExpenseRepository> => {
            if (config.storage === 'memory') return new MemoryExpenseRepository();
            const { PrismaExpenseRepository } = await import('./expenses/prisma.repository.js');
            return new PrismaExpenseRepository(config.databaseUrl!);
          },
        },
        UserService,
        ExpenseService,
      ],
    };
  }
}
