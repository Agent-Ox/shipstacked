const fs = require('fs')
const content = fs.readFileSync('/home/claude/patched/src/app/og/route.tsx', 'utf8')
// Note: this script runs on Thomas's machine, path is relative to shipstacked root
fs.writeFileSync('src/app/og/route.tsx', content)
console.log('Written:', fs.statSync('src/app/og/route.tsx').size, 'bytes')
