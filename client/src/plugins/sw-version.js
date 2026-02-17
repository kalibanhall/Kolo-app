/**
 * Vite plugin that auto-stamps sw.js with a build version.
 * Replaces the version string in public/sw.js at build time
 * so each deployment gets a unique cache name.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export default function swVersionPlugin() {
  return {
    name: 'sw-version-stamp',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      const swPath = path.join(distDir, 'sw.js');

      if (fs.existsSync(swPath)) {
        let content = fs.readFileSync(swPath, 'utf-8');
        // Use full ISO timestamp with milliseconds for guaranteed uniqueness
        const version = Date.now().toString(36) + '-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        content = content.replace(
          /const SW_VERSION = '[^']*'/,
          `const SW_VERSION = '${version}'`
        );
        fs.writeFileSync(swPath, content, 'utf-8');
        console.log(`\n✅ SW version stamped: ${version}\n`);
      }

      // Also stamp index.html with build version meta tag
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf-8');
        const buildId = Date.now().toString();
        html = html.replace('</head>', `  <meta name="build-version" content="${buildId}" />\n  </head>`);
        fs.writeFileSync(indexPath, html, 'utf-8');
        console.log(`✅ Build version meta tag added: ${buildId}\n`);
      }
    }
  };
}
