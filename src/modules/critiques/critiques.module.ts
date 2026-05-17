import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CritiquesController } from './critiques.controller';
import { CritiquesService } from './critiques.service';

@Module({
  imports: [AuthModule],
  controllers: [CritiquesController],
  providers: [CritiquesService],
})
export class CritiquesModule {}
