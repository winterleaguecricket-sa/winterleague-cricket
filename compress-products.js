/**
 * Compress base64 images in products.json for 'Short Sleeve Shirt Kits' products
 * Using sharp for image compression
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = '/home/vmycnmyo/winterleague-cricket/data/products.json';
const TARGET_IDS = Array.from({length: 20}, (_, i) => i + 67); // IDs 67-86
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 70;

async function compressBase64Image(base64Str) {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str;
  }

  try {
    const sharp = require('sharp');
    
    // Extract the base64 data
    const matches = base64Str.match(/^data:image\/\w+;base64,(.+)$/);
    if (!matches) return base64Str;
    
    const imageBuffer = Buffer.from(matches[1], 'base64');
    const originalSize = imageBuffer.length;
    
    // Compress
    const compressed = await sharp(imageBuffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY, progressive: true })
      .toBuffer();
    
    const newSize = compressed.length;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    console.log(`    ${(originalSize/1024).toFixed(0)}KB -> ${(newSize/1024).toFixed(0)}KB (${savings}% saved)`);
    
    return `data:image/jpeg;base64,${compressed.toString('base64')}`;
  } catch (err) {
    console.log(`    Error: ${err.message}`);
    return base64Str;
  }
}

async function main() {
  console.log(`Loading ${DATA_FILE}...`);
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  
  const products = data.products || [];
  let modifiedCount = 0;
  
  for (const product of products) {
    if (TARGET_IDS.includes(product.id)) {
      console.log(`\nProcessing: ${product.id} - ${product.name}`);
      
      // Compress main image
      if (product.image) {
        console.log('  Main image:');
        product.image = await compressBase64Image(product.image);
      }
      
      // Compress images array
      if (product.images && product.images.length) {
        console.log(`  Images array (${product.images.length}):`);
        for (let i = 0; i < product.images.length; i++) {
          product.images[i] = await compressBase64Image(product.images[i]);
        }
      }
      
      modifiedCount++;
    }
  }
  
  console.log(`\n\nModified ${modifiedCount} products.`);
  
  // Backup
  const backupFile = DATA_FILE + '.backup';
  console.log(`Creating backup at ${backupFile}...`);
  fs.copyFileSync(DATA_FILE, backupFile);
  
  // Save
  console.log(`Saving compressed data...`);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  const origSize = fs.statSync(backupFile).size;
  const newSize = fs.statSync(DATA_FILE).size;
  console.log(`\nFile size: ${(origSize / (1024*1024)).toFixed(1)}MB -> ${(newSize / (1024*1024)).toFixed(1)}MB`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
