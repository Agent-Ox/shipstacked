-- Phase 8 §F Block 2.7: NavBar "Your team" link RLS fix.
-- Lets an authenticated user read their OWN team_admins rows
-- so the Block 2 "Your team" / "Edit team" nav affordances render.
-- Read-only, self-scoped; writes remain service-role-only (unchanged).
--
-- Discovered via behavioral test (transient auth user + seeded row):
-- service-role saw the row; the row's owner under authenticated session
-- saw nothing. RLS enabled, no SELECT policy for self-read existed.

CREATE POLICY "team_admins self read"
  ON public.team_admins FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Reversal (Phase 8 §F.B2.7):
-- DROP POLICY IF EXISTS "team_admins self read" ON public.team_admins;
