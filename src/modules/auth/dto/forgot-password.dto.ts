import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'test@test.com',
    description: 'The email of the user to send a password reset OTP to',
  })
  @IsEmail()
  email!: string;
}
