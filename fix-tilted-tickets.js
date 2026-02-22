const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'client', 'public');
const files = ['ticket-gagnant.png', 'ticket-number.png', 'ticket-bonus.png'];

async function fixImage(filename) {
  const filePath = path.join(publicDir, filename);
  const backupPath = path.join(publicDir, filename + '.bak');
  
  if (!fs.existsSync(filePath)) {
    console.log('  SKIP - not found:', filePath);
    return;
  }
  
  // Backup
  fs.copyFileSync(filePath, backupPath);
  
  const meta = await sharp(filePath).metadata();
  console.log(`  Original: ${meta.width}x${meta.height}`);
  
  // Rotate +12 degrees to counteract the tilt, transparent background
  const rotated = await sharp(filePath)
    .rotate(12, { background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  
  // Trim transparent edges
  const trimmed = await sharp(rotated)
    .trim({ threshold: 5 })
    .png()
    .toBuffer();
  
  const trimMeta = await sharp(trimmed).metadata();
  console.log(`  After rotate+trim: ${trimMeta.width}x${trimMeta.height}`);
  
  // Resize to 800px wide
  const final = await sharp(trimmed)
    .resize(800, null, { fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  
  const finalMeta = await sharp(final).metadata();
  console.log(`  Final: ${finalMeta.width}x${finalMeta.height}`);
  
  fs.writeFileSync(filePath, final);
  console.log(`  SAVED: ${filePath}`);
}

async function main() {
  console.log('Fixing tilted ticket images...\n');
  
  for (const file of files) {
    console.log(`Processing ${file}:`);
    try {
      await fixImage(file);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
    console.log('');
  }
  
  console.log('Done!');
}

main();
