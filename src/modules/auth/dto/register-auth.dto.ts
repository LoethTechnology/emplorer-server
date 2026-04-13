import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

function normalizeEmailValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function trimStringValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RegisterAuthDto {
  @IsEmail()
  @Transform(({ value }) => normalizeEmailValue(value))
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  @Transform(({ value }) => trimStringValue(value))
  first_name!: string;

  @IsString()
  @MinLength(1)
  @Transform(({ value }) => trimStringValue(value))
  last_name!: string;
}
