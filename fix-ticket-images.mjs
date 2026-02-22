import sharp from 'sharp';
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join } from 'path';

const publicDir = join(process.cwd(), 'client', 'public');

const files = ['ticket-gagnant.png', 'ticket-number.png', 'ticket-bonus.png'];

async function fixImage(filename) {
  const filePath = join(publicDir, filename);
  const backupPath = join(publicDir, `${filename}.bak`);
  
  // Backup original
  copyFileSync(filePath, backupPath);
  
  const image = sharp(filePath);
  const metadata = await image.metadata();
  
  console.log(`\n📐 ${filename}: ${metadata.width}x${metadata.height}`);
  
  // The old ticket images are tilted approximately -12 degrees
  // Rotate +12 degrees to straighten, then trim transparent edges
  const rotated = await sharp(filePath)
    .rotate(12, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .trim({ threshold: 10 })
    .toBuffer();
  
  // Get the trimmed dimensions
  const trimmedMeta = await sharp(rotated).metadata();
  console.log(`   Après rotation+trim: ${trimmedMeta.width}x${trimmedMeta.height}`);
  
  // Resize to a clean width (800px wide) maintaining aspect ratio
  const final = await sharp(rotated)
    .resize(800, null, { fit: 'inside', withoutEnlargement: false })
    .png({ quality: 95 })
    .toBuffer();
  
  const finalMeta = await sharp(final).metadata();
  console.log(`   Final: ${finalMeta.width}x${finalMeta.height}`);
  
  writeFileSync(filePath, final);
  console.log(`   ✅ Sauvegardé: ${filePath}`);
}

async function main() {
  console.log('🎫 Correction des images de tickets penchées...\n');
  
  for (const file of files) {
    try {
      await fixImage(file);
    } catch (err) {
      console.error(`❌ Erreur ${file}:`, err.message);
    }
  }
  
  console.log('\n✅ Terminé !');
}

main();
