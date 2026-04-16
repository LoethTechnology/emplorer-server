import { Injectable } from '@nestjs/common';
import { CrudEnums, DbModels } from './shared/types';
import { type ApiSuccessResponse, CrudResponse } from './shared/utils/response';

@Injectable()
export class AppService {
  getHello(): ApiSuccessResponse<string> {
    return CrudResponse(DbModels.APPLICATION, CrudEnums.READ, 'Hello World!');
  }
}
