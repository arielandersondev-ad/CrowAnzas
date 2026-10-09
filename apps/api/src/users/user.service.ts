import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateUser, User } from '@crowanzas/contracts';
import { EXPENSE_REPOSITORY, type ExpenseRepository } from '../expenses/expense.repository.js';

@Injectable()
export class UserService {
  constructor(@Inject(EXPENSE_REPOSITORY) private readonly repository: ExpenseRepository) {}

  create(input: CreateUser): Promise<User> {
    return this.repository.createUser({ name: input.name.trim() });
  }

  list(): Promise<User[]> { return this.repository.listUsers(); }

  async get(userId: string): Promise<User> {
    const user = await this.repository.findUser(userId.toLowerCase());
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
