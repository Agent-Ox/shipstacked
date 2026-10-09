/**
 * Verification for GitHub paste title selection (src/lib/paste/title.ts).
 *
 * Regression: a create-next-app boilerplate README yielded the title "or"
 * because `# or` (a shell comment inside a ```bash fence) matched as an H1.
 *
 *   node --experimental-strip-types scripts/v2/verify-paste-title.ts
 */
import { isUsableTitle, pickGitHubTitle, readmeFirstHeading } from '../../src/lib/paste/title.ts'

const BOILERPLATE_README = [
  'This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).',
  '',
  '## Getting Started',
  '',
  'First, run the development server:',
  '',
  '```bash',
  'npm run dev',
  '# or',
  'yarn dev',
  '# or',
  'pnpm dev',
  '```',
].join('\n')

let failed = 0
function check(name: string, got: unknown, want: unknown) {
  const ok = got === want
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`)
}

// The regression case: boilerplate README, no description.
check('boilerplate README: no H1 found (fenced "# or" ignored)', readmeFirstHeading(BOILERPLATE_README), null)
check('boilerplate README + package name → package name',
  pickGitHubTitle({ description: null, readme: BOILERPLATE_README, packageName: 'shipstacked', repoFullName: 'Agent-Ox/shipstacked' }), 'shipstacked')
check('boilerplate README, no package name → repo full name',
  pickGitHubTitle({ description: null, readme: BOILERPLATE_README, packageName: null, repoFullName: 'Agent-Ox/shipstacked' }), 'Agent-Ox/shipstacked')
check('output is never "or"',
  pickGitHubTitle({ description: '', readme: '# or\n', packageName: 'ab', repoFullName: 'Agent-Ox/shipstacked' }), 'Agent-Ox/shipstacked')

// Preference order.
check('description wins', pickGitHubTitle({ description: 'Hiring platform for builders', readme: '# ShipStacked', packageName: 'pkg-name', repoFullName: 'a/b' }), 'Hiring platform for builders')
check('README H1 beats package name', pickGitHubTitle({ description: null, readme: '# ShipStacked\n\nBody', packageName: 'pkg-name', repoFullName: 'a/b' }), 'ShipStacked')
check('H1 after a code fence still found', readmeFirstHeading('```sh\n# not a heading\n```\n\n# Real Title\n'), 'Real Title')
check('tilde fences ignored', readmeFirstHeading('~~~\n# nope\n~~~\n'), null)
check('closing hashes stripped', readmeFirstHeading('# Title ##\n'), 'Title')

// Usability rule.
check('single short token rejected', isUsableTitle('or'), false)
check('3-char token rejected', isUsableTitle('app'), false)
check('4-char token accepted', isUsableTitle('Ship'), true)
check('short multi-word accepted', isUsableTitle('AI ops'), true)
check('no letters rejected', isUsableTitle('123'), false)

console.log(failed ? `\nFAILED: ${failed}` : '\nALL PASSED')
process.exit(failed ? 1 : 0)
