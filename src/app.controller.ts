import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import type { ApiSuccessResponse } from './shared/utils/response/response.utils';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): ApiSuccessResponse<string> {
    return this.appService.getHello();
  }
}
