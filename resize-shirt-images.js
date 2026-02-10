const fs = require('fs');
const sharp = require('sharp');

const PRODUCTS_FILE = 'data/products.json';
const TARGET_WIDTH = 400;  // Resize to max 400px wide
const TARGET_HEIGHT = 500; // Resize to max 500px tall

async function resizeBase64Image(base64String) {
  if (!base64String || !base64String.startsWith('data:image')) {
    return base64String;
  }

  try {
    // Extract the base64 data
    const matches = base64String.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return base64String;
    }

    const imageType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Get current dimensions
    const metadata = await sharp(buffer).metadata();
    console.log(`  Current: ${metadata.width}x${metadata.height}`);

    // Check if resize is needed
    if (metadata.width <= TARGET_WIDTH && metadata.height <= TARGET_HEIGHT) {
      console.log('  Already small enough, skipping');
      return base64String;
    }

    // Resize the image (fit within bounds, maintaining aspect ratio)
    const resizedBuffer = await sharp(buffer)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Get new dimensions
    const newMetadata = await sharp(resizedBuffer).metadata();
    console.log(`  Resized to: ${newMetadata.width}x${newMetadata.height}`);
    console.log(`  Size: ${(buffer.length / 1024).toFixed(1)}KB -> ${(resizedBuffer.length / 1024).toFixed(1)}KB`);

    return `data:image/jpeg;base64,${resizedBuffer.toString('base64')}`;
  } catch (error) {
    console.error('  Error resizing:', error.message);
    return base64String;
  }
}

async function main() {
  console.log('Reading products.json...');
  const data = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  const products = Array.isArray(data) ? data : data.products || [];
  
  let modified = 0;

  for (const product of products) {
    // Only process Short Sleeve Shirt Kits (IDs 67-86)
    if (product.id >= 67 && product.id <= 86) {
      console.log(`\nProcessing: ${product.name} (ID: ${product.id})`);
      
      // Resize main image
      if (product.image) {
        console.log('  Main image:');
        product.image = await resizeBase64Image(product.image);
      }

      // Resize images array
      if (product.images && Array.isArray(product.images)) {
        for (let i = 0; i < product.images.length; i++) {
          console.log(`  Image ${i + 1}:`);
          product.images[i] = await resizeBase64Image(product.images[i]);
        }
      }

      modified++;
    }
  }

  // Save back
  console.log(`\nSaving ${modified} modified products...`);
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(Array.isArray(data) ? products : { ...data, products }, null, 2));
  console.log('Done!');
}

main().catch(console.error);
