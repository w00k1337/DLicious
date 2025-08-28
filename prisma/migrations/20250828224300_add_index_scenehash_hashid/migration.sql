-- Add an index to accelerate lookups by hashId for bulk import deduplication
CREATE INDEX IF NOT EXISTS "SceneHash_hashId_idx" ON "public"."SceneHash"("hashId");

