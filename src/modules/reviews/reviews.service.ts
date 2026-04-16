import { Injectable } from '@nestjs/common';
import { CrudEnums, DbModels } from '../../shared/types';
import type { ApiSuccessResponse } from '../../shared/utils/response';
import { CrudResponse } from '../../shared/utils/response';
import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  create(
    createReviewDto: CreateReviewDto,
  ): ApiSuccessResponse<CreateReviewDto> {
    void createReviewDto;

    return CrudResponse(
      DbModels.COMPANY_REVIEW,
      CrudEnums.CREATE,
      createReviewDto,
    );
  }

  findAll(): ApiSuccessResponse<string[]> {
    return CrudResponse(DbModels.COMPANY_REVIEW, CrudEnums.READ, []);
  }

  findOne(id: number): ApiSuccessResponse<string> {
    return CrudResponse(
      DbModels.COMPANY_REVIEW,
      CrudEnums.READ,
      `This action returns a #${id} review`,
    );
  }

  update(
    id: number,
    updateReviewDto: UpdateReviewDto,
  ): ApiSuccessResponse<{ id: number; review: UpdateReviewDto }> {
    void updateReviewDto;

    return CrudResponse(DbModels.COMPANY_REVIEW, CrudEnums.UPDATE, {
      id,
      review: updateReviewDto,
    });
  }

  remove(id: number): ApiSuccessResponse<string> {
    return CrudResponse(
      DbModels.COMPANY_REVIEW,
      CrudEnums.DELETE,
      `This action removes a #${id} review`,
    );
  }
}
