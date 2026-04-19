export interface PaginationResponseInterface<T> {
  data: T[];
  totalCount: number;
  limit: number;
  currentCount: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface LoginAttemptContextInterface {
  ip_address: string;
  device?: string;
  browser?: string;
  os?: string;
}
