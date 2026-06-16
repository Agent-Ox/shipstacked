-- Phase 5 §C — Autonomous Agent flow: agent_profiles table.
--
-- Mirrors team_profiles (Phase 4) as the rich-fields sibling to a
-- kind='agent' entities row. principal_entity_id is the OPTIONAL pointer to a
-- team the owner admins; NULL = default to the owner's human entity
-- (resolved at runtime by resolveAgentPrincipal). Custom shipstacked:Agent
-- JSON-LD per locked decision Q1.
--
-- Applied via the Supabase Dashboard SQL Editor (Invariant #4 — the terminal
-- cannot apply DDL). This file is the canonical record of what was pasted.
--
-- Spec: docs/audit/PHASE5_AGENT_FLOW.md §C.1.

BEGIN;

CREATE TABLE public.agent_profiles (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL UNIQUE REFERENCES public.entities(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NULL,
  description TEXT NULL,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  focus TEXT NULL,
  principal_entity_id BIGINT NULL REFERENCES public.entities(id) ON DELETE SET NULL,
  logo_url TEXT NULL,
  contact_email TEXT NULL,
  contact_url TEXT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_profiles_entity ON public.agent_profiles(entity_id);
CREATE INDEX idx_agent_profiles_published ON public.agent_profiles(published) WHERE published = true;
CREATE INDEX idx_agent_profiles_principal ON public.agent_profiles(principal_entity_id) WHERE principal_entity_id IS NOT NULL;
CREATE INDEX idx_agent_profiles_provider ON public.agent_profiles(provider);

COMMIT;

-- Reversal (Phase 5 §C.3):
-- BEGIN;
-- DROP TABLE IF EXISTS public.agent_profiles;
-- COMMIT;
