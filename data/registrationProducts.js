// Registration products for player registration forms
let registrationProducts = [
  {
    id: 'basic-kit',
    name: 'Basic Kit',
    description: 'Includes: Playing Top, Pants, and Cap',
    price: 150.00,
    sizeOptions: ['Small', 'Medium', 'Large', 'X-Large', '2X-Large'],
    required: true,
    active: true,
    colorInheritFromTeam: true,
    imageUrl: ''
  }
];

// Get all registration products
export function getRegistrationProducts(activeOnly = false) {
  if (activeOnly) {
    return registrationProducts.filter(product => product.active);
  }
  return [...registrationProducts];
}

// Get required kit product
export function getBasicKit() {
  return registrationProducts.find(p => p.id === 'basic-kit');
}

// Get optional upsell products
export function getUpsellProducts() {
  return registrationProducts.filter(p => !p.required && p.active);
}

// Get product by ID
export function getRegistrationProductById(id) {
  return registrationProducts.find(p => p.id === id);
}

// Add new product
export function addRegistrationProduct(product) {
  const newProduct = {
    id: `product-${Date.now()}`,
    name: product.name,
    description: product.description,
    price: parseFloat(product.price),
    sizeOptions: product.sizeOptions || [],
    required: product.required || false,
    active: product.active !== false,
    colorInheritFromTeam: product.colorInheritFromTeam || false,
    imageUrl: product.imageUrl || ''
  };
  registrationProducts.push(newProduct);
  return newProduct;
}

// Update product
export function updateRegistrationProduct(id, updates) {
  const index = registrationProducts.findIndex(p => p.id === id);
  if (index !== -1) {
    registrationProducts[index] = {
      ...registrationProducts[index],
      ...updates,
      price: parseFloat(updates.price)
    };
    return registrationProducts[index];
  }
  return null;
}

// Delete product
export function deleteRegistrationProduct(id) {
  const index = registrationProducts.findIndex(p => p.id === id);
  if (index !== -1) {
    registrationProducts.splice(index, 1);
    return true;
  }
  return false;
}

// Toggle product active status
export function toggleRegistrationProductStatus(id) {
  const product = registrationProducts.find(p => p.id === id);
  if (product) {
    product.active = !product.active;
    return product;
  }
  return null;
}
