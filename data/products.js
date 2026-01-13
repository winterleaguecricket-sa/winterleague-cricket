// Product data for Winter League Cricket
export const products = [
  // Premium Equipment
  {
    id: 1,
    name: "Elite Pro Cricket Bat",
    category: "premium",
    price: 299.99,
    description: "Professional grade English willow cricket bat",
    image: "/images/bat-pro.jpg",
    stock: 15,
    featured: true,
    sizes: ["Short Handle", "Long Handle", "Harrow", "Full Size"]
  },
  {
    id: 2,
    name: "Premium Leather Cricket Ball (Set of 6)",
    category: "premium",
    price: 89.99,
    description: "Tournament quality leather cricket balls",
    image: "/images/ball-premium.jpg",
    stock: 30,
    featured: false
  },
  {
    id: 3,
    name: "Professional Batting Gloves",
    category: "premium",
    price: 79.99,
    description: "High-quality leather gloves with superior protection",
    image: "/images/gloves-pro.jpg",
    stock: 25,
    featured: true,
    sizes: ["Youth", "Small", "Medium", "Large", "XL"]
  },
  {
    id: 4,
    name: "Elite Wicket Keeping Set",
    category: "premium",
    price: 249.99,
    description: "Complete wicket keeper gloves and leg guards",
    image: "/images/keeper-elite.jpg",
    stock: 10,
    featured: false,
    sizes: ["Youth", "Small", "Medium", "Large"]
  },
  
  // Training Gear
  {
    id: 5,
    name: "Training Cricket Bat - Kashmir Willow",
    category: "training",
    price: 79.99,
    description: "Durable bat perfect for practice sessions",
    image: "/images/bat-training.jpg",
    stock: 40,
    featured: true,
    sizes: ["Short Handle", "Long Handle", "Full Size"]
  },
  {
    id: 6,
    name: "Practice Tennis Balls (Set of 12)",
    category: "training",
    price: 24.99,
    description: "Soft tennis balls ideal for training",
    image: "/images/ball-training.jpg",
    stock: 100,
    featured: false
  },
  {
    id: 7,
    name: "Bowling Machine Portable",
    category: "training",
    price: 499.99,
    description: "Adjustable speed bowling machine for practice",
    image: "/images/bowling-machine.jpg",
    stock: 5,
    featured: true
  },
  {
    id: 8,
    name: "Training Stumps Set",
    category: "training",
    price: 49.99,
    description: "Lightweight portable stumps for training",
    image: "/images/stumps-training.jpg",
    stock: 35,
    featured: false
  },
  {
    id: 9,
    name: "Batting Practice Net",
    category: "training",
    price: 149.99,
    description: "Professional grade practice net system",
    image: "/images/practice-net.jpg",
    stock: 12,
    featured: false
  },
  {
    id: 10,
    name: "Coaching Kit Bundle",
    category: "training",
    price: 199.99,
    description: "Complete coaching essentials kit",
    image: "/images/coaching-kit.jpg",
    stock: 20,
    featured: true
  }
];

// Site configuration that can be customized via admin panel
export let siteConfig = {
  storeName: "Winter League Cricket",
  tagline: "Your Premier Cricket Equipment Store",
  bannerText: "Winter Season Sale - Up to 30% Off!",
  featuredCategory: "premium",
  showBanner: true,
  primaryColor: "#000000",
  secondaryColor: "#dc0000",
  accentColor: "#ff3333",
  logoUrl: "",
  fontFamily: "Inter",
  heroMediaType: "image", // 'image' or 'video'
  heroMediaUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1600&h=900&fit=crop", // Default hero image
  heroTitle: "Winter League Cricket",
  heroSubtitle: "Premium Equipment for Champions",
  // Button funnel configurations
  buttonFunnels: {
    heroPrimary: null, // Funnel ID for main hero CTA
    heroSecondary: null, // Funnel ID for secondary hero CTA
    premiumChannel: null, // Funnel ID for Premium channel button
    trainingChannel: null // Funnel ID for Training channel button
  },
  // Custom buttons configuration
  customButtons: [
    {
      id: 1,
      name: "Shop Premium",
      location: "hero-primary",
      href: "/premium",
      funnelId: null,
      visible: true,
      order: 1
    },
    {
      id: 2,
      name: "Training Gear",
      location: "hero-secondary",
      href: "/training",
      funnelId: null,
      visible: true,
      order: 2
    },
    {
      id: 3,
      name: "Premium Equipment",
      location: "channel-premium",
      href: "/premium",
      funnelId: null,
      visible: true,
      order: 1,
      icon: "⭐",
      description: "Professional grade gear for serious players"
    },
    {
      id: 4,
      name: "Training Gear",
      location: "channel-training",
      href: "/training",
      funnelId: null,
      visible: true,
      order: 2,
      icon: "🎯",
      description: "Essential equipment for practice and coaching"
    }
  ],
  // Navigation menu configuration
  menuItems: [
    {
      id: 1,
      label: "Home",
      href: "/",
      order: 1,
      visible: true,
      parentId: null
    },
    {
      id: 2,
      label: "Premium",
      href: "/premium",
      order: 2,
      visible: true,
      parentId: null
    },
    {
      id: 3,
      label: "Training",
      href: "/training",
      order: 3,
      visible: true,
      parentId: null
    },
    {
      id: 4,
      label: "Forms",
      href: "/forms",
      order: 4,
      visible: true,
      parentId: null
    },
    {
      id: 5,
      label: "Admin",
      href: "/admin",
      order: 5,
      visible: false,
      parentId: null
    }
  ],
  // Payment gateway configuration
  paymentConfig: {
    payfast: {
      merchantId: '',
      merchantKey: '',
      passphrase: '',
      testMode: true
    }
  }
};

// Helper function to manage custom buttons
export function getButtonsByLocation(location) {
  return siteConfig.customButtons
    .filter(btn => btn.location === location && btn.visible)
    .sort((a, b) => a.order - b.order);
}

export function getAllButtons() {
  return siteConfig.customButtons;
}

export function addCustomButton(button) {
  const newButton = {
    ...button,
    id: Math.max(...siteConfig.customButtons.map(b => b.id), 0) + 1,
    visible: true
  };
  siteConfig.customButtons.push(newButton);
  return newButton;
}

export function updateCustomButton(id, updates) {
  const index = siteConfig.customButtons.findIndex(b => b.id === id);
  if (index !== -1) {
    siteConfig.customButtons[index] = { ...siteConfig.customButtons[index], ...updates };
    return siteConfig.customButtons[index];
  }
  return null;
}

export function deleteCustomButton(id) {
  const index = siteConfig.customButtons.findIndex(b => b.id === id);
  if (index !== -1) {
    siteConfig.customButtons.splice(index, 1);
    return true;
  }
  return false;
}

// Helper functions for menu items
export function getMenuItems() {
  return siteConfig.menuItems
    .filter(item => item.visible && item.parentId === null)
    .sort((a, b) => a.order - b.order);
}

export function getSubMenuItems(parentId) {
  return siteConfig.menuItems
    .filter(item => item.visible && item.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

export function getAllMenuItems() {
  return siteConfig.menuItems;
}

export function addMenuItem(menuItem) {
  const newItem = {
    ...menuItem,
    id: Math.max(...siteConfig.menuItems.map(m => m.id), 0) + 1,
    visible: true
  };
  siteConfig.menuItems.push(newItem);
  return newItem;
}

export function updateMenuItem(id, updates) {
  const index = siteConfig.menuItems.findIndex(m => m.id === id);
  if (index !== -1) {
    siteConfig.menuItems[index] = { ...siteConfig.menuItems[index], ...updates };
    return siteConfig.menuItems[index];
  }
  return null;
}

export function deleteMenuItem(id) {
  // Delete the item and all its children
  const itemsToDelete = [id];
  const children = siteConfig.menuItems.filter(item => item.parentId === id);
  children.forEach(child => itemsToDelete.push(child.id));
  
  siteConfig.menuItems = siteConfig.menuItems.filter(item => !itemsToDelete.includes(item.id));
  return true;
}

// Helper functions
export function getProductById(id) {
  return products.find(product => product.id === parseInt(id));
}

export function getProductsByCategory(category) {
  return products.filter(product => product.category === category);
}

export function getFeaturedProducts() {
  return products.filter(product => product.featured);
}

export function updateSiteConfig(newConfig) {
  siteConfig = { ...siteConfig, ...newConfig };
}
