import type { Metadata } from 'next'
import Link from 'next/link'
import fs from 'node:fs/promises'
import path from 'node:path'
import Markdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import GithubSlugger from 'github-slugger'
import { createClient } from '@supabase/supabase-js'
import { buildAtlasArticleJsonLd, buildAtlasDefinedTermSetJsonLd } from '@/lib/jsonld/atlas-article'

const TITLE = 'The Atlas — AI implementation roles, mapped | ShipStacked'
const DESCRIPTION =
  "A practitioner's map of the roles, operators, and teams doing real AI implementation work. By Thomas Oxlee."
const CANONICAL = 'https://shipstacked.com/atlas'
const PUBLISHED = '2026-05-15'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'article',
    url: CANONICAL,
    authors: ['Thomas Oxlee'],
    publishedTime: PUBLISHED,
    images: [{ url: '/og?v=2', width: 1200, height: 630, alt: 'ShipStacked' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og?v=2'],
  },
}

type TocEntry = { text: string; slug: string; level: 1 | 2 | 3; children: TocEntry[] }

// Walk all heading lines in document order through a single slugger so emitted
// slugs match what rehype-slug produces (including dedup suffixes like -1).
// H1s become top-level Part entries; H2s nest under their preceding H1 (or sit
// at the top level if they appear before any H1, e.g. Foreword); H3s nest
// under their preceding H2.
function extractToc(md: string): TocEntry[] {
  const slugger = new GithubSlugger()
  const out: TocEntry[] = []
  let currentH1: TocEntry | null = null
  let currentH2: TocEntry | null = null
  for (const line of md.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (!m) continue
    const level = m[1].length
    const text = m[2].trim()
    const slug = slugger.slug(text)
    if (level === 1) {
      currentH1 = { text, slug, level: 1, children: [] }
      out.push(currentH1)
      currentH2 = null
    } else if (level === 2) {
      currentH2 = { text, slug, level: 2, children: [] }
      if (currentH1) currentH1.children.push(currentH2)
      else out.push(currentH2)
    } else if (level === 3 && currentH2) {
      currentH2.children.push({ text, slug, level: 3, children: [] })
    }
  }
  return out
}

// Strip the leading title block (H1 + subtitle/byline lines, terminated by the
// first horizontal rule) so the hero is the single source of truth for those.
// Safe-fails to the unmodified input if the document does not start with an H1.
function stripFrontMatter(md: string): string {
  const lines = md.split('\n')
  if (!lines[0]?.startsWith('# ')) return md
  let i = 0
  while (i < lines.length && lines[i].trim() !== '---') i++
  if (i >= lines.length) return md
  i++
  while (i < lines.length && lines[i].trim() === '') i++
  return lines.slice(i).join('\n')
}

// Self-updating word count. Strips fenced + inline code, image alts, link
// URLs, and common markdown punctuation, then splits on whitespace.
function countWords(md: string): number {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`|]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#fbfbfd',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#1d1d1f',
  } as React.CSSProperties,

  hero: {
    background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 100%)',
    padding: 'clamp(4rem, 8vw, 7rem) 1.5rem clamp(3.5rem, 7vw, 5.5rem)',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  heroInner: { maxWidth: 860, margin: '0 auto' } as React.CSSProperties,
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(0,113,227,0.15)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(0,113,227,0.3)',
    borderRadius: 980,
    padding: '0.3rem 0.875rem',
    marginBottom: '1.75rem',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(125,180,255,0.95)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#0071e3',
    display: 'inline-block',
  } as React.CSSProperties,
  h1: {
    fontSize: 'clamp(2.25rem, 6vw, 4rem)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    color: '#f0f0f5',
    lineHeight: 1.05,
    margin: '0 auto 1.25rem',
    maxWidth: 820,
  } as React.CSSProperties,
  subhead: {
    fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
    color: 'rgba(240,240,245,0.75)',
    fontStyle: 'italic' as const,
    margin: '0 auto 2.25rem',
    maxWidth: 700,
    lineHeight: 1.55,
    fontWeight: 300,
  } as React.CSSProperties,
  byline: {
    color: 'rgba(240,240,245,0.88)',
    fontSize: 15,
    margin: '0 auto 0.5rem',
    fontWeight: 500,
  } as React.CSSProperties,
  bylineSub: {
    color: 'rgba(240,240,245,0.55)',
    fontSize: 13,
    margin: '0 auto 0.6rem',
    maxWidth: 640,
    lineHeight: 1.6,
  } as React.CSSProperties,
  bylineMeta: {
    color: 'rgba(240,240,245,0.45)',
    fontSize: 12,
    margin: '0 auto 2.25rem',
    letterSpacing: '0.02em',
  } as React.CSSProperties,
  ctaRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    gap: '0.875rem',
  } as React.CSSProperties,
  ctaOutlineDark: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgba(240,240,245,0.3)',
    borderRadius: 980,
    color: '#f0f0f5',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    background: 'transparent',
  } as React.CSSProperties,

  body: {
    padding: 'clamp(3rem, 6vw, 6rem) 1.25rem',
    background: '#fbfbfd',
  } as React.CSSProperties,
  bodyGrid: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gap: '2.5rem',
    gridTemplateColumns: 'minmax(0, 1fr)',
    alignItems: 'start',
  } as React.CSSProperties,
  tocRail: {} as React.CSSProperties,
  contentMain: {
    maxWidth: 720,
    color: '#1d1d1f',
    paddingBottom: '4rem',
  } as React.CSSProperties,

  // ToC
  tocLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#0071e3',
    marginBottom: '0.875rem',
  } as React.CSSProperties,
  tocList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  tocItem: {
    marginBottom: '0.4rem',
    lineHeight: 1.4,
  } as React.CSSProperties,
  tocPartItem: {
    marginTop: '0.9rem',
    marginBottom: '0.5rem',
    paddingTop: '0.6rem',
    borderTopWidth: '1px',
    borderTopStyle: 'solid' as const,
    borderTopColor: '#e8e8ed',
    lineHeight: 1.3,
  } as React.CSSProperties,
  tocPartLink: {
    color: '#1d1d1f',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
    display: 'block',
    marginBottom: '0.4rem',
  } as React.CSSProperties,
  tocLink: {
    color: '#3d3d3f',
    textDecoration: 'none',
    fontSize: 13,
    display: 'block',
  } as React.CSSProperties,
  tocSubList: {
    listStyle: 'none',
    margin: '0.35rem 0 0.6rem 0',
    padding: '0 0 0 0.85rem',
    borderLeft: '1px solid #e8e8ed',
  } as React.CSSProperties,
  tocSubItem: {
    marginBottom: '0.3rem',
  } as React.CSSProperties,
  tocSubLink: {
    color: '#6e6e73',
    textDecoration: 'none',
    fontSize: 12,
    display: 'block',
    lineHeight: 1.4,
  } as React.CSSProperties,

  // Markdown content
  mdH1: {
    fontSize: 'clamp(2rem, 4.2vw, 2.625rem)',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: '#0a0a0f',
    lineHeight: 1.1,
    marginTop: 'clamp(5rem, 8vw, 6.5rem)',
    marginBottom: '1.5rem',
    paddingBottom: '0.75rem',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid' as const,
    borderBottomColor: '#0071e3',
    scrollMarginTop: '5rem',
  } as React.CSSProperties,
  mdH2: {
    fontSize: 'clamp(1.5rem, 3vw, 1.875rem)',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: '#1d1d1f',
    lineHeight: 1.2,
    marginTop: 'clamp(3rem, 5vw, 4rem)',
    marginBottom: '1rem',
    scrollMarginTop: '5rem',
  } as React.CSSProperties,
  mdH3: {
    fontSize: 'clamp(1.2rem, 2.4vw, 1.4rem)',
    fontWeight: 700,
    letterSpacing: '-0.015em',
    color: '#1d1d1f',
    lineHeight: 1.25,
    marginTop: '2.5rem',
    marginBottom: '0.75rem',
    scrollMarginTop: '5rem',
  } as React.CSSProperties,
  mdH4: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#1d1d1f',
    lineHeight: 1.3,
    marginTop: '1.75rem',
    marginBottom: '0.5rem',
    scrollMarginTop: '5rem',
  } as React.CSSProperties,
  mdP: {
    fontSize: '1.0625rem',
    lineHeight: 1.7,
    color: '#1d1d1f',
    marginTop: 0,
    marginBottom: '1.25rem',
    maxWidth: '65ch',
  } as React.CSSProperties,
  mdUl: {
    margin: '0 0 1.25rem 0',
    paddingLeft: '1.5rem',
    fontSize: '1.0625rem',
    color: '#1d1d1f',
  } as React.CSSProperties,
  mdOl: {
    margin: '0 0 1.25rem 0',
    paddingLeft: '1.5rem',
    fontSize: '1.0625rem',
    color: '#1d1d1f',
  } as React.CSSProperties,
  mdLi: {
    marginBottom: '0.5rem',
    lineHeight: 1.6,
  } as React.CSSProperties,
  mdStrong: {
    fontWeight: 600,
    color: '#000',
  } as React.CSSProperties,
  mdEm: {
    fontStyle: 'italic' as const,
  } as React.CSSProperties,
  mdHr: {
    border: 'none',
    borderTop: '0.5px solid #e8e8ed',
    margin: '3rem 0',
  } as React.CSSProperties,
  mdBlockquote: {
    borderLeft: '3px solid #0071e3',
    paddingLeft: '1.25rem',
    color: '#3d3d3f',
    fontStyle: 'italic' as const,
    margin: '1.5rem 0',
  } as React.CSSProperties,
  mdCodeInline: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    background: '#f5f5f7',
    padding: '0.125rem 0.375rem',
    borderRadius: 4,
    fontSize: '0.9em',
  } as React.CSSProperties,
  mdPre: {
    background: '#1d1d1f',
    color: '#f0f0f0',
    padding: '1rem',
    borderRadius: 8,
    overflowX: 'auto' as const,
    fontSize: '0.875rem',
    margin: '1.25rem 0',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  } as React.CSSProperties,
  mdCodeBlock: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    background: 'transparent',
    color: 'inherit',
    padding: 0,
    fontSize: 'inherit',
  } as React.CSSProperties,
  mdLink: {
    color: '#0071e3',
    textDecoration: 'none',
  } as React.CSSProperties,

  // Footer
  footerSection: {
    borderTop: '0.5px solid #e8e8ed',
    padding: 'clamp(3rem, 5vw, 4rem) 1.25rem 5rem',
    background: '#fbfbfd',
  } as React.CSSProperties,
  footerInner: { maxWidth: 720, margin: '0 auto' } as React.CSSProperties,
  footerH2: {
    fontSize: 'clamp(1.1rem, 2vw, 1.25rem)',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: '#1d1d1f',
    marginTop: 0,
    marginBottom: '0.875rem',
  } as React.CSSProperties,
  footerP: {
    fontSize: 15,
    color: '#3d3d3f',
    lineHeight: 1.75,
    marginBottom: '1.75rem',
  } as React.CSSProperties,
  footerCtaRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.875rem',
    marginBottom: '2rem',
  } as React.CSSProperties,
  ctaPrimary: {
    display: 'inline-block',
    padding: '0.875rem 1.75rem',
    background: '#0071e3',
    color: '#ffffff',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#0071e3',
    borderRadius: 980,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  } as React.CSSProperties,
  ctaOutline: {
    display: 'inline-block',
    padding: '0.875rem 1.75rem',
    background: '#ffffff',
    color: '#0071e3',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#0071e3',
    borderRadius: 980,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  } as React.CSSProperties,
  versionNote: {
    fontSize: 13,
    color: '#6e6e73',
    fontStyle: 'italic' as const,
    lineHeight: 1.5,
    margin: 0,
  } as React.CSSProperties,
  versionLink: {
    color: '#0071e3',
    textDecoration: 'none',
  } as React.CSSProperties,
}

const RESPONSIVE_CSS = `
@media (min-width: 1024px) {
  .atlas-body-grid {
    grid-template-columns: minmax(200px, 240px) minmax(0, 720px) !important;
    gap: 4rem !important;
    justify-content: center;
  }
  .atlas-toc-rail {
    position: sticky;
    top: 76px;
    max-height: calc(100vh - 96px);
    overflow-y: auto;
  }
}
@media (max-width: 1023px) {
  .atlas-toc-rail {
    font-size: 0.95em;
  }
}
.atlas-skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
}
.atlas-skip-link:focus {
  left: 1rem;
  top: 1rem;
  background: #0071e3;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  z-index: 200;
}
.atlas-content h1 > a,
.atlas-content h2 > a,
.atlas-content h3 > a,
.atlas-content h4 > a {
  color: inherit;
  text-decoration: none;
}
.atlas-content h1 > a:hover,
.atlas-content h2 > a:hover,
.atlas-content h3 > a:hover,
.atlas-content h4 > a:hover {
  text-decoration: underline;
  text-decoration-color: #0071e3;
  text-underline-offset: 4px;
}
.atlas-content a:not(h1 > a):not(h2 > a):not(h3 > a):not(h4 > a):hover {
  text-decoration: underline;
}
.atlas-toc-link:hover {
  color: #0071e3 !important;
}
`

const components: Components = {
  h1: ({ id, children }) => <h1 id={id} style={s.mdH1}>{children}</h1>,
  h2: ({ id, children }) => <h2 id={id} style={s.mdH2}>{children}</h2>,
  h3: ({ id, children }) => <h3 id={id} style={s.mdH3}>{children}</h3>,
  h4: ({ id, children }) => <h4 id={id} style={s.mdH4}>{children}</h4>,
  p: ({ children }) => <p style={s.mdP}>{children}</p>,
  ul: ({ children }) => <ul style={s.mdUl}>{children}</ul>,
  ol: ({ children }) => <ol style={s.mdOl}>{children}</ol>,
  li: ({ children }) => <li style={s.mdLi}>{children}</li>,
  strong: ({ children }) => <strong style={s.mdStrong}>{children}</strong>,
  em: ({ children }) => <em style={s.mdEm}>{children}</em>,
  hr: () => <hr style={s.mdHr} />,
  blockquote: ({ children }) => <blockquote style={s.mdBlockquote}>{children}</blockquote>,
  a: ({ href, children }) => (
    <a href={href} style={s.mdLink}>{children}</a>
  ),
  pre: ({ children }) => <pre style={s.mdPre}>{children}</pre>,
  code: ({ className, children, ...rest }) => {
    const isBlock = typeof className === 'string' && className.startsWith('language-')
    return isBlock ? (
      <code className={className} style={s.mdCodeBlock} {...rest}>{children}</code>
    ) : (
      <code style={s.mdCodeInline} {...rest}>{children}</code>
    )
  },
}

export default async function AtlasPage() {
  const markdownPath = path.join(process.cwd(), 'src/content/atlas-v05.md')
  const raw = await fs.readFile(markdownPath, 'utf-8')
  const stripped = stripFrontMatter(raw)
  const toc = extractToc(stripped)
  const wordCount = countWords(stripped)
  // Beacon 1 — Article + DefinedTermSet (the latter references every
  // /atlas/roles/[id] DefinedTerm so the Atlas works as one controlled
  // vocabulary entry-point). The per-role DefinedTerm at /atlas/roles/[id]
  // is V2 code (src/lib/atlas/jsonld.ts) — UNTOUCHED.
  const jsonLd = buildAtlasArticleJsonLd(wordCount)
  /**
   * The role-taxonomy / DB-row version. NOT the essay display version.
   *
   * Used to:
   *   - parameterize the Supabase `atlas_roles` query (.eq('atlas_version', ...))
   *   - build the DefinedTermSet @id (?v=...) and per-role @id refs
   *
   * The essay version is the hardcoded chrome strings, NOT this constant:
   *   - header chip in page.tsx
   *   - footer "This is v0.X" in page.tsx
   *   - alternativeHeadline in src/lib/jsonld/atlas-article.ts
   *
   * Changing this value re-points the atlas_roles query + the DefinedTermSet
   * @id and is an Option-γ action (full role-schema cycle: re-seed v0.X rows,
   * bump ATLAS_VERSION_DEFAULT/ATLAS_VERSIONS in src/lib/atlas/roles.ts,
   * update MCP role tools, regenerate Beacon 4 package snapshots). It is NOT
   * an essay-version bump.
   *
   * History: flipping this from 'v0.4' to 'v0.5' during the Atlas v0.5 essay
   * ship returned 0 DB rows and silently dropped the DefinedTermSet structured
   * data — caught by the byte-equivalence gate, fixed by the one-line revert,
   * landmine defused by this rename.
   */
  const ROLE_TAXONOMY_VERSION = 'v0.4'
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: roleRows } = await admin
    .from('atlas_roles')
    .select('role_id')
    .eq('atlas_version', ROLE_TAXONOMY_VERSION)
    .order('role_id')
  const definedTermSetLd = (roleRows && roleRows.length > 0)
    ? buildAtlasDefinedTermSetJsonLd(ROLE_TAXONOMY_VERSION, roleRows.map((r: any) => r.role_id))
    : null

  return (
    <main style={s.page}>
      <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {definedTermSetLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetLd) }}
        />
      )}
      <a href="#atlas-content" className="atlas-skip-link">Skip to content</a>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.eyebrow}>
            <span style={s.eyebrowDot} aria-hidden="true" />
            <span>Version 0.5 — Practitioner-defined</span>
          </div>
          <h1 style={s.h1}>The Atlas — AI implementation roles, mapped</h1>
          <p style={s.subhead}>
            A practitioner&apos;s map of the labor market that didn&apos;t have a name yesterday.
          </p>
          <p style={s.byline}>By Thomas Oxlee</p>
          <p style={s.bylineSub}>
            Founder, ShipStacked. Embedded as an AI implementation lead at a regulated EU business.
          </p>
          <p style={s.bylineMeta}>
            Published May 15, 2026 · {wordCount.toLocaleString()} words · ~{Math.round(wordCount / 250)} min read
          </p>
          <div style={s.ctaRow}>
            <Link href="/join" style={s.ctaPrimary}>Join ShipStacked →</Link>
          </div>
        </div>
      </section>
      <div id="hero-bottom-sentinel" aria-hidden="true" />

      {/* Body */}
      <section style={s.body}>
        <div className="atlas-body-grid" style={s.bodyGrid}>
          <aside className="atlas-toc-rail" style={s.tocRail}>
            <nav id="atlas-toc" aria-label="Table of contents">
              <div style={s.tocLabel}>On this page</div>
              <ul style={s.tocList}>
                {toc.map((entry) => {
                  if (entry.level === 1) {
                    return (
                      <li key={entry.slug} style={s.tocPartItem}>
                        <a href={`#${entry.slug}`} className="atlas-toc-link" style={s.tocPartLink}>
                          {entry.text}
                        </a>
                        {entry.children.length > 0 && (
                          <ul style={s.tocList}>
                            {entry.children.map((h2) => (
                              <li key={h2.slug} style={s.tocItem}>
                                <a href={`#${h2.slug}`} className="atlas-toc-link" style={s.tocLink}>
                                  {h2.text}
                                </a>
                                {h2.children.length > 0 && (
                                  <ul style={s.tocSubList}>
                                    {h2.children.map((h3) => (
                                      <li key={h3.slug} style={s.tocSubItem}>
                                        <a href={`#${h3.slug}`} className="atlas-toc-link" style={s.tocSubLink}>
                                          {h3.text}
                                        </a>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  }
                  return (
                    <li key={entry.slug} style={s.tocItem}>
                      <a href={`#${entry.slug}`} className="atlas-toc-link" style={s.tocLink}>
                        {entry.text}
                      </a>
                      {entry.children.length > 0 && (
                        <ul style={s.tocSubList}>
                          {entry.children.map((h3) => (
                            <li key={h3.slug} style={s.tocSubItem}>
                              <a href={`#${h3.slug}`} className="atlas-toc-link" style={s.tocSubLink}>
                                {h3.text}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>
          <article id="atlas-content" className="atlas-content" style={s.contentMain}>
            <Markdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[
                rehypeSlug,
                [rehypeAutolinkHeadings, { behavior: 'wrap' }],
              ]}
              components={components}
            >
              {stripped}
            </Markdown>
          </article>
        </div>
      </section>

      {/* Footer */}
      <section style={s.footerSection}>
        <div id="footer-top-sentinel" aria-hidden="true" />
        <div style={s.footerInner}>
          <h2 style={s.footerH2}>About the author</h2>
          <p style={s.footerP}>
            Thomas Oxlee is the founder of ShipStacked, the marketplace where AI builders, teams, and agents get hired on proven, verified work — not résumés. He is currently embedded as an AI implementation lead at a regulated EU business, where most of the field signal that informs this Atlas comes from.
          </p>
          <div style={s.footerCtaRow}>
            <Link href="/join" style={s.ctaPrimary}>Join ShipStacked →</Link>
          </div>
          <p style={s.versionNote}>
            This is v0.5. It will be wrong in places. Tell me where —{' '}
            <a href="mailto:hello@shipstacked.com" style={s.versionLink}>hello@shipstacked.com</a>
          </p>
        </div>
      </section>
    </main>
  )
}
