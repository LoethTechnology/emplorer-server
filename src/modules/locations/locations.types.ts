import type { company_location } from 'prisma/generated/prisma/client';
import type { ApiSuccessResponse } from '../../shared/utils/response';

export type CompanyLocation = company_location;

export type CompanyLocationResponse = ApiSuccessResponse<CompanyLocation>;
