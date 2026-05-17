import type { company, company_location } from 'prisma/generated/prisma/client';
import type { ApiSuccessResponse } from '../../shared/utils/response';

export type Company = company;

export type CompanyResponse = ApiSuccessResponse<Company>;

export type CompanyTypeaheadItem = Pick<company, 'id' | 'name' | 'logo_url'> & {
  locations: Pick<
    company_location,
    'city' | 'state' | 'country' | 'is_headquarters'
  >[];
};

export type CompanyTypeaheadResponse = ApiSuccessResponse<
  CompanyTypeaheadItem[]
>;
