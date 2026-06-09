#!/usr/bin/env node
/**
 * Patches dist/index.html after `expo export --platform web` to inject:
 *  - PWA manifest link
 *  - iOS PWA meta tags
 *  - Service worker registration script
 */
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found — run `expo export --platform web` first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Stamp the service worker with a build timestamp so browsers re-install it on every deploy
const swPath = path.join(__dirname, '..', 'dist', 'sw.js');
if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = sw.replace(/const CACHE = '[^']*'/, `const CACHE = 'gracelink-${Date.now()}'`);
  fs.writeFileSync(swPath, sw);
  console.log('✓ Service worker cache version stamped');
}

const pwaTags = `
    <!-- PWA -->
    <meta name="theme-color" content="#7B2FF7" />
    <link rel="manifest" href="/manifest.json" />
    <!-- iOS add-to-home-screen -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="GraceLink" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="icon" type="image/png" href="/icon-192.png" />`;

const swScript = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function (e) {
          console.warn('SW registration failed:', e);
        });
      });
    }
  </script>`;

html = html.replace('</head>', pwaTags + '\n  </head>');
html = html.replace('</body>', swScript + '\n</body>');

fs.writeFileSync(indexPath, html);
console.log('✓ PWA tags and service worker injected into dist/index.html');
