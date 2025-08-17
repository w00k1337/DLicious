/*
  Warnings:

  - You are about to drop the column `thePornDbNumericId` on the `Performer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[thePornDbId]` on the table `Scene` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[thePornDbId]` on the table `Studio` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Performer_thePornDbNumericId_key";

-- AlterTable
ALTER TABLE "public"."Performer" DROP COLUMN "thePornDbNumericId";

-- AlterTable
ALTER TABLE "public"."Scene" ADD COLUMN     "thePornDbId" TEXT;

-- AlterTable
ALTER TABLE "public"."Studio" ADD COLUMN     "thePornDbId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Scene_thePornDbId_key" ON "public"."Scene"("thePornDbId");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_thePornDbId_key" ON "public"."Studio"("thePornDbId");
