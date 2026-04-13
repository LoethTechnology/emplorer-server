/*
  Warnings:

  - You are about to drop the column `display_name` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `headline` on the `user` table. All the data in the column will be lost.
  - Made the column `first_name` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `last_name` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "display_name",
DROP COLUMN "headline",
ALTER COLUMN "first_name" SET NOT NULL,
ALTER COLUMN "last_name" SET NOT NULL;
