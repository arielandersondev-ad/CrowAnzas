import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, ValidationPipe } from '@nestjs/common';
import { CreateUserDto } from './user.dto.js';
import { UserService } from './user.service.js';

const bodyValidation = new ValidationPipe({
  transform: true, whitelist: true, forbidNonWhitelisted: true, expectedType: CreateUserDto,
});

@Controller('users')
export class UserController {
  constructor(@Inject(UserService) private readonly service: UserService) {}

  @Post()
  create(@Body(bodyValidation) input: CreateUserDto) { return this.service.create(input); }

  @Get()
  list() { return this.service.list(); }

  @Get(':userId')
  get(@Param('userId', new ParseUUIDPipe()) userId: string) { return this.service.get(userId); }
}
