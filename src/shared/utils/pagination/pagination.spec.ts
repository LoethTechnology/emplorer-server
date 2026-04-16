import { GetPageOptions, PaginateRes } from './pagination';

describe('pagination', () => {
  it('computes total pages and next/prev flags', () => {
    const res = PaginateRes([1, 2], 25, 2, 2, 10);
    expect(res.totalPages).toBe(3);
    expect(res.hasPrevPage).toBe(true);
    expect(res.hasNextPage).toBe(true);
  });

  it('GetPageOptions returns skip/take for page+limit', () => {
    expect(GetPageOptions(3, 10)).toEqual({ skip: 20, take: 10 });
  });
});
