ALTER TABLE "users" ADD COLUMN "linkedin_photo_key" text;--> statement-breakpoint
-- Backfill people whose LinkedIn photo we already copied, so their next sign-in does not download it again.
UPDATE "users"
SET "linkedin_photo_key" = regexp_replace(coalesce("linkedin_raw"->>'picture', "linkedin_raw"->>'avatar_url'), '^https?://([^?#]*).*$', '\1')
WHERE "linkedin_photo_key" IS NULL
  AND "photo_edited" = false
  AND "photo_url" LIKE '%/storage/v1/object/public/avatars/%'
  AND coalesce("linkedin_raw"->>'picture', "linkedin_raw"->>'avatar_url') LIKE 'http%';
