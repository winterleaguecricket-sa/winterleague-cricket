// Supporter apparel products for player registration forms
let supporterProducts = [
  {
    id: 'supporter-jersey',
    name: 'Supporter Jersey',
    description: 'Official team supporter jersey',
    price: 350.00,
    sizeOptions: ['Small', 'Medium', 'Large', 'X-Large', '2X-Large'],
    active: true,
    imageUrl: ''
  },
  {
    id: 'supporter-cap',
    name: 'Supporter Cap',
    description: 'Adjustable team cap with embroidered logo',
    price: 150.00,
    sizeOptions: ['One Size'],
    active: true,
    imageUrl: ''
  },
  {
    id: 'supporter-scarf',
    name: 'Team Scarf',
    description: 'Knitted team scarf in team colors',
    price: 200.00,
    sizeOptions: [],
    active: true,
    imageUrl: ''
  },
  {
    id: 'supporter-hoodie',
    name: 'Supporter Hoodie',
    description: 'Premium cotton blend hoodie with team branding',
    price: 500.00,
    sizeOptions: ['Small', 'Medium', 'Large', 'X-Large', '2X-Large'],
    active: true,
    imageUrl: ''
  }
];

// Get all supporter products
export function getSupporterProducts(activeOnly = false) {
  if (activeOnly) {
    return supporterProducts.filter(product => product.active);
  }
  return [...supporterProducts];
}

// Get product by ID
export function getSupporterProductById(id) {
  return supporterProducts.find(p => p.id === id);
}

// Add new product
export function addSupporterProduct(product) {
  const newProduct = {
    id: `supporter-${Date.now()}`,
    name: product.name,
    description: product.description,
    price: parseFloat(product.price),
    sizeOptions: product.sizeOptions || [],
    active: product.active !== false,
    imageUrl: product.imageUrl || ''
  };
  supporterProducts.push(newProduct);
  return newProduct;
}

// Update product
export function updateSupporterProduct(id, updates) {
  const index = supporterProducts.findIndex(p => p.id === id);
  if (index !== -1) {
    supporterProducts[index] = {
      ...supporterProducts[index],
      ...updates,
      price: parseFloat(updates.price)
    };
    return supporterProducts[index];
  }
  return null;
}

// Delete product
export function deleteSupporterProduct(id) {
  const index = supporterProducts.findIndex(p => p.id === id);
  if (index !== -1) {
    supporterProducts.splice(index, 1);
    return true;
  }
  return false;
}

// Toggle product active status
export function toggleSupporterProductStatus(id) {
  const product = supporterProducts.find(p => p.id === id);
  if (product) {
    product.active = !product.active;
    return product;
  }
  return null;
}
