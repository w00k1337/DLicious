/*
  Warnings:

  - A unique constraint covering the columns `[stashDbId]` on the table `Performer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Performer" ADD COLUMN     "stashDbId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Performer_stashDbId_key" ON "public"."Performer"("stashDbId");
