const fs = require('fs'), path = require('path')
const t = path.join(process.cwd(), 'src', 'app', 'feed', '[id]', 'FeedPostCTA.tsx')
fs.writeFileSync(t, Buffer.from('J3VzZSBjbGllbnQnCgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBGZWVkUG9zdENUQSgpIHsKICByZXR1cm4gKAogICAgPGRpdiBzdHlsZT17eyBtYXJnaW5Ub3A6ICcxLjVyZW0nLCBiYWNrZ3JvdW5kOiAncmVkJywgcGFkZGluZzogJzJyZW0nLCBib3JkZXJSYWRpdXM6IDE0LCBjb2xvcjogJ3doaXRlJywgZm9udFNpemU6IDIwLCBmb250V2VpZ2h0OiA3MDAsIHRleHRBbGlnbjogJ2NlbnRlcicgfX0+CiAgICAgIEZFRURQT1NUQ1RBIElTIFJFTkRFUklORwogICAgPC9kaXY+CiAgKQp9Cg==', 'base64').toString('utf8'))
console.log('Diagnostic version written')
