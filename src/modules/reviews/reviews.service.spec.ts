import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should wrap review creation responses', () => {
    const createReviewDto = {};

    expect(service.create(createReviewDto as never)).toEqual({
      message: 'Company Review created successfully.',
      code: HttpStatus.CREATED,
      data: createReviewDto,
    });
  });

  it('should wrap review lookup responses', () => {
    expect(service.findOne(3)).toEqual({
      message: 'Company Review fetched successfully.',
      code: HttpStatus.OK,
      data: 'This action returns a #3 review',
    });
  });

  it('should wrap review update responses', () => {
    const updateReviewDto = { title: 'Updated' };

    expect(service.update(4, updateReviewDto as never)).toEqual({
      message: 'Company Review updated successfully.',
      code: HttpStatus.OK,
      data: {
        id: 4,
        review: updateReviewDto,
      },
    });
  });

  it('should wrap review deletion responses', () => {
    expect(service.remove(5)).toEqual({
      message: 'Company Review deleted successfully.',
      code: HttpStatus.OK,
      data: 'This action removes a #5 review',
    });
  });
});
