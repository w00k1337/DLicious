-- AlterTable
ALTER TABLE "public"."Scene" ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "title" SET DEFAULT 'Untitled';
