-- CreateEnum
CREATE TYPE "public"."HashType" AS ENUM ('PHASH', 'OSHASH', 'MD5');

-- CreateTable
CREATE TABLE "public"."Scene" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "stashId" INTEGER,
    "stashDbId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Scene_stashId_key" ON "public"."Scene"("stashId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_stashDbId_key" ON "public"."Scene"("stashDbId");

-- CreateIndex
CREATE UNIQUE INDEX "Hash_type_value_key" ON "public"."Hash"("type", "value");

-- CreateIndex
CREATE INDEX "_PerformerToScene_B_index" ON "public"."_PerformerToScene"("B");

-- CreateIndex
CREATE INDEX "_HashToScene_B_index" ON "public"."_HashToScene"("B");

-- AddForeignKey
ALTER TABLE "public"."_PerformerToScene" ADD CONSTRAINT "_PerformerToScene_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Performer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PerformerToScene" ADD CONSTRAINT "_PerformerToScene_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_HashToScene" ADD CONSTRAINT "_HashToScene_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Hash"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_HashToScene" ADD CONSTRAINT "_HashToScene_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
