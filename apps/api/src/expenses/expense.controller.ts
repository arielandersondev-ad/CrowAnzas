import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, ValidationPipe } from '@nestjs/common';
import { CreateExpenseDto, DailyQueryDto } from './expense.dto.js';
import { ExpenseService } from './expense.service.js';

const bodyValidation = new ValidationPipe({
  // CreateExpenseDto has no userId field: even a matching owner in the body is rejected.
  transform: true, whitelist: true, forbidNonWhitelisted: true, expectedType: CreateExpenseDto,
});
const queryValidation = new ValidationPipe({
  transform: true, whitelist: true, forbidNonWhitelisted: true, expectedType: DailyQueryDto,
});

@Controller('users/:userId/expenses')
export class UserExpenseController {
  constructor(@Inject(ExpenseService) private readonly service: ExpenseService) {}

  @Post()
  create(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body(bodyValidation) input: CreateExpenseDto,
  ) { return this.service.create(userId, input); }

  @Get('summary')
  summary(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query(queryValidation) query: DailyQueryDto,
  ) { return this.service.summaryForUser(userId, query.date); }

  @Get()
  list(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query(queryValidation) query: DailyQueryDto,
  ) { return this.service.listForUser(userId, query.date); }
}

@Controller('expenses')
export class ExpenseController {
  constructor(@Inject(ExpenseService) private readonly service: ExpenseService) {}

  @Get('summary')
  summary(@Query(queryValidation) query: DailyQueryDto) { return this.service.summaryAll(query.date); }

  @Get()
  list(@Query(queryValidation) query: DailyQueryDto) { return this.service.listAll(query.date); }
}
