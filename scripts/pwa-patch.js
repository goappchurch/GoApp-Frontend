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
