import type { company, company_location } from 'prisma/generated/prisma/client';

export type PublicCompanyItem = Pick<company, 'id' | 'name' | 'logo_url'> & {
  locations: Pick<
    company_location,
    'id' | 'city' | 'state' | 'country' | 'is_headquarters'
  >[];
  total_reviews: number;
  mean_rating: number | null;
};
