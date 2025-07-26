/*
  Warnings:

  - The `country` column on the `Performer` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Performer" DROP COLUMN "country",
ADD COLUMN     "country" TEXT;

-- DropEnum
DROP TYPE "Country";
