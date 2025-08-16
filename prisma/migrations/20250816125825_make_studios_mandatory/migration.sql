/*
  Warnings:

  - Made the column `studioId` on table `Scene` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Scene" DROP CONSTRAINT "Scene_studioId_fkey";

-- AlterTable
ALTER TABLE "public"."Scene" ALTER COLUMN "studioId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Scene" ADD CONSTRAINT "Scene_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
