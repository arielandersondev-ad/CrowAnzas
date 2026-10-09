import { NotFoundException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  Prisma, PrismaClient, type Expense as DatabaseExpense, type User as DatabaseUser,
} from '../generated/prisma/client.js';
import type { CreateUser, Expense, ExpenseWithUser, User } from '@crowanzas/contracts';
import type { ExpenseRepository, NewExpense, UserDailyExpenses } from './expense.repository.js';

export function serializeUser(row: DatabaseUser): User {
  return { id: row.id, name: row.name, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export function serializeExpense(row: DatabaseExpense): Expense {
  return {
    id: row.id, userId: row.userId, name: row.name, amount: row.amount.toFixed(2), quantity: row.quantity,
    date: row.date.toISOString().slice(0, 10), description: row.description,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

function dateFilter(date?: string): { date?: Date } {
  return date === undefined ? {} : { date: new Date(`${date}T00:00:00.000Z`) };
}

export class PrismaExpenseRepository implements ExpenseRepository, OnModuleInit, OnModuleDestroy {
  readonly storage = 'prisma' as const;
  private readonly client: PrismaClient;

  constructor(databaseUrl: string) {
    const adapter = new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit(): Promise<void> {
    // Fail startup if persistence is unavailable; never fall back to memory.
    await this.client.$connect();
    await this.client.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> { await this.client.$disconnect(); }

  async createUser(input: CreateUser): Promise<User> {
    return serializeUser(await this.client.user.create({ data: { name: input.name } }));
  }

  async listUsers(): Promise<User[]> {
    const rows = await this.client.user.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return rows.map(serializeUser);
  }

  async findUser(userId: string): Promise<User | null> {
    const row = await this.client.user.findUnique({ where: { id: userId } });
    return row ? serializeUser(row) : null;
  }

  async create(input: NewExpense): Promise<Expense> {
    const { userId, ...expense } = input;
    try {
      const row = await this.client.expense.create({
        data: {
          ...expense, date: new Date(`${input.date}T00:00:00.000Z`),
          user: { connect: { id: userId } },
        },
      });
      return serializeExpense(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2025', 'P2003'].includes(error.code)) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async listForUser(userId: string, date?: string): Promise<Expense[]> {
    const rows = await this.client.expense.findMany({
      where: { userId, ...dateFilter(date) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map(serializeExpense);
  }

  async listAll(date?: string): Promise<ExpenseWithUser[]> {
    const rows = await this.client.expense.findMany({
      where: dateFilter(date), include: { user: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map(row => ({ ...serializeExpense(row), user: serializeUser(row.user) }));
  }

  async listDailyUserExpenses(date: string): Promise<UserDailyExpenses[]> {
    // Query from users so zero-expense profiles are included in the same read.
    const rows = await this.client.user.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { expenses: { where: dateFilter(date), orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] } },
    });
    return rows.map(row => ({ user: serializeUser(row), expenses: row.expenses.map(serializeExpense) }));
  }
}
