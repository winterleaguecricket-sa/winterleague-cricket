/**
 * Add sizes to Short Sleeve Shirt Kits products and fix any data issues
 */
const fs = require('fs');

const DATA_FILE = '/home/vmycnmyo/winterleague-cricket/data/products.json';
const TARGET_IDS = Array.from({length: 20}, (_, i) => i + 67); // IDs 67-86
const DEFAULT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

function main() {
  console.log(`Loading ${DATA_FILE}...`);
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  
  const products = data.products || [];
  let modifiedCount = 0;
  
  for (const product of products) {
    if (TARGET_IDS.includes(product.id)) {
      console.log(`Updating sizes for: ${product.id} - ${product.name}`);
      product.sizes = DEFAULT_SIZES;
      modifiedCount++;
    }
  }
  
  console.log(`\nModified ${modifiedCount} products with sizes: ${DEFAULT_SIZES.join(', ')}`);
  
  // Save
  console.log(`Saving updated data...`);
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('Done!');
}

main();
