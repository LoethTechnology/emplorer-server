-- AlterTable
ALTER TABLE "company_review" ADD COLUMN     "location_id" TEXT;

-- CreateTable
CREATE TABLE "company_location" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "address" TEXT,
    "is_headquarters" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_location_company_id_idx" ON "company_location"("company_id");

-- CreateIndex
CREATE INDEX "company_location_country_idx" ON "company_location"("country");

-- CreateIndex
CREATE INDEX "company_review_location_id_idx" ON "company_review"("location_id");

-- AddForeignKey
ALTER TABLE "company_location" ADD CONSTRAINT "company_location_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_review" ADD CONSTRAINT "company_review_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "company_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
