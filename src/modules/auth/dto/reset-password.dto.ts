import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'test@test.com',
    description: 'The email of the user',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'The one-time password sent to the user',
  })
  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'The new password for the user',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
