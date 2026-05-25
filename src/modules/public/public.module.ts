import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
