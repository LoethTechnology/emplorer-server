import type { company } from 'prisma/generated/prisma/client';
import type { ApiSuccessResponse } from '../../shared/utils/response';

export type Company = company;

export type CompanyResponse = ApiSuccessResponse<Company>;
