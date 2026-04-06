const fs = require('fs'), path = require('path')
const t = path.join(process.cwd(), 'src', 'app', 'feed', '[id]', 'page.tsx')
let c = fs.readFileSync(t, 'utf8')
// Remove builderName prop from FeedPostCTA call if present
c = c.replace(/\s*builderName=\{[^}]+\}\n/, '\n')
fs.writeFileSync(t, c)
const v = fs.readFileSync(t, 'utf8')
// Check no builderName in FeedPostCTA section
const ctaIdx = v.indexOf('<FeedPostCTA')
const ctaEnd = v.indexOf('/>', ctaIdx)
const ctaBlock = v.slice(ctaIdx, ctaEnd)
console.log('builderName in CTA block:', ctaBlock.includes('builderName={'))
console.log('CTA block:', ctaBlock)
