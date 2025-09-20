-- CreateEnum
CREATE TYPE "public"."CupSize" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z');

-- CreateEnum
CREATE TYPE "public"."HashType" AS ENUM ('PHASH', 'OSHASH', 'MD5');

-- CreateTable
CREATE TABLE "public"."Performer" (
    "id" SERIAL NOT NULL,
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
    "id" SERIAL NOT NULL,
    "stashId" INTEGER,
    "stashDbId" TEXT,
    "thePornDbId" TEXT,
    "title" TEXT DEFAULT 'Untitled',
    "imageUrl" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hash" (
    "id" SERIAL NOT NULL,
    "type" "public"."HashType" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SceneHash" (
    "id" SERIAL NOT NULL,
    "hashId" INTEGER NOT NULL,
    "sceneId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneHash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_PerformerToScene" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PerformerToScene_AB_pkey" PRIMARY KEY ("A","B")
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
CREATE UNIQUE INDEX "Hash_type_value_key" ON "public"."Hash"("type", "value");

-- CreateIndex
CREATE INDEX "SceneHash_hashId_idx" ON "public"."SceneHash"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneHash_sceneId_hashId_key" ON "public"."SceneHash"("sceneId", "hashId");

-- CreateIndex
CREATE INDEX "_PerformerToScene_B_index" ON "public"."_PerformerToScene"("B");

-- AddForeignKey
ALTER TABLE "public"."SceneHash" ADD CONSTRAINT "SceneHash_hashId_fkey" FOREIGN KEY ("hashId") REFERENCES "public"."Hash"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SceneHash" ADD CONSTRAINT "SceneHash_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PerformerToScene" ADD CONSTRAINT "_PerformerToScene_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Performer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PerformerToScene" ADD CONSTRAINT "_PerformerToScene_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
