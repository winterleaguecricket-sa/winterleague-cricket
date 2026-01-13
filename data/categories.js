// Categories data
let categories = [
  {
    id: 1,
    name: 'Premium Equipment',
    slug: 'premium',
    description: 'Professional grade cricket equipment',
    icon: '⭐'
  },
  {
    id: 2,
    name: 'Training Gear',
    slug: 'training',
    description: 'Essential equipment for practice',
    icon: '🎯'
  },
  {
    id: 3,
    name: 'Supporter Merchandise',
    slug: 'supporter-merchandise',
    description: 'Official team apparel and accessories',
    icon: '👕'
  }
];

let categoryIdCounter = 4;

// Subcategories data
let subcategories = [
  {
    id: 1,
    categoryId: 1,
    name: 'Bats',
    slug: 'bats',
    description: 'Premium cricket bats',
    icon: '🏏'
  },
  {
    id: 2,
    categoryId: 1,
    name: 'Protective Gear',
    slug: 'protective-gear',
    description: 'Safety equipment and protection',
    icon: '🛡️'
  },
  {
    id: 3,
    categoryId: 2,
    name: 'Practice Balls',
    slug: 'practice-balls',
    description: 'Training and practice balls',
    icon: '⚾'
  }
];

let subcategoryIdCounter = 4;

// Custom pages data
export let customPages = [
  {
    id: 1,
    title: "About Us",
    slug: "about",
    content: "Welcome to Winter League Cricket. We are your premier destination for cricket equipment.",
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: "Contact",
    slug: "contact",
    content: "Get in touch with us at info@winterleaguecricket.com",
    active: true,
    createdAt: new Date().toISOString()
  }
];

// Category helper functions
export function getCategories() {
  return categories;
}

export function getCategoryBySlug(slug) {
  return categories.find(cat => cat.slug === slug);
}

export function addCategory(category) {
  const newCategory = {
    ...category,
    id: categoryIdCounter++
  };
  categories.push(newCategory);
  return newCategory;
}

export function updateCategory(id, updates) {
  const index = categories.findIndex(c => c.id === id);
  if (index !== -1) {
    categories[index] = { ...categories[index], ...updates };
    return categories[index];
  }
  return null;
}

export function deleteCategory(id) {
  const index = categories.findIndex(c => c.id === id);
  if (index !== -1) {
    categories.splice(index, 1);
    // Also delete all subcategories under this category
    subcategories = subcategories.filter(sub => sub.categoryId !== id);
    return true;
  }
  return false;
}

// Subcategory helper functions
export function getSubcategories() {
  return subcategories;
}

export function getSubcategoriesByCategory(categoryId) {
  return subcategories.filter(sub => sub.categoryId === categoryId);
}

export function getSubcategoryBySlug(slug) {
  return subcategories.find(sub => sub.slug === slug);
}

export function addSubcategory(subcategory) {
  const newSubcategory = {
    ...subcategory,
    categoryId: Number(subcategory.categoryId),
    id: subcategoryIdCounter++
  };
  subcategories.push(newSubcategory);
  return newSubcategory;
}

export function updateSubcategory(id, updates) {
  const index = subcategories.findIndex(sub => sub.id === id);
  if (index !== -1) {
    subcategories[index] = { ...subcategories[index], ...updates };
    return subcategories[index];
  }
  return null;
}

export function deleteSubcategory(id) {
  const index = subcategories.findIndex(sub => sub.id === id);
  if (index !== -1) {
    subcategories.splice(index, 1);
    return true;
  }
  return false;
}

// Page helper functions
export function getPages() {
  return customPages;
}

export function getPageBySlug(slug) {
  return customPages.find(page => page.slug === slug && page.active);
}

export function getActivePages() {
  return customPages.filter(page => page.active);
}

export function addPage(page) {
  const newPage = {
    id: Math.max(...customPages.map(p => p.id), 0) + 1,
    ...page,
    active: true,
    createdAt: new Date().toISOString()
  };
  customPages.push(newPage);
  return newPage;
}

export function updatePage(id, updates) {
  const index = customPages.findIndex(p => p.id === id);
  if (index !== -1) {
    customPages[index] = { ...customPages[index], ...updates };
    return customPages[index];
  }
  return null;
}

export function deletePage(id) {
  const index = customPages.findIndex(p => p.id === id);
  if (index !== -1) {
    customPages.splice(index, 1);
    return true;
  }
  return false;
}
