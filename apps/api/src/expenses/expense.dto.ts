import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, ValidateBy, ValidateIf } from 'class-validator';
import {
  isValidDate, normalizeAmount, MAX_QUANTITY, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH,
  type CreateExpense,
} from '@crowanzas/contracts';

function CalendarDate(): PropertyDecorator {
  return ValidateBy({
    name: 'calendarDate',
    validator: { validate: isValidDate, defaultMessage: () => 'date must be a real calendar date (YYYY-MM-DD)' },
  });
}

export class CreateExpenseDto implements CreateExpense {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_NAME_LENGTH)
  name!: string;

  @ValidateBy({
    name: 'positiveMoney',
    validator: {
      validate: (value: unknown) => {
        try { normalizeAmount(value as string); return true; } catch { return false; }
      },
      defaultMessage: () => 'amount must be a positive decimal string up to 9999999999.99 with at most two decimals',
    },
  })
  amount!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity!: number;

  @ValidateIf((_object, value) => value !== undefined)
  @CalendarDate()
  date?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(MAX_DESCRIPTION_LENGTH)
  description?: string;
}

export class DailyQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @CalendarDate()
  date?: string;
}
