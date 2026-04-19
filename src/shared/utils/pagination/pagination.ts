import { PaginationResponseInterface } from '@shared/types';

export const PaginateRes = <T>(
  data: T[],
  totalCount: number,
  currentCount: number,
  currentPage: number,
  limit: number,
): PaginationResponseInterface<T> => {
  return {
    data,
    totalCount,
    limit: limit || 10,
    currentCount,
    page: currentPage || 1,
    totalPages: Math.ceil(totalCount / limit) || 1,
    hasNextPage: limit * currentPage < totalCount,
    hasPrevPage: currentPage > 1,
  };
};

export const GetPageOptions = (page: number, limit: number) => {
  return {
    ...(page && { skip: (page - 1) * limit }),
    ...(limit && { take: limit }),
  };
};
