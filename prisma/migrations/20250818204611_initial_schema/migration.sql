-- CreateEnum
CREATE TYPE "public"."CupSize" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z');

-- CreateEnum
CREATE TYPE "public"."HashType" AS ENUM ('PHASH', 'OSHASH', 'MD5');

-- CreateTable
CREATE TABLE "public"."Performer" (
    "id" TEXT NOT NULL,
    "stashId" INTEGER NOT NULL,
    "stashDbId" TEXT,
    "thePornDbId" TEXT,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "country" TEXT,
    "birthdate" TIMESTAMP(3),
    "cupSize" "public"."CupSize",
    "bandSize" INTEGER,
    "hasNaturalBreasts" BOOLEAN,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isMonitored" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Performer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Scene" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "stashId" INTEGER,
    "stashDbId" TEXT,
    "thePornDbId" TEXT,
    "studioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "stashId" INTEGER,
    "stashDbId" TEXT,
    "thePornDbId" INTEGER,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hash" (
    "id" TEXT NOT NULL,
    "type" "public"."HashType" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_PerformerToScene" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PerformerToScene_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_HashToScene" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HashToScene_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Performer_stashId_key" ON "public"."Performer"("stashId");

-- CreateIndex
CREATE UNIQUE INDEX "Performer_stashDbId_key" ON "public"."Performer"("stashDbId");

-- CreateIndex
CREATE UNIQUE INDEX "Performer_thePornDbId_key" ON "public"."Performer"("thePornDbId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_stashId_key" ON "public"."Scene"("stashId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_stashDbId_key" ON "public"."Scene"("stashDbId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_thePornDbId_key" ON "public"."Scene"("thePornDbId");

-- CreateIndex
CREATE INDEX "Scene_title_releasedAt_idx" ON "public"."Scene"("title", "releasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_stashId_key" ON "public"."Studio"("stashId");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_stashDbId_key" ON "public"."Studio"("stashDbId");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_thePornDbId_key" ON "public"."Studio"("thePornDbId");

-- CreateIndex
CREATE INDEX "Studio_name_idx" ON "public"."Studio"("name");

-- CreateIndex
CREATE INDEX "Hash_value_idx" ON "public"."Hash"("value");

-- CreateIndex
CREATE UNIQUE INDEX "Hash_type_value_key" ON "public"."Hash"("type", "value");

-- CreateIndex
CREATE INDEX "_PerformerToScene_B_index" ON "public"."_PerformerToScene"("B");

-- CreateIndex
CREATE INDEX "_HashToScene_B_index" ON "public"."_HashToScene"("B");

-- AddForeignKey
ALTER TABLE "public"."Scene" ADD CONSTRAINT "Scene_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "public"."Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PerformerToScene" ADD CONSTRAINT "_PerformerToScene_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Performer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PerformerToScene" ADD CONSTRAINT "_PerformerToScene_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_HashToScene" ADD CONSTRAINT "_HashToScene_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Hash"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_HashToScene" ADD CONSTRAINT "_HashToScene_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
