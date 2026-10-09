import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import type { CreateUser, Expense, ExpenseWithUser, User } from '@crowanzas/contracts';
import type { ExpenseRepository, NewExpense, UserDailyExpenses } from './expense.repository.js';

export class MemoryExpenseRepository implements ExpenseRepository {
  readonly storage = 'memory' as const;
  private readonly users: User[] = [];
  private readonly expenses: Expense[] = [];

  // Intentionally empty on startup; records persist for this process's lifetime.
  async createUser(input: CreateUser): Promise<User> {
    const timestamp = new Date().toISOString();
    const user: User = { id: randomUUID(), name: input.name, createdAt: timestamp, updatedAt: timestamp };
    this.users.push(user);
    return { ...user };
  }

  private orderedUsers(): User[] {
    return this.users.slice().reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(user => ({ ...user }));
  }

  async listUsers(): Promise<User[]> { return this.orderedUsers(); }

  async findUser(userId: string): Promise<User | null> {
    const user = this.users.find(entry => entry.id === userId);
    return user ? { ...user } : null;
  }

  async create(input: NewExpense): Promise<Expense> {
    if (!this.users.some(user => user.id === input.userId)) throw new NotFoundException('User not found');
    const timestamp = new Date().toISOString();
    const expense: Expense = { ...input, id: randomUUID(), createdAt: timestamp, updatedAt: timestamp };
    this.expenses.push(expense);
    return { ...expense };
  }

  private orderedExpenses(userId?: string, date?: string): Expense[] {
    // Reverse insertion order resolves millisecond ties with newest first.
    return this.expenses.slice().reverse()
      .filter(expense => (userId === undefined || expense.userId === userId)
        && (date === undefined || expense.date === date))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(expense => ({ ...expense }));
  }

  async listForUser(userId: string, date?: string): Promise<Expense[]> {
    return this.orderedExpenses(userId, date);
  }

  async listAll(date?: string): Promise<ExpenseWithUser[]> {
    const owners = new Map(this.users.map(user => [user.id, user]));
    return this.orderedExpenses(undefined, date).map(expense => ({
      ...expense, user: { ...owners.get(expense.userId)! },
    }));
  }

  async listDailyUserExpenses(date: string): Promise<UserDailyExpenses[]> {
    const grouped = new Map<string, Expense[]>();
    for (const expense of this.orderedExpenses(undefined, date)) {
      const entries = grouped.get(expense.userId) ?? [];
      entries.push(expense);
      grouped.set(expense.userId, entries);
    }
    return this.orderedUsers().map(user => ({ user, expenses: grouped.get(user.id) ?? [] }));
  }
}
