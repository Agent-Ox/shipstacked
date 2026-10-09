/**
 * GitHub source extractor.
 *
 * Pulls repo description, README, languages, top-level contents, and the
 * dep manifests (package.json / requirements.txt / pyproject.toml) via the
 * public GitHub REST API. Unauthenticated — 60 req/hr budget. Caches each
 * endpoint response for 6h in Upstash. Falls back gracefully (no throw)
 * when the API rate-limits.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.2.
 */

import { Redis } from '@upstash/redis';
import type { Artifact, StackElement } from '@/schemas/proof-receipt-v0.1';
import type { AnalyzeResponse, ExtractorInput } from '@/lib/paste/analyzer';
import stackVocab from '@/config/stack-vocab.json';
import { pickGitHubTitle } from '@/lib/paste/title';

const USER_AGENT = 'ShipStacked-Analyzer/0.1';
const FETCH_TIMEOUT_MS = 5_000;
const CACHE_TTL_SECONDS = 6 * 60 * 60;
const MAX_ARTIFACTS = 4;
const README_TRUNCATE = 2000;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface GitHubRepoMeta {
  full_name: string;
  description: string | null;
  homepage: string | null;
  default_branch: string;
  html_url: string;
}

interface GitHubContentEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
}

interface GitHubReadme {
  content: string; // base64
  encoding: string;
}

/**
 * Map an npm package name to a canonical stack-vocab name + category.
 * Returning null means we don't recognize it and won't emit a stack entry.
 */
const NPM_TO_VOCAB: Record<string, { name: string; category: StackElement['category'] }> = {
  '@anthropic-ai/sdk': { name: 'anthropic-sdk', category: 'framework' },
  openai: { name: 'openai-sdk', category: 'framework' },
  '@langchain/langgraph': { name: 'langgraph', category: 'framework' },
  langchain: { name: 'langchain', category: 'framework' },
  '@langchain/community': { name: 'langchain', category: 'framework' },
  llamaindex: { name: 'llamaindex', category: 'framework' },
  '@llamaindex/core': { name: 'llamaindex', category: 'framework' },
  crewai: { name: 'crewai', category: 'framework' },
  '@mastra/core': { name: 'mastra', category: 'framework' },
  mastra: { name: 'mastra', category: 'framework' },
  ai: { name: 'vercel-ai-sdk', category: 'framework' },
  next: { name: 'next', category: 'framework' },
  react: { name: 'react', category: 'framework' },
  svelte: { name: 'svelte', category: 'framework' },
  vue: { name: 'vue', category: 'framework' },
  express: { name: 'express', category: 'framework' },
  '@supabase/supabase-js': { name: 'supabase', category: 'infra' },
  '@supabase/ssr': { name: 'supabase', category: 'infra' },
  '@upstash/redis': { name: 'upstash', category: 'infra' },
  resend: { name: 'resend', category: 'service' },
  stripe: { name: 'stripe', category: 'service' },
  '@stripe/stripe-js': { name: 'stripe', category: 'service' },
};

const PYPI_TO_VOCAB: Record<string, { name: string; category: StackElement['category'] }> = {
  anthropic: { name: 'anthropic-sdk', category: 'framework' },
  openai: { name: 'openai-sdk', category: 'framework' },
  langchain: { name: 'langchain', category: 'framework' },
  langgraph: { name: 'langgraph', category: 'framework' },
  'llama-index': { name: 'llamaindex', category: 'framework' },
  llama_index: { name: 'llamaindex', category: 'framework' },
  llamaindex: { name: 'llamaindex', category: 'framework' },
  crewai: { name: 'crewai', category: 'framework' },
  fastapi: { name: 'fastapi', category: 'framework' },
  flask: { name: 'flask', category: 'framework' },
  django: { name: 'django', category: 'framework' },
};

const LANG_TO_VOCAB: Record<string, string> = {
  TypeScript: 'typescript',
  JavaScript: 'javascript',
  Python: 'python',
  Rust: 'rust',
  Go: 'go',
  Swift: 'swift',
  Ruby: 'ruby',
  Java: 'java',
  Kotlin: 'kotlin',
};

const STACK_SIGNAL_FILES: Record<string, { name: string; category: StackElement['category'] }> = {
  'CLAUDE.md': { name: 'claude-code', category: 'tool' },
  '.cursorrules': { name: 'cursor', category: 'tool' },
  'mcp.json': { name: 'mcp', category: 'tool' },
  '.cursor': { name: 'cursor', category: 'tool' },
  'AGENTS.md': { name: 'claude-code', category: 'tool' },
  'langgraph.json': { name: 'langgraph', category: 'framework' },
};

/**
 * Capability terms harvested from README. Distinct from stack terms — these
 * are abstract (rag, agent, eval) rather than concrete (langgraph, claude).
 *
 * TODO: when extractors B/C ship, lift shared capability terms to
 * src/config/capabilities-vocab.json. Local-to-extractor is correct for
 * now — capability vocabulary varies materially by platform.
 */
const CAPABILITY_TERMS: ReadonlyArray<{ tag: string; match: RegExp }> = [
  { tag: 'rag-pipeline', match: /\brag\b|retrieval[- ]augmented/i },
  { tag: 'mcp-server', match: /\bmcp\b|model[- ]context[- ]protocol/i },
  { tag: 'agent-orchestration', match: /\bagent[s]?\b|\bmulti[- ]?agent\b/i },
  { tag: 'evaluation', match: /\beval[s]?\b|\bevaluation[s]?\b/i },
  { tag: 'fine-tuning', match: /\bfine[- ]tun(e|ing)\b/i },
  { tag: 'prompt-engineering', match: /\bprompt[- ]engineering\b|\bprompt[ -]template[s]?\b/i },
  { tag: 'tool-use', match: /\btool[- ]use\b|\bfunction[- ]calling\b/i },
  { tag: 'vector-search', match: /\bvector[- ]search\b|\bembedding[s]?\b/i },
  { tag: 'streaming', match: /\bstreaming\b|\bserver[- ]sent[- ]events\b|\bSSE\b/i },
];

class AbortAfter {
  static signal(ms: number): AbortSignal {
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  }
}

async function ghFetch<T>(
  endpoint: string,
  cacheKey: string
): Promise<{ data: T | null; rateLimited: boolean; status: number }> {
  const cached = await redis.get<{ data: T; status: number }>(cacheKey);
  if (cached) return { data: cached.data, rateLimited: false, status: cached.status };

  let res: Response;
  try {
    res = await fetch(`https://api.github.com${endpoint}`, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
      },
      signal: AbortAfter.signal(FETCH_TIMEOUT_MS),
    });
  } catch {
    return { data: null, rateLimited: false, status: 0 };
  }

  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      return { data: null, rateLimited: true, status: res.status };
    }
  }
  if (!res.ok) {
    return { data: null, rateLimited: false, status: res.status };
  }
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    return { data: null, rateLimited: false, status: res.status };
  }
  await redis.set(cacheKey, { data, status: res.status }, { ex: CACHE_TTL_SECONDS });
  return { data, rateLimited: false, status: res.status };
}

function parseOwnerRepo(url: URL): { owner: string; repo: string } | null {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0];
  let repo = parts[1];
  if (repo.endsWith('.git')) repo = repo.slice(0, -4);
  return { owner, repo };
}

function decodeBase64(s: string): string {
  // GitHub API returns base64 with embedded newlines.
  return Buffer.from(s.replace(/\n/g, ''), 'base64').toString('utf-8');
}

/**
 * Extract candidate deployment URLs from README markdown. Looks for
 * well-known hosting subdomains. Conservative — does not try to follow
 * "Demo:" prose unless paired with a URL on the same line.
 */
function extractDeploymentUrls(readme: string): string[] {
  const out = new Set<string>();
  const hostRe =
    /https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:vercel\.app|netlify\.app|fly\.dev|replit\.app|replit\.dev|pages\.dev|deno\.dev)(?:\/[^\s)\]]*)?/gi;
  const m = readme.match(hostRe);
  if (m) for (const u of m) out.add(u);
  return [...out];
}

function harvestCapabilities(readme: string): string[] {
  const found = new Set<string>();
  for (const { tag, match } of CAPABILITY_TERMS) {
    if (match.test(readme)) found.add(tag);
  }
  return [...found];
}

function parsePackageJsonDeps(content: string): StackElement[] {
  const out: StackElement[] = [];
  try {
    const parsed = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all: Array<[string, string]> = [
      ...Object.entries(parsed.dependencies ?? {}),
      ...Object.entries(parsed.devDependencies ?? {}),
    ];
    for (const [pkg, ver] of all) {
      const v = NPM_TO_VOCAB[pkg];
      if (!v) continue;
      out.push({
        name: v.name,
        category: v.category,
        version: ver.replace(/^[^\d]*/, '').slice(0, 40) || undefined,
        role: 'primary',
      });
    }
  } catch {
    /* ignore parse errors */
  }
  return out;
}

function parseRequirementsTxt(content: string): StackElement[] {
  const out: StackElement[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.split('#')[0].trim();
    if (!line || line.startsWith('-')) continue;
    const pkg = line.split(/[<>=!~]/)[0].trim().toLowerCase();
    const v = PYPI_TO_VOCAB[pkg];
    if (!v) continue;
    out.push({ name: v.name, category: v.category, role: 'primary' });
  }
  return out;
}

function parsePyprojectToml(content: string): StackElement[] {
  // Minimal TOML key extractor. Looks for [tool.poetry.dependencies],
  // [project.dependencies], or top-level dependencies blocks. Avoids a TOML
  // parser dep for Part A; readable-enough at the cost of edge-case misses.
  const out: StackElement[] = [];
  const blockRe =
    /\[(?:tool\.poetry\.dependencies|project\.dependencies|tool\.poetry\.dev-dependencies)\]([\s\S]*?)(?:\n\[|$)/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(content)) !== null) {
    for (const line of m[1].split('\n')) {
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim().replace(/['"]/g, '').toLowerCase();
      if (!key || key.startsWith('#')) continue;
      const v = PYPI_TO_VOCAB[key];
      if (!v) continue;
      out.push({ name: v.name, category: v.category, role: 'primary' });
    }
  }
  // Also scan a top-level `dependencies = [ ... ]` form (PEP 621).
  const pep621 = content.match(/^dependencies\s*=\s*\[([\s\S]*?)\]/m);
  if (pep621) {
    for (const item of pep621[1].split(',')) {
      const cleaned = item.replace(/['"\s]/g, '').split(/[<>=!~]/)[0].toLowerCase();
      if (!cleaned) continue;
      const v = PYPI_TO_VOCAB[cleaned];
      if (!v) continue;
      out.push({ name: v.name, category: v.category, role: 'primary' });
    }
  }
  return out;
}

function dedupeStack(elements: StackElement[]): StackElement[] {
  const seen = new Map<string, StackElement>();
  for (const e of elements) {
    const key = `${e.category}:${e.name}`;
    if (!seen.has(key)) seen.set(key, e);
  }
  return [...seen.values()];
}

export async function extractGitHub(input: ExtractorInput): Promise<AnalyzeResponse> {
  const ownerRepo = parseOwnerRepo(input.url);
  if (!ownerRepo) {
    return {
      title_draft: input.classifierMetadata.title ?? '',
      description_draft: input.classifierMetadata.description ?? '',
      artifacts: [
        {
          kind: 'url',
          url: input.url.href,
          fetched_at: new Date().toISOString(),
        },
      ],
      stack: [],
      outcomes_suggestions: [],
      capabilities: [],
    };
  }
  const { owner, repo } = ownerRepo;
  const base = `gh:${owner}/${repo}`;

  // Pull metadata, README, languages, top-level contents in parallel.
  const [meta, readme, langs, contents] = await Promise.all([
    ghFetch<GitHubRepoMeta>(`/repos/${owner}/${repo}`, `${base}:meta`),
    ghFetch<GitHubReadme>(`/repos/${owner}/${repo}/readme`, `${base}:readme`),
    ghFetch<Record<string, number>>(`/repos/${owner}/${repo}/languages`, `${base}:languages`),
    ghFetch<GitHubContentEntry[]>(`/repos/${owner}/${repo}/contents/`, `${base}:contents`),
  ]);

  const rateLimited =
    meta.rateLimited || readme.rateLimited || langs.rateLimited || contents.rateLimited;

  // Title / description from canonical repo metadata.
  const repoFullName = meta.data?.full_name ?? `${owner}/${repo}`;
  const repoHomepage = meta.data?.homepage ?? null;
  const readmeText = readme.data?.content ? decodeBase64(readme.data.content) : '';
  let description_draft = readmeText.slice(0, README_TRUNCATE);
  if (rateLimited && !readmeText) {
    description_draft =
      `_(GitHub API rate limit reached during analysis; some fields are partial. Edit and add detail below.)_\n`;
  }

  // Artifacts.
  const artifactSet = new Map<string, Artifact>();
  artifactSet.set(input.url.href, {
    kind: 'repo',
    url: input.url.href,
    title: repoFullName,
    fetched_at: new Date().toISOString(),
  });
  if (repoHomepage && /^https?:\/\//i.test(repoHomepage)) {
    artifactSet.set(repoHomepage, {
      kind: 'deployment',
      url: repoHomepage,
      title: 'Project homepage',
    });
  }
  for (const u of extractDeploymentUrls(readmeText)) {
    if (artifactSet.size >= MAX_ARTIFACTS) break;
    if (!artifactSet.has(u)) {
      artifactSet.set(u, { kind: 'deployment', url: u });
    }
  }

  // Stack — languages.
  const stack: StackElement[] = [];
  if (langs.data) {
    const sortedLangs = Object.entries(langs.data).sort((a, b) => b[1] - a[1]);
    sortedLangs.forEach(([lang], i) => {
      const canonical = LANG_TO_VOCAB[lang];
      if (!canonical) return;
      stack.push({
        name: canonical,
        category: 'language',
        role: i === 0 ? 'primary' : i <= 2 ? 'secondary' : 'supporting',
      });
    });
  }

  // Stack — signal files (CLAUDE.md, .cursorrules, mcp.json, AGENTS.md, etc.).
  const filenames = new Set((contents.data ?? []).map((c) => c.name));
  for (const [filename, vocab] of Object.entries(STACK_SIGNAL_FILES)) {
    if (filenames.has(filename)) {
      stack.push({ name: vocab.name, category: vocab.category, role: 'supporting' });
    }
  }

  // Stack — dep manifests (fetch contents only for files present at top level).
  const depFetches: Array<Promise<StackElement[]>> = [];
  let packageName: string | null = null;
  for (const f of contents.data ?? []) {
    if (f.type !== 'file') continue;
    if (f.name === 'package.json') {
      depFetches.push(
        ghFetch<{ content: string; encoding: string }>(
          `/repos/${owner}/${repo}/contents/package.json`,
          `${base}:package.json`
        ).then((r) => {
          if (!r.data) return [];
          const content = decodeBase64(r.data.content);
          try {
            const name = (JSON.parse(content) as { name?: unknown }).name;
            if (typeof name === 'string') packageName = name;
          } catch {
            /* ignore parse errors */
          }
          return parsePackageJsonDeps(content);
        })
      );
    } else if (f.name === 'requirements.txt') {
      depFetches.push(
        ghFetch<{ content: string; encoding: string }>(
          `/repos/${owner}/${repo}/contents/requirements.txt`,
          `${base}:requirements.txt`
        ).then((r) => (r.data ? parseRequirementsTxt(decodeBase64(r.data.content)) : []))
      );
    } else if (f.name === 'pyproject.toml') {
      depFetches.push(
        ghFetch<{ content: string; encoding: string }>(
          `/repos/${owner}/${repo}/contents/pyproject.toml`,
          `${base}:pyproject.toml`
        ).then((r) => (r.data ? parsePyprojectToml(decodeBase64(r.data.content)) : []))
      );
    }
  }
  const depStacks = await Promise.all(depFetches);
  for (const s of depStacks) stack.push(...s);

  // Title — chosen after the manifests so package.json `name` is a candidate.
  const title_draft = pickGitHubTitle({
    description: meta.data?.description,
    readme: readmeText,
    packageName,
    repoFullName,
  });

  // Capabilities — keyword harvest over README.
  const capabilities = harvestCapabilities(readmeText);

  // Verify vocab membership for stack entries (defensive against vocab drift).
  const vocabFlat = new Set(
    Object.values(stackVocab as Record<string, string[]>).flatMap((arr) => arr)
  );
  const filteredStack = dedupeStack(stack.filter((s) => vocabFlat.has(s.name)));

  return {
    title_draft: title_draft.slice(0, 80),
    description_draft,
    artifacts: [...artifactSet.values()].slice(0, MAX_ARTIFACTS),
    stack: filteredStack,
    outcomes_suggestions: [],
    capabilities,
  };
}
