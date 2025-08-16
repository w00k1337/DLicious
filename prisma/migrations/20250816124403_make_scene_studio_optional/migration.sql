-- DropForeignKey
ALTER TABLE "public"."Scene" DROP CONSTRAINT "Scene_studioId_fkey";

-- AlterTable
ALTER TABLE "public"."Scene" ALTER COLUMN "studioId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Scene" ADD CONSTRAINT "Scene_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
