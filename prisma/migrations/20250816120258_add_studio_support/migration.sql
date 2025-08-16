/*
  Warnings:

  - You are about to drop the column `isAvailableLocally` on the `Scene` table. All the data in the column will be lost.
  - Added the required column `studioId` to the `Scene` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Scene" DROP COLUMN "isAvailableLocally",
ADD COLUMN     "studioId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "stashId" INTEGER,
    "stashDbId" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Studio_stashId_key" ON "public"."Studio"("stashId");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_stashDbId_key" ON "public"."Studio"("stashDbId");

-- AddForeignKey
ALTER TABLE "public"."Scene" ADD CONSTRAINT "Scene_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."Studio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
