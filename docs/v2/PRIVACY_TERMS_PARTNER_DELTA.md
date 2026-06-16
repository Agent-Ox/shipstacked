# ShipStacked — Privacy + Terms Delta: Partner-Discovery Channel

**Purpose:** Make the Privacy Policy and Terms accurate for a partner-discovery channel (third-party access to published builder profiles for the purpose of getting builders found/hired — the platform's core promise). Written to be as legally accurate as possible for immediate publication. A lawyer should review post-publication; the inline `[LAWYER]` flags mark the specific sentences worth professional eyes. The text is publish-ready as written.

**Operating assumption (most defensible default; redline if wrong):** the partner receives access to *published* profile data for discovery/hiring purposes, equivalent in nature to the existing public/employer access the platform already provides, and the partner is described **by category** ("discovery and hiring partners") rather than named. This keeps the change consistent with the legal basis already used for public-profile display. If the partner instead receives a bulk export into their own system for a materially different purpose, the legitimate-interests basis below is weaker and the `[LAWYER]` flag on it becomes load-bearing — tell the lawyer explicitly.

---

## PART A — PRIVACY POLICY CHANGES (https://shipstacked.com/privacy)

### A.1 — Section 3 ("How We Use Your Data"): add one row to the legal-basis table

**Add this row** to the existing table (after the "Displaying your public profile to employers and visitors" row):

| Purpose | Legal basis |
| --- | --- |
| Making your published profile discoverable through trusted third-party discovery and hiring partners, so that you can be found and hired | Legitimate interests |

`[LAWYER]` — The legitimate-interests basis here is the same basis already used for "Displaying your public profile to employers and visitors" and is appropriate where partner access serves the same get-found/hiring purpose the user signed up for. If partner access extends to bulk export into a partner-controlled system or to a purpose beyond discovery/hiring, confirm whether a Legitimate Interests Assessment (LIA) is documented and whether this basis remains appropriate or consent is required.

### A.2 — Section 3: the "we do not sell / no advertising" line is unchanged

The existing sentence — "We do not use your data for advertising. We do not sell your data to third parties. ShipStacked is ad-free." — **remains true and stays exactly as is.** Partner discovery is not sale and not advertising. No change. (Stated here so the editor does not touch it.)

### A.3 — Section 4 ("Who We Share Your Data With"): the load-bearing fix

**This is the contradiction fix. The current text is false the moment the partner channel is live and MUST be replaced.**

**REMOVE this sentence exactly:**

> We do not share your personal data with any other third parties unless required by law.

**REPLACE the "Employer access" paragraph and the removed sentence with the following block** (the service-provider table above it is unchanged):

> **Discovery and hiring partners.** In addition to the service providers above, ShipStacked may make your **published** profile data available to trusted third-party discovery and hiring partners whose purpose is to help builders get found and hired — the same purpose for which ShipStacked itself displays your public profile. This applies only to profiles you have set to **published**; unpublished profiles are never shared this way. The data that may be shared is the same published profile data that is already public on the platform: your name, role, bio, location, skills, projects, links, and Build Feed posts. We share this data only with partners who are contractually bound to use it solely for discovery and hiring and not for advertising, resale, or any unrelated purpose. We do not sell your data. You can stop this sharing at any time by setting your profile to unpublished from your dashboard, which removes it from the platform and from partner availability going forward.
>
> **Other third parties.** Except for the service providers listed above and the discovery and hiring partners described here, we do not share your personal data with any other third parties unless required by law.
>
> **Public profile data.** Builder profiles marked as published are publicly accessible and may be indexed by search engines. This includes your name, role, bio, location, skills, projects, and Build Feed posts. You control this — set your profile to unpublished at any time from your dashboard.
>
> **Employer access.** Paid employers can view your published profile and message you directly. They cannot export or bulk-download your data.

`[LAWYER]` — Confirm: (1) whether discovery/hiring partners should be enumerated/named or category-described is acceptable under your transparency obligations; (2) whether the "contractually bound" representation requires a data processing agreement or controller-to-controller arrangement, and that such contracts exist before the channel is activated; (3) whether the opt-out-by-unpublishing mechanism is sufficient for the legitimate-interests right-to-object (Section 6 already grants right to object — this is consistent, but confirm the unpublish→partner-removal propagation is actually implemented before relying on it in the policy).

> **Implementation note (not policy text):** the policy now states that setting a profile to unpublished removes it from partner availability "going forward." The published-gate (`published=true`) already governs every existing public surface, so partner access MUST be built on the same gate for this sentence to be true. Do not activate any partner channel that reads unpublished profiles — that would make the published policy false. This is a build constraint, not a legal one.

### A.4 — Section 11 ("Changes to This Policy"): unchanged text, but it is now triggered

No text change. But §11 already says: *"We will notify registered users of material changes by email."* Expanding who can access profile data **is** a material change. Publishing this delta triggers that obligation. See Part C.

---

## PART B — TERMS OF SERVICE CHANGES (https://shipstacked.com/terms)

### B.1 — Section 4 (Builder Accounts): add a short transparency clause

**Add a new subsection 4.5:**

> **4.5 Discovery and hiring partners.** Your published profile may be made discoverable through trusted third-party discovery and hiring partners whose purpose is to help you get found and hired, as described in our Privacy Policy. This applies only to published profiles and only for discovery and hiring purposes. You can stop it at any time by setting your profile to unpublished. This does not change your ownership of your content (Section 8.1).

### B.2 — Section 5.2 (Use of builder data): unchanged

§5.2 binds **employers**. It is not contradicted by partner sharing (a different relationship governed by partner contracts, not the employer terms). No change. (Stated so the editor does not touch it; the employer bulk-export prohibition correctly remains.)

### B.3 — Section 8.1 (Your content): unchanged

The existing licence ("non-exclusive, worldwide, royalty-free licence to display and promote your content on the platform and in marketing materials") already covers display/promotion. Partner discovery of *published* data is consistent with it. No change. `[LAWYER]` — confirm "display and promote ... on the platform and in marketing materials" is read to encompass partner-channel discovery, or whether 8.1 should be lightly broadened; the conservative position is that 4.5 + the Privacy §4 block carry it and 8.1 needs no edit.

### B.4 — Section 14 ("Changes to These Terms"): unchanged text, now triggered

§14: *"We will notify registered users of material changes by email."* Same trigger as Privacy §11. See Part C.

---

## PART C — THE NOTIFICATION OBLIGATION (required, not optional)

Both documents commit, in their own words, to emailing registered users of material changes. This delta is a material change. Publishing the page edits without the notification would itself breach the published policy — so the notification is part of "doing this correctly," not extra ceremony.

This is **not** a blocker to publishing the page now. Sequence:

1. **Publish the page edits now** (Parts A + B) — closes the active contradiction immediately. This is the protection-now step. Do this first.
2. **Update the "Last updated" date** on both pages to today's date (both currently say "5 April 2026"). The change-notification and the date stamp are how the policy self-documents materiality.
3. **Send the notification email** to registered users — short, plain: "We've updated our Privacy Policy and Terms to describe how your published profile may be made discoverable through trusted hiring partners, consistent with helping you get found and hired. [link]. You can set your profile to unpublished at any time." This can follow within a reasonable window of the publish, but should not be skipped or indefinitely deferred — the policy says users *will* be notified.

`[LAWYER]` — confirm the notification wording and whether continued-use-constitutes-acceptance (Terms §14) is sufficient or whether affirmative re-consent is needed for the legitimate-interests change. The conservative read: notification + right-to-object-by-unpublishing is consistent with a legitimate-interests basis and does not require re-consent, but this is the single most important point for the lawyer.

---

## PART D — WHAT TO TELL CLAUDE CODE (the push)

This is a content edit to two page sources. Discovery-first still applies (find where the Privacy/Terms text is rendered — likely a constant or MDX/markdown in the repo), but it is low-risk (copy edit, no logic). The constraints:

- Edit ONLY the Privacy and Terms page content. No logic, no other files.
- Apply Part A (A.1 row, A.3 block replacement — including removing the exact false sentence) and Part B (new 4.5) verbatim from this document.
- Update both "Last updated" dates to today.
- Brand-free: the partner is category-described ("discovery and hiring partners"), never named. Zero brand tokens enter the committed text. (This keeps the standing brand-free rule intact and is also the more defensible policy posture.)
- Verify on prod after deploy: the false sentence ("We do not share your personal data with any other third parties unless required by law" as a standalone unconditional line) is GONE; the new §4 block renders; the new 4.5 renders; both dates updated.
- The implementation note in A.3 is a BUILD CONSTRAINT for whenever the partner channel is actually activated — it is not part of this push (this push is policy text only; no partner channel is being switched on by this commit). Record it in the commit message as a constraint for the future activation cycle.
- `git revert` reverses cleanly (text-only).

Commit message should state: closes the Privacy §4 contradiction ahead of any partner-channel activation; policy now accurately describes published-profile partner discoverability on a legitimate-interests basis (same basis as existing public-profile display); notification obligation (Privacy §11 / Terms §14) is triggered and tracked separately (Part C); lawyer review pending (flagged, not blocking); no partner channel is activated by this commit (policy-text only); brand-free (partner category-described, not named).

---

## SUMMARY (the honest state)

- **What this fixes now:** the live, factual contradiction in Privacy §4. After this publishes, the policy is accurate about what the platform may do, on a stated and defensible legal basis. That is the "protect me now" outcome.
- **What it does NOT do:** it does not, by itself, make every GDPR question airtight — the `[LAWYER]` flags mark the ~4 sentences where professional review genuinely matters (legal basis if scope is broad; partner contracts/DPA existence; re-consent vs. notification sufficiency; 8.1 scope). The text is written to the most defensible reading of each so you are protected as well as possible *now*, with the lawyer hardening it after.
- **The one thing that is not optional:** the user notification (Part C). Your own policy promises it. Publish the pages now; send the notification within a reasonable window; do not silently skip it.
- **Build constraint recorded:** no partner channel may read unpublished profiles or the published policy becomes false — partner access must ride the existing `published=true` gate. This binds the future activation, not this push.

*End of delta.*
