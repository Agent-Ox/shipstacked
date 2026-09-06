-- B2 (behavioural sweep 2026-09-06): make conversations.builder_profile_id nullable.
--
-- WHY
-- /api/messages/contact-team creates a conversation whose counterparty is a TEAM,
-- carried by subject_entity_id. There is no builder on the other end, so the route
-- wrote builder_profile_id = null — but the column is NOT NULL, so EVERY call to
-- the route failed:
--   500 null value in column "builder_profile_id" of relation "conversations"
--       violates not-null constraint
-- The team-contact path has therefore never worked in production. Dropping the
-- NOT NULL is the schema half of the fix; the route half is in the same commit.
--
-- SAFE
-- Purely permissive: DROP NOT NULL widens what the column accepts and rejects
-- nothing that was previously valid. Every existing row keeps its value. The FK
-- to profiles(id) is untouched, so a non-null value is still a real profile.
--
-- READERS ALREADY TOLERATE NULL
--   src/app/api/messages/route.ts  — team inbox selects on subject_entity_id;
--                                    the hirer-side `profiles!builder_profile_id`
--                                    embed yields null for these rows
--   src/app/messages/page.tsx:212  — builderForConv() defaults to {} and the name
--                                    falls back, so a null builder does not crash
--   Builder-side listing filters `.eq('builder_profile_id', profile.id)`, which
--   never matches a null row — team conversations stay out of builder inboxes.
--
-- APPLY: Supabase Dashboard → SQL Editor (invariant #4 — the terminal holds no
-- DDL credentials). Run the BEGIN/COMMIT block below verbatim.

BEGIN;

ALTER TABLE public.conversations
  ALTER COLUMN builder_profile_id DROP NOT NULL;

COMMIT;

-- VERIFY (expect is_nullable = 'YES'):
--   SELECT column_name, is_nullable
--     FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND table_name   = 'conversations'
--      AND column_name  = 'builder_profile_id';

-- ─────────────────────────────────────────────────────────────────────────────
-- REVERSAL
-- Only reversible while no null rows exist; SET NOT NULL fails if any team
-- conversation has been created. Delete or backfill those rows first.
--
--   BEGIN;
--   -- inspect what would block the reversal:
--   --   SELECT id, employer_email, subject_entity_id FROM public.conversations
--   --    WHERE builder_profile_id IS NULL;
--   ALTER TABLE public.conversations
--     ALTER COLUMN builder_profile_id SET NOT NULL;
--   COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
