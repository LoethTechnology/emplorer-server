-- AlterTable
ALTER TABLE "company" DROP COLUMN "domain",
DROP COLUMN "headquarters";

-- AlterTable
ALTER TABLE "company_location" DROP COLUMN "city",
DROP COLUMN "state",
ALTER COLUMN "country" DROP NOT NULL;
