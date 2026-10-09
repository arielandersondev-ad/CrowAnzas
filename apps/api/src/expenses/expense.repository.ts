import type { CreateUser, Expense, ExpenseWithUser, User } from '@crowanzas/contracts';

export const EXPENSE_REPOSITORY = Symbol('EXPENSE_REPOSITORY');
export type NewExpense = Pick<Expense, 'userId' | 'name' | 'amount' | 'quantity' | 'date' | 'description'>;
export interface UserDailyExpenses {
  user: User;
  expenses: Expense[];
}

// Users and their expenses share one storage instance and one Prisma connection pool.
export interface ExpenseRepository {
  readonly storage: 'memory' | 'prisma';
  createUser(input: CreateUser): Promise<User>;
  listUsers(): Promise<User[]>;
  findUser(userId: string): Promise<User | null>;
  create(input: NewExpense): Promise<Expense>;
  listForUser(userId: string, date?: string): Promise<Expense[]>;
  listAll(date?: string): Promise<ExpenseWithUser[]>;
  listDailyUserExpenses(date: string): Promise<UserDailyExpenses[]>;
}
