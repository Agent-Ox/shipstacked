/**
 * Title selection for the GitHub paste extractor. Dependency-free so it can be
 * exercised directly by scripts/v2/verify-paste-title.ts.
 *
 * Candidate order: repo description → first README H1 → package.json name →
 * repo full name (always usable, the final fallback). A candidate is skipped
 * if it is a single short token (e.g. the stray "or" a `# or` shell comment
 * inside a README code fence used to produce).
 */

const MIN_SINGLE_TOKEN_LENGTH = 4;

export function isUsableTitle(candidate: string | null | undefined): candidate is string {
  if (!candidate) return false;
  const t = candidate.trim();
  if (!/[a-z]/i.test(t)) return false;
  if (!/\s/.test(t) && t.length < MIN_SINGLE_TOKEN_LENGTH) return false;
  return true;
}

/**
 * First Markdown H1 outside fenced code blocks. Lines like `# or` inside a
 * ```bash fence are shell comments, not headings.
 */
export function readmeFirstHeading(readme: string): string | null {
  const withoutFences = readme.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
  const m = withoutFences.match(/^#\s+(.+?)\s*#*\s*$/m);
  return m ? m[1].trim() : null;
}

export function pickGitHubTitle(input: {
  description?: string | null;
  readme?: string;
  packageName?: string | null;
  repoFullName: string;
}): string {
  const candidates = [
    input.description?.trim(),
    input.readme ? readmeFirstHeading(input.readme) : null,
    input.packageName?.trim(),
  ];
  return candidates.find(isUsableTitle) ?? input.repoFullName;
}
