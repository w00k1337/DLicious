/*
  Warnings:

  - You are about to drop the column `studioId` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the `Studio` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Scene" DROP CONSTRAINT "Scene_studioId_fkey";

-- AlterTable
ALTER TABLE "public"."Scene" DROP COLUMN "studioId";

-- DropTable
DROP TABLE "public"."Studio";
