/**
 * Generate iOS PWA assets (apple-touch-icon + splash screens)
 * from the existing 512x512 manifest icon.
 * 
 * Usage: node scripts/generate-ios-assets.js
 * Requires: npm install sharp (or npx)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '..', 'client', 'public');
const SOURCE_ICON = path.join(PUBLIC_DIR, 'web-app-manifest-512x512.png');

// iOS splash screen sizes (width x height)
const SPLASH_SIZES = [
  { w: 640,  h: 1136,  name: 'splash-640x1136.png' },   // iPhone SE 1st gen
  { w: 750,  h: 1334,  name: 'splash-750x1334.png' },   // iPhone 8
  { w: 828,  h: 1792,  name: 'splash-828x1792.png' },   // iPhone XR
  { w: 1125, h: 2436,  name: 'splash-1125x2436.png' },  // iPhone X/XS
  { w: 1170, h: 2532,  name: 'splash-1170x2532.png' },  // iPhone 12/13/14
  { w: 1179, h: 2556,  name: 'splash-1179x2556.png' },  // iPhone 14 Pro/15
  { w: 1242, h: 2688,  name: 'splash-1242x2688.png' },  // iPhone XS Max
  { w: 1284, h: 2778,  name: 'splash-1284x2778.png' },  // iPhone 12/13/14 Pro Max
  { w: 1290, h: 2796,  name: 'splash-1290x2796.png' },  // iPhone 14/15 Pro Max
];

async function generateAppleTouchIcon() {
  const output = path.join(PUBLIC_DIR, 'apple-touch-icon.png');
  await sharp(SOURCE_ICON)
    .resize(180, 180)
    .png()
    .toFile(output);
  console.log('✓ apple-touch-icon.png (180x180)');
}

async function generateSplash(size) {
  const output = path.join(PUBLIC_DIR, size.name);
  
  // Logo size: ~30% of the smallest dimension
  const logoSize = Math.round(Math.min(size.w, size.h) * 0.3);
  
  // Resize logo
  const logo = await sharp(SOURCE_ICON)
    .resize(logoSize, logoSize)
    .png()
    .toBuffer();

  // Create splash screen with KOLO brand color background + centered logo
  await sharp({
    create: {
      width: size.w,
      height: size.h,
      channels: 3,
      background: '#5EDFD6'
    }
  })
  .composite([{
    input: logo,
    gravity: 'centre'
  }])
  .png()
  .toFile(output);

  console.log(`✓ ${size.name} (${size.w}x${size.h})`);
}

async function main() {
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error('Source icon not found:', SOURCE_ICON);
    process.exit(1);
  }

  console.log('Generating iOS PWA assets...\n');
  
  await generateAppleTouchIcon();
  
  for (const size of SPLASH_SIZES) {
    await generateSplash(size);
  }

  console.log('\n✅ All iOS assets generated in client/public/');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
