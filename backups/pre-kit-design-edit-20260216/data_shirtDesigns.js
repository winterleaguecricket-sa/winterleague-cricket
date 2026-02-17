// Shirt designs library - Server-side only data storage
// In production, this should use a database

// Check if we're on the server side
const isServer = typeof window === 'undefined';

let fs, path, DATA_FILE;

if (isServer) {
  fs = require('fs');
  path = require('path');
  DATA_FILE = path.join(process.cwd(), 'data', 'shirtDesigns.json');
}

// Default shirt designs
const defaultShirtDesigns = [
  {
    id: 1,
    name: 'Classic Red Stripe',
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop'],
    active: true,
    createdAt: new Date('2025-11-01T10:00:00').toISOString()
  },
  {
    id: 2,
    name: 'Blue Lightning',
    images: ['https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=300&h=300&fit=crop'],
    active: true,
    createdAt: new Date('2025-11-01T10:05:00').toISOString()
  },
  {
    id: 3,
    name: 'Green Thunder',
    images: ['https://images.unsplash.com/photo-1598032895397-d4e733ad8b33?w=300&h=300&fit=crop'],
    active: true,
    createdAt: new Date('2025-11-01T10:10:00').toISOString()
  },
  {
    id: 4,
    name: 'Yellow Storm',
    images: ['https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&h=300&fit=crop'],
    active: true,
    createdAt: new Date('2025-11-01T10:15:00').toISOString()
  }
];

// Initialize data variables
let shirtDesigns = [];
let shirtDesignIdCounter = 5;

// Load data from file or use defaults
function loadData() {
  if (!isServer) {
    shirtDesigns = defaultShirtDesigns;
    shirtDesignIdCounter = 5;
    return { designs: defaultShirtDesigns, idCounter: 5 };
  }
  
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(fileData);
      // Update in-memory variables
      shirtDesigns = data.designs;
      shirtDesignIdCounter = data.idCounter;
      return data;
    }
  } catch (error) {
    console.error('Error loading shirt designs data:', error);
  }
  // If file doesn't exist or error, initialize with defaults
  shirtDesigns = defaultShirtDesigns;
  shirtDesignIdCounter = 5;
  return { designs: defaultShirtDesigns, idCounter: 5 };
}

// Save data to file
function saveData() {
  if (!isServer) return;
  
  try {
    const data = {
      designs: shirtDesigns,
      idCounter: shirtDesignIdCounter
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved shirt designs:', shirtDesigns.length, 'designs');
  } catch (error) {
    console.error('Error saving shirt designs data:', error);
  }
}

// Initialize data on first load
loadData();

// Available colors for team selection (Primary colors only)
export const availableColors = [
  { name: 'Red', hex: '#DC2626' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Yellow', hex: '#EAB308' },
  { name: 'Orange', hex: '#EA580C' },
  { name: 'Purple', hex: '#9333EA' },
  { name: 'Black', hex: '#000000' }
];

// Get main image from design (first image or fallback to imageUrl for backwards compatibility)
export function getMainImage(design) {
  if (design.images && design.images.length > 0) {
    return design.images[0];
  }
  return design.imageUrl || '';
}

// Get all shirt designs
export function getShirtDesigns(activeOnly = false) {
  // Reload from disk to ensure we have latest data
  loadData();
  
  if (activeOnly) {
    return shirtDesigns.filter(design => design.active);
  }
  return [...shirtDesigns];
}

// Get single shirt design by ID
export function getShirtDesignById(id) {
  // Reload from disk to ensure we have latest data
  loadData();
  return shirtDesigns.find(design => design.id === id);
}

// Add new shirt design
export function addShirtDesign(design) {
  // Reload from disk to ensure we have latest data
  loadData();
  
  const newDesign = {
    ...design,
    id: shirtDesignIdCounter++,
    active: design.active !== undefined ? design.active : true,
    createdAt: new Date().toISOString()
  };
  shirtDesigns.push(newDesign);
  saveData();
  return newDesign;
}

// Update shirt design
export function updateShirtDesign(id, updates) {
  // Reload from disk to ensure we have latest data
  loadData();
  
  const index = shirtDesigns.findIndex(design => design.id === id);
  if (index !== -1) {
    shirtDesigns[index] = { ...shirtDesigns[index], ...updates };
    saveData();
    return shirtDesigns[index];
  }
  return null;
}

// Delete shirt design
export function deleteShirtDesign(id) {
  // Reload from disk to ensure we have latest data
  loadData();
  
  const index = shirtDesigns.findIndex(design => design.id === id);
  if (index !== -1) {
    shirtDesigns.splice(index, 1);
    saveData();
    return true;
  }
  return false;
}

// Toggle active status
export function toggleShirtDesignStatus(id) {
  // Reload from disk to ensure we have latest data
  loadData();
  
  const design = shirtDesigns.find(d => d.id === id);
  if (design) {
    design.active = !design.active;
    saveData();
    return design;
  }
  return null;
}
