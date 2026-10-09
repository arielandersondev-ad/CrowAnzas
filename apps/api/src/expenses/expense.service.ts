import { Inject, Injectable } from '@nestjs/common';
import {
  normalizeAmount, sumAmounts, todayInTimezone,
  type CreateExpense, type Expense, type ExpenseWithUser, type DailySummary, type UsersDailySummary,
} from '@crowanzas/contracts';
import { APP_CONFIG, type AppConfig } from '../config.js';
import { UserService } from '../users/user.service.js';
import { EXPENSE_REPOSITORY, type ExpenseRepository } from './expense.repository.js';

@Injectable()
export class ExpenseService {
  constructor(
    @Inject(EXPENSE_REPOSITORY) private readonly repository: ExpenseRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(UserService) private readonly users: UserService,
  ) {}

  private day(date?: string): string { return date ?? todayInTimezone(this.config.timezone); }

  async create(userId: string, input: CreateExpense): Promise<Expense> {
    const user = await this.users.get(userId);
    return this.repository.create({
      userId: user.id, name: input.name.trim(), amount: normalizeAmount(input.amount), quantity: input.quantity,
      date: this.day(input.date), description: input.description?.trim() || null,
    });
  }

  async listForUser(userId: string, date?: string): Promise<Expense[]> {
    const user = await this.users.get(userId);
    return this.repository.listForUser(user.id, date);
  }

  listAll(date?: string): Promise<ExpenseWithUser[]> { return this.repository.listAll(date); }

  async summaryForUser(userId: string, date?: string): Promise<DailySummary> {
    const user = await this.users.get(userId);
    const day = this.day(date);
    const expenses = await this.repository.listForUser(user.id, day);
    return { userId: user.id, date: day, total: sumAmounts(expenses.map(expense => expense.amount)), count: expenses.length, expenses };
  }

  async summaryAll(date?: string): Promise<UsersDailySummary> {
    const day = this.day(date);
    const groups = await this.repository.listDailyUserExpenses(day);
    const users = groups.map(({ user, expenses }) => ({
      user, total: sumAmounts(expenses.map(expense => expense.amount)), count: expenses.length,
    }));
    return {
      date: day,
      // Sum individual expenses; group totals may exceed the single-expense input limit.
      total: sumAmounts(groups.flatMap(group => group.expenses.map(expense => expense.amount))),
      count: users.reduce((count, user) => count + user.count, 0),
      users,
    };
  }
}
