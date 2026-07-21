import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendVerificationEmailDto {
  @ApiProperty({
    example: 'test@test.com',
    description: 'The email of the user to send an email verification OTP to',
  })
  @IsEmail()
  email!: string;
}
